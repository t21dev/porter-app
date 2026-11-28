//! The live view: every port in a table that refreshes itself, with the
//! selected port explained underneath.
//!
//! Colour follows DESIGN.md: surfaces and text use the terminal's own
//! foreground and greys, and the only hues are the risk signals, always next
//! to a text label. The terminal's palette decides the exact shades, so it
//! reads in light and dark terminals alike.

use crate::scan::{count, scan, sort, Options, Row, SortBy};
use anyhow::Result;
use porter_core::advisor::Risk;
use ratatui::crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use ratatui::layout::{Constraint, Flex, Layout, Rect};
use ratatui::style::{Color, Modifier, Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Cell, Clear, Paragraph, Row as TRow, Table, TableState, Wrap};
use ratatui::{DefaultTerminal, Frame};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::time::{Duration, Instant};

const REFRESH: Duration = Duration::from_secs(2);

fn risk_style(risk: Risk) -> Style {
    match risk {
        Risk::High => Style::new().fg(Color::Red).add_modifier(Modifier::BOLD),
        Risk::Medium => Style::new().fg(Color::Yellow),
        Risk::Low => Style::new(),
        Risk::Ok => Style::new().fg(Color::Green),
    }
}

fn dim() -> Style {
    Style::new().fg(Color::DarkGray)
}

struct App {
    rows: Vec<Row>,
    /// Indices into `rows` that pass the filters, in display order.
    visible: Vec<usize>,
    state: TableState,
    /// Port number and protocol: TCP and UDP can share a number.
    selected_port: Option<(u16, &'static str)>,
    filter: String,
    typing: bool,
    exposed_only: bool,
    sort_by: SortBy,
    paused: bool,
    updated: Option<Instant>,
    error: Option<String>,
    /// Port, pid and owner waiting for a yes before being stopped.
    confirm: Option<(u16, u32, String)>,
    message: Option<(String, Instant)>,
    host: String,
}

impl App {
    fn new(host: String) -> Self {
        App {
            rows: Vec::new(),
            visible: Vec::new(),
            state: TableState::default(),
            selected_port: None,
            filter: String::new(),
            typing: false,
            exposed_only: false,
            sort_by: SortBy::Risk,
            paused: false,
            updated: None,
            error: None,
            confirm: None,
            message: None,
            host,
        }
    }

    fn refilter(&mut self) {
        self.visible = (0..self.rows.len())
            .filter(|&i| {
                let r = &self.rows[i];
                (!self.exposed_only || r.exposed()) && r.matches(&self.filter)
            })
            .collect();
        // Keep the same port selected as rows come and go.
        let idx = self
            .selected_port
            .and_then(|key| self.visible.iter().position(|&i| self.rows[i].key() == key))
            .or((!self.visible.is_empty()).then_some(0));
        self.state.select(idx);
        self.selected_port = idx.map(|i| self.rows[self.visible[i]].key());
    }

    fn selected(&self) -> Option<&Row> {
        self.state
            .selected()
            .and_then(|i| self.visible.get(i))
            .map(|&i| &self.rows[i])
    }

    fn step(&mut self, by: isize) {
        if self.visible.is_empty() {
            return;
        }
        let last = self.visible.len() as isize - 1;
        let i = (self.state.selected().unwrap_or(0) as isize + by).clamp(0, last) as usize;
        self.state.select(Some(i));
        self.selected_port = Some(self.rows[self.visible[i]].key());
    }

    fn say(&mut self, msg: impl Into<String>) {
        self.message = Some((msg.into(), Instant::now()));
    }
}

/// Scans on a worker thread so a slow `docker ps` never stalls the keyboard.
/// A message on the returned sender asks for a scan right away.
fn spawn_scanner(opts: Options) -> (Receiver<Result<Vec<Row>, String>>, Sender<()>) {
    let (tx, rx) = mpsc::channel();
    let (req_tx, req_rx) = mpsc::channel::<()>();
    std::thread::spawn(move || loop {
        if tx.send(scan(opts).map_err(|e| format!("{e:#}"))).is_err() {
            return;
        }
        if let Err(RecvTimeoutError::Disconnected) = req_rx.recv_timeout(REFRESH) {
            return;
        }
    });
    (rx, req_tx)
}

pub fn run(opts: Options) -> Result<()> {
    let mut terminal = ratatui::init();
    let result = event_loop(&mut terminal, opts);
    ratatui::restore();
    result
}

fn event_loop(terminal: &mut DefaultTerminal, opts: Options) -> Result<()> {
    let (results, refresh) = spawn_scanner(opts);
    let mut app = App::new(sysinfo::System::host_name().unwrap_or_else(|_| "this machine".into()));

    loop {
        while let Ok(res) = results.try_recv() {
            match res {
                Ok(mut rows) if !app.paused => {
                    sort(&mut rows, app.sort_by);
                    app.rows = rows;
                    app.updated = Some(Instant::now());
                    app.error = None;
                    app.refilter();
                }
                Ok(_) => {}
                Err(e) => app.error = Some(e),
            }
        }
        if app
            .message
            .as_ref()
            .is_some_and(|(_, t)| t.elapsed() > Duration::from_secs(4))
        {
            app.message = None;
        }

        terminal.draw(|f| draw(f, &mut app))?;

        if !event::poll(Duration::from_millis(150))? {
            continue;
        }
        let Event::Key(key) = event::read()? else {
            continue;
        };
        // Windows reports releases too.
        if key.kind != KeyEventKind::Press {
            continue;
        }
        if key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL) {
            return Ok(());
        }

        if let Some((port, pid, owner)) = app.confirm.clone() {
            app.confirm = None;
            if matches!(key.code, KeyCode::Char('y') | KeyCode::Char('Y')) {
                // Leave the screen while stopping it: the fallback may ask for
                // a password (pkexec) in this terminal.
                ratatui::restore();
                println!("Stopping {owner} (pid {pid}) on port {port}...");
                let outcome = crate::stop(pid);
                *terminal = ratatui::init();
                terminal.clear()?;
                match outcome {
                    Ok(()) => app.say(format!("Stopped {owner}. Port {port} is free.")),
                    Err(e) => app.say(format!("Couldn't stop {owner}: {e:#}")),
                }
                let _ = refresh.send(());
            }
            continue;
        }

        if app.typing {
            match key.code {
                KeyCode::Enter => app.typing = false,
                KeyCode::Esc => {
                    app.typing = false;
                    app.filter.clear();
                }
                KeyCode::Backspace => {
                    app.filter.pop();
                }
                KeyCode::Char(c) => app.filter.push(c),
                _ => {}
            }
            app.refilter();
            continue;
        }

        match key.code {
            KeyCode::Char('q') => return Ok(()),
            KeyCode::Esc if !app.filter.is_empty() => {
                app.filter.clear();
                app.refilter();
            }
            KeyCode::Esc => return Ok(()),
            KeyCode::Down | KeyCode::Char('j') => app.step(1),
            KeyCode::Up | KeyCode::Char('k') => app.step(-1),
            KeyCode::PageDown => app.step(10),
            KeyCode::PageUp => app.step(-10),
            KeyCode::Home | KeyCode::Char('g') => app.step(-100_000),
            KeyCode::End | KeyCode::Char('G') => app.step(100_000),
            KeyCode::Char('/') => app.typing = true,
            KeyCode::Char('e') => {
                app.exposed_only = !app.exposed_only;
                app.refilter();
            }
            KeyCode::Char('s') => {
                app.sort_by = if app.sort_by == SortBy::Risk {
                    SortBy::Port
                } else {
                    SortBy::Risk
                };
                sort(&mut app.rows, app.sort_by);
                app.refilter();
            }
            KeyCode::Char('p') | KeyCode::Char(' ') => app.paused = !app.paused,
            KeyCode::Char('r') => {
                app.paused = false;
                let _ = refresh.send(());
            }
            KeyCode::Char('K') | KeyCode::Delete => {
                if let Some(r) = app.selected() {
                    match (r.pid(), &r.port.container) {
                        (_, Some(c)) => {
                            let msg = format!(
                                "Port {} belongs to container {}. Stop it with `{} stop {}`.",
                                r.port.port, c.name, c.runtime, c.name
                            );
                            app.say(msg);
                        }
                        (Some(pid), None) => app.confirm = Some((r.port.port, pid, r.owner())),
                        (None, None) => {
                            app.say("Porter can't see who owns this port. Run it with sudo.")
                        }
                    }
                }
            }
            _ => {}
        }
    }
}

fn draw(f: &mut Frame, app: &mut App) {
    let [head, body, detail, foot] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Min(5),
        Constraint::Length(9),
        Constraint::Length(1),
    ])
    .areas(f.area());

    // Header: host, counts, freshness.
    let mut spans = vec![
        Span::styled("porter", Style::new().bold()),
        Span::styled(
            format!("  {}  ·  {} ports  ·  ", app.host, app.rows.len()),
            dim(),
        ),
        Span::styled(
            format!("{} high", count(&app.rows, Risk::High)),
            risk_style(Risk::High),
        ),
        Span::styled("  ·  ", dim()),
        Span::styled(
            format!("{} medium", count(&app.rows, Risk::Medium)),
            risk_style(Risk::Medium),
        ),
    ];
    let status = match (&app.error, app.paused, app.updated) {
        (Some(e), _, _) => format!("  ·  scan failed: {e}"),
        (None, true, _) => "  ·  paused".to_string(),
        (None, false, Some(t)) => format!("  ·  updated {}s ago", t.elapsed().as_secs()),
        (None, false, None) => "  ·  scanning…".to_string(),
    };
    spans.push(Span::styled(status, dim()));
    if app.exposed_only {
        spans.push(Span::raw("  ·  reachable only"));
    }
    f.render_widget(Line::from(spans), head);

    // Table.
    let header = TRow::new([
        "RISK", "PORT", "PROTO", "ADDRESS", "REACH", "OWNER", "SERVICE",
    ])
    .style(dim());
    let rows: Vec<TRow> = app
        .visible
        .iter()
        .map(|&i| {
            let r = &app.rows[i];
            TRow::new(vec![
                Cell::from(r.advice.risk.label()).style(risk_style(r.advice.risk)),
                Cell::from(format!("{:>5}", r.port.port)),
                Cell::from(r.proto()),
                Cell::from(r.port.ip_address.clone()),
                Cell::from(r.advice.exposure.label()),
                Cell::from(r.owner()),
                Cell::from(r.service().to_string()),
            ])
        })
        .collect();
    let empty = rows.is_empty();
    let table = Table::new(
        rows,
        [
            Constraint::Length(6),
            Constraint::Length(5),
            Constraint::Length(5),
            Constraint::Length(16),
            Constraint::Length(17),
            Constraint::Fill(1),
            Constraint::Fill(1),
        ],
    )
    .header(header)
    .row_highlight_style(Style::new().add_modifier(Modifier::REVERSED))
    .block(Block::bordered().border_style(dim()));
    f.render_stateful_widget(table, body, &mut app.state);
    if empty && app.updated.is_some() {
        let msg = if app.filter.is_empty() && !app.exposed_only {
            "No ports in use."
        } else {
            "No ports match. Esc clears the filter, e shows every port."
        };
        let inner = Rect {
            y: body.y + 2,
            height: 1,
            ..body.inner(ratatui::layout::Margin::new(2, 0))
        };
        f.render_widget(Paragraph::new(msg).style(dim()), inner);
    }

    // Detail of the selected port.
    let block = Block::bordered().border_style(dim());
    match app.selected() {
        Some(r) => {
            let a = &r.advice;
            let label = |s: &'static str| Span::styled(format!("{s:<10}"), dim());
            let mut owner = match &r.port.process {
                Some(p) => format!("{} (pid {})", p.name, p.pid),
                None => "unknown".to_string(),
            };
            if let Some(c) = &r.port.container {
                owner = format!(
                    "{owner} · container {} ({}), port {} inside",
                    c.name, c.image, c.container_port
                );
            }
            let mut lines = vec![
                Line::from(vec![label("Why open"), Span::raw(a.purpose.clone())]),
                Line::from(vec![
                    label("Reach"),
                    Span::raw(format!("{} ({})", a.exposure.label(), r.port.ip_address)),
                ]),
                Line::from(vec![label("Owner"), Span::raw(owner)]),
                Line::from(vec![label("Do"), Span::raw(a.recommendation.clone())]),
            ];
            for n in &a.notes {
                lines.push(Line::from(vec![
                    label("Note"),
                    Span::styled(n.clone(), dim()),
                ]));
            }
            let title = Line::from(vec![
                Span::raw(format!(" {}/{} · {} ", r.port.port, r.proto(), r.service())),
                Span::styled(format!("[{}] ", a.risk.label()), risk_style(a.risk)),
            ]);
            f.render_widget(
                Paragraph::new(lines)
                    .wrap(Wrap { trim: true })
                    .block(block.title(title)),
                detail,
            );
        }
        None => f.render_widget(Paragraph::new("").block(block), detail),
    }

    // Footer: typing the filter, a message, or the keys.
    let footer = if app.typing {
        Line::from(vec![
            Span::raw("/"),
            Span::raw(app.filter.clone()),
            Span::raw("▏"),
            Span::styled("   Enter keeps it · Esc clears", dim()),
        ])
    } else if let Some((m, _)) = &app.message {
        Line::from(m.clone())
    } else {
        let filter = if app.filter.is_empty() {
            String::new()
        } else {
            format!("filter \"{}\" · ", app.filter)
        };
        Line::from(Span::styled(
            format!("{filter}↑↓ move · / filter · e reachable only · s sort · p pause · r refresh · K stop · q quit"),
            dim(),
        ))
    };
    f.render_widget(footer, foot);

    // Confirm before stopping a process.
    if let Some((port, pid, owner)) = &app.confirm {
        let [area] = Layout::horizontal([Constraint::Length(52)])
            .flex(Flex::Center)
            .areas(f.area());
        let [area] = Layout::vertical([Constraint::Length(5)])
            .flex(Flex::Center)
            .areas(area);
        f.render_widget(Clear, area);
        let text = vec![
            Line::from(format!("Stop {owner} (pid {pid}) on port {port}?")),
            Line::from(""),
            Line::from(vec![
                Span::styled("y", Style::new().fg(Color::Red).bold()),
                Span::raw(" stop   "),
                Span::styled("any other key", dim()),
                Span::raw(" cancel"),
            ]),
        ];
        f.render_widget(
            Paragraph::new(text).block(
                Block::bordered()
                    .title(" Stop process ")
                    .border_style(Style::new().fg(Color::Red)),
            ),
            area,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use porter_core::advisor::advise;
    use porter_core::models::{Port, PortStatus, Process, Protocol};
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    fn row(port: u16, addr: &str, process: &str) -> Row {
        let port = Port {
            port,
            status: PortStatus::Occupied,
            protocol: Protocol::TCP,
            process: Some(Process::named(42, process.to_string())),
            ip_address: addr.to_string(),
            container: None,
        };
        Row {
            advice: advise(&port),
            port,
        }
    }

    fn screen(app: &mut App) -> String {
        let mut term = Terminal::new(TestBackend::new(120, 30)).unwrap();
        term.draw(|f| draw(f, app)).unwrap();
        let buf = term.backend().buffer();
        (0..buf.area.height)
            .map(|y| {
                (0..buf.area.width)
                    .map(|x| buf[(x, y)].symbol())
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join(
                "
",
            )
    }

    fn app() -> App {
        let mut app = App::new("vps-1".into());
        let mut rows = vec![
            row(5173, "127.0.0.1", "node"),
            row(6379, "0.0.0.0", "redis-server"),
            row(22, "0.0.0.0", "sshd"),
        ];
        sort(&mut rows, SortBy::Risk);
        app.rows = rows;
        app.updated = Some(Instant::now());
        app.refilter();
        app
    }

    #[test]
    fn draws_the_table_and_explains_the_riskiest_port() {
        let mut app = app();
        let s = screen(&mut app);
        assert!(s.contains("vps-1"), "{s}");
        assert!(s.contains("1 high"), "{s}");
        // Riskiest first, and selected: its advice fills the detail pane.
        assert_eq!(app.selected().unwrap().port.port, 6379);
        assert!(s.contains("6379/tcp · Redis"), "{s}");
        assert!(s.contains("requirepass"), "{s}");
        assert!(s.contains("q quit"), "{s}");
    }

    #[test]
    fn selection_follows_the_port_across_refreshes() {
        let mut app = app();
        app.step(1);
        let picked = app.selected().unwrap().port.port;
        // A new scan with an extra port that sorts first.
        let mut rows = vec![
            row(2375, "0.0.0.0", "dockerd"),
            row(5173, "127.0.0.1", "node"),
            row(6379, "0.0.0.0", "redis-server"),
            row(22, "0.0.0.0", "sshd"),
        ];
        sort(&mut rows, SortBy::Risk);
        app.rows = rows;
        app.refilter();
        assert_eq!(app.selected().unwrap().port.port, picked);
    }

    #[test]
    fn filters_and_reachable_only_narrow_the_list() {
        let mut app = app();
        app.exposed_only = true;
        app.refilter();
        assert_eq!(app.visible.len(), 2);
        app.filter = "ssh".into();
        app.refilter();
        assert_eq!(app.selected().unwrap().port.port, 22);
        app.filter = "nothing-matches".into();
        app.refilter();
        assert!(screen(&mut app).contains("No ports match"));
    }

    #[test]
    fn asks_before_stopping_a_process() {
        let mut app = app();
        app.confirm = Some((5173, 42, "node".into()));
        let s = screen(&mut app);
        assert!(s.contains("Stop node (pid 42) on port 5173?"), "{s}");
    }

    #[test]
    fn a_narrow_terminal_doesnt_panic() {
        let mut app = app();
        let mut term = Terminal::new(TestBackend::new(40, 12)).unwrap();
        term.draw(|f| draw(f, &mut app)).unwrap();
    }
}
