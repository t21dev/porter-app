//! The non-interactive commands: `list`, `audit` and `explain`, as text or JSON.

use crate::scan::{count, elevated, Row};
use porter_core::advisor::Risk;
use porter_core::models::Port;
use serde::Serialize;
use std::io::IsTerminal;

/// ANSI colour, only on a terminal and only without NO_COLOR. Uses the
/// terminal's own palette, so it follows the user's light or dark theme.
pub struct Paint(bool);

impl Paint {
    pub fn detect() -> Self {
        Paint(std::io::stdout().is_terminal() && std::env::var_os("NO_COLOR").is_none())
    }
    fn wrap(&self, code: &str, s: &str) -> String {
        if self.0 {
            format!("\x1b[{code}m{s}\x1b[0m")
        } else {
            s.to_string()
        }
    }
    pub fn dim(&self, s: &str) -> String {
        self.wrap("2", s)
    }
    pub fn bold(&self, s: &str) -> String {
        self.wrap("1", s)
    }
    /// Risk colours as DESIGN.md maps them: high is the destructive red,
    /// medium the warning amber, ok the positive green, low stays neutral.
    pub fn risk(&self, risk: Risk, s: &str) -> String {
        match risk {
            Risk::High => self.wrap("1;31", s),
            Risk::Medium => self.wrap("33", s),
            Risk::Low => s.to_string(),
            Risk::Ok => self.wrap("32", s),
        }
    }
}

/// Fit `s` in `w` columns, cutting it with an ellipsis if longer.
pub fn fit(s: &str, w: usize) -> String {
    let n = s.chars().count();
    if n <= w {
        format!("{s:<w$}")
    } else {
        let cut: String = s.chars().take(w.saturating_sub(1)).collect();
        format!("{cut}…")
    }
}

#[derive(Serialize)]
struct JsonRow<'a> {
    #[serde(flatten)]
    port: &'a Port,
    advice: &'a porter_core::advisor::Advice,
}

pub fn json(rows: &[Row]) -> anyhow::Result<()> {
    let out: Vec<JsonRow> = rows
        .iter()
        .map(|r| JsonRow {
            port: &r.port,
            advice: &r.advice,
        })
        .collect();
    println!("{}", serde_json::to_string_pretty(&out)?);
    Ok(())
}

pub fn list(rows: &[Row]) {
    let p = Paint::detect();
    let ow = rows
        .iter()
        .map(|r| r.owner().chars().count())
        .max()
        .unwrap_or(5)
        .clamp(5, 28);
    let aw = rows
        .iter()
        .map(|r| r.port.ip_address.len())
        .max()
        .unwrap_or(7)
        .clamp(7, 39);
    println!(
        "{}",
        p.dim(&format!(
            "{:<6}  {:>5}  {:<5}  {:<aw$}  {:<17}  {:<ow$}  {}",
            "RISK", "PORT", "PROTO", "ADDRESS", "REACH", "OWNER", "SERVICE"
        ))
    );
    for r in rows {
        println!(
            "{}  {:>5}  {:<5}  {}  {:<17}  {}  {}",
            p.risk(r.advice.risk, &fit(r.advice.risk.label(), 6)),
            r.port.port,
            r.proto(),
            fit(&r.port.ip_address, aw),
            r.advice.exposure.label(),
            fit(&r.owner(), ow),
            r.service(),
        );
    }
    footer(rows, &p);
}

/// Exposed ports only, riskiest first, each with why it's open and what to do.
/// Returns the highest risk found.
pub fn audit(rows: &[Row], detail_all: bool) -> Option<Risk> {
    let p = Paint::detect();
    let exposed: Vec<&Row> = rows.iter().filter(|r| r.exposed()).collect();
    let local: Vec<&Row> = rows.iter().filter(|r| !r.exposed()).collect();
    println!(
        "{} {}",
        p.bold("Porter audit"),
        p.dim(&format!(
            "· {} ports in use, {} reachable from the network · {} high, {} medium",
            rows.len(),
            exposed.len(),
            count(rows, Risk::High),
            count(rows, Risk::Medium)
        ))
    );
    println!();
    // Medium and high get the full explanation; the rest one line each,
    // unless --all asks for everything.
    let (detailed, brief): (Vec<&Row>, Vec<&Row>) =
        exposed.iter().partition(|r| detail_all || r.advice.risk >= Risk::Medium);
    for r in &detailed {
        let label = format!("{:<6}", r.advice.risk.label().to_uppercase());
        println!(
            "{}  {}  {}  {}",
            p.risk(r.advice.risk, &label),
            p.bold(&format!("{}/{}", r.port.port, r.proto())),
            p.bold(r.service()),
            p.dim(&format!(
                "{} on {} · {}",
                r.advice.exposure.label(),
                r.port.ip_address,
                owner_long(r)
            ))
        );
        println!("        {}", r.advice.purpose);
        println!("        → {}", r.advice.recommendation);
        for n in &r.advice.notes {
            println!("        {}", p.dim(&format!("· {n}")));
        }
        println!();
    }
    if !brief.is_empty() {
        println!("{}", p.dim(&format!("Reachable, but expected or low risk ({}). `porter audit --all` explains each:", brief.len())));
        for r in &brief {
            println!(
                "  {}  {:>5}/{}  {}  {}",
                p.risk(r.advice.risk, &format!("{:<4}", r.advice.risk.label())),
                r.port.port,
                r.proto(),
                fit(r.service(), 26),
                p.dim(&format!("{} · {}", r.owner(), r.advice.exposure.label()))
            );
        }
        println!();
    }
    if exposed.is_empty() {
        println!("{}", p.risk(Risk::Ok, "Nothing is reachable from the network. Every port in use is bound to this machine only."));
        println!();
    }
    if !local.is_empty() {
        let names: Vec<String> = local
            .iter()
            .map(|r| format!("{} {}", r.port.port, r.owner()))
            .collect();
        println!(
            "{} {}",
            p.dim(&format!("This machine only ({}):", local.len())),
            p.dim(&names.join(", "))
        );
    }
    footer(rows, &p);
    exposed.iter().map(|r| r.advice.risk).max()
}

pub fn explain(row: &Row, details: Option<&Port>) {
    let p = Paint::detect();
    let r = row;
    println!(
        "{}  {}  {}",
        p.bold(&format!("{}/{}", r.port.port, r.proto())),
        p.bold(r.service()),
        p.risk(r.advice.risk, &format!("[{}]", r.advice.risk.label()))
    );
    println!();
    println!("{} {}", p.dim("Why it's open "), r.advice.purpose);
    println!(
        "{} {} ({})",
        p.dim("Reach         "),
        r.advice.exposure.label(),
        r.port.ip_address
    );
    println!("{} {}", p.dim("Owner         "), owner_long(r));
    if let Some(proc_) = details.and_then(|d| d.process.as_ref()) {
        if let Some(path) = &proc_.path {
            println!("{} {}", p.dim("Program       "), path);
        }
        if let Some(cmd) = proc_
            .command
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty())
        {
            println!("{} {}", p.dim("Command       "), cmd);
        }
        // Linux and macOS give `Uid(1000)`; a Windows SID isn't worth printing.
        if let Some(uid) = proc_
            .user
            .as_deref()
            .and_then(|u| u.strip_prefix("Uid(")?.strip_suffix(')'))
        {
            if uid.chars().all(|c| c.is_ascii_digit()) {
                println!("{} uid {}", p.dim("User          "), uid);
            }
        }
    }
    if let Some(c) = &r.port.container {
        println!(
            "{} {} {} ({}), port {} inside",
            p.dim("Container     "),
            c.runtime,
            c.name,
            c.image,
            c.container_port
        );
    }
    println!("{} {}", p.dim("What to do    "), r.advice.recommendation);
    for n in &r.advice.notes {
        println!("{} {}", p.dim("Note          "), n);
    }
}

fn owner_long(r: &Row) -> String {
    let mut parts = Vec::new();
    if let Some(proc_) = &r.port.process {
        parts.push(format!("{} (pid {})", proc_.name, proc_.pid));
    }
    if let Some(c) = &r.port.container {
        parts.push(format!("container {} ({})", c.name, c.image));
    }
    if parts.is_empty() {
        "unknown owner".to_string()
    } else {
        parts.join(" · ")
    }
}

fn footer(rows: &[Row], p: &Paint) {
    if rows
        .iter()
        .any(|r| r.port.process.is_none() && r.port.container.is_none())
        && !elevated()
    {
        println!();
        println!("{}", p.dim("Some owners are hidden from this user. Run with sudo (or as administrator) to see them."));
    }
    if rows
        .iter()
        .any(|r| r.advice.exposure == porter_core::advisor::Exposure::All)
    {
        println!("{}", p.dim("\"all interfaces\" means the program accepts connections from any network; Porter doesn't read firewall rules."));
    }
}
