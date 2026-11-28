//! `porter`: Porter in the terminal. Run it bare for the live view, or use a
//! subcommand for scripts and quick checks.

mod print;
mod scan;
mod tui;

use anyhow::{bail, Result};
use clap::{Parser, Subcommand};
use porter_core::advisor::Risk;
use scan::{scan, Options};
use std::io::{IsTerminal, Write};
use std::process::ExitCode;

#[derive(Parser)]
#[command(
    name = "porter",
    version,
    about = "What's listening on which port, including Docker and Podman containers, and whether it should be.",
    after_help = "Run without a command for the live view. Run as root (sudo) to see every port's owner."
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Cmd>,
    /// Also list the local end of outgoing connections, not only listening ports.
    #[arg(long, global = true)]
    connections: bool,
    /// Don't ask Docker or Podman which container publishes each port.
    #[arg(long, global = true)]
    no_containers: bool,
    /// Leave out UDP; list TCP ports only.
    #[arg(long, global = true)]
    tcp_only: bool,
}

#[derive(Subcommand)]
enum Cmd {
    /// List every port in use with its owner, reach and risk.
    List {
        /// Print JSON instead of a table.
        #[arg(long)]
        json: bool,
    },
    /// Explain every port reachable from the network: why it's open and what to do.
    Audit {
        /// Print JSON instead of text.
        #[arg(long)]
        json: bool,
        /// Exit with status 2 if any port is at this risk or above (low, medium, high). For CI and cron.
        #[arg(long, value_name = "RISK", value_parser = parse_risk)]
        fail_on: Option<Risk>,
        /// Explain every reachable port, not only the medium and high ones.
        #[arg(long)]
        all: bool,
    },
    /// Everything Porter knows about one port.
    Explain {
        port: u16,
        #[arg(long)]
        json: bool,
    },
    /// Put this porter on the PATH, take it off, or check (used by the Windows installer).
    #[command(hide = true)]
    Path {
        #[arg(value_parser = ["add", "remove", "status"])]
        action: String,
        /// The system PATH, for every user (needs admin; the installer runs elevated).
        #[arg(long)]
        all_users: bool,
    },
    /// Stop the process holding a port.
    Kill {
        port: u16,
        /// Don't ask for confirmation.
        #[arg(short, long)]
        yes: bool,
    },
}

fn parse_risk(s: &str) -> Result<Risk, String> {
    Risk::parse(s).ok_or_else(|| format!("expected low, medium or high, got {s:?}"))
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match run(cli) {
        Ok(code) => code,
        Err(e) => {
            eprintln!("porter: {e:#}");
            ExitCode::FAILURE
        }
    }
}

fn run(cli: Cli) -> Result<ExitCode> {
    let opts = Options {
        connections: cli.connections,
        containers: !cli.no_containers,
        udp: !cli.tcp_only,
    };
    match cli.command {
        None if std::io::stdout().is_terminal() => {
            tui::run(opts)?;
        }
        // Piped with no command: the table, which is what a script wants.
        None => print::list(&scan(opts)?),
        Some(Cmd::List { json }) => {
            let rows = scan(opts)?;
            if json {
                print::json(&rows)?
            } else {
                print::list(&rows)
            }
        }
        Some(Cmd::Audit { json, fail_on, all }) => {
            let rows = scan(opts)?;
            let worst = if json {
                let exposed: Vec<_> = rows.into_iter().filter(|r| r.exposed()).collect();
                print::json(&exposed)?;
                exposed.iter().map(|r| r.advice.risk).max()
            } else {
                print::audit(&rows, all)
            };
            if fail_on.is_some_and(|level| worst.is_some_and(|w| w >= level)) {
                return Ok(ExitCode::from(2));
            }
        }
        Some(Cmd::Explain { port, json }) => {
            let rows = scan(Options {
                connections: true,
                ..opts
            })?;
            // TCP and UDP can share a number (DNS on 53): explain each.
            let matching: Vec<_> = rows.into_iter().filter(|r| r.port.port == port).collect();
            if matching.is_empty() {
                bail!("nothing is using port {port}");
            }
            if json {
                print::json(&matching)?;
            } else {
                // Process details are looked up by port over TCP, so they only
                // count when they name the same process as the row.
                let details = porter_core::services::PortMonitor::new()
                    .get_port_details(port)
                    .ok()
                    .flatten();
                for (i, row) in matching.iter().enumerate() {
                    if i > 0 {
                        println!();
                    }
                    let same = details.as_ref().filter(|d| {
                        d.process.as_ref().map(|p| p.pid) == row.pid() && row.pid().is_some()
                    });
                    print::explain(row, same);
                }
            }
        }
        Some(Cmd::Path { action, all_users }) => {
            use porter_core::services::cli_path;
            let st = match (action.as_str(), all_users) {
                ("add", false) => cli_path::set_on_path(true)?,
                ("remove", false) => cli_path::set_on_path(false)?,
                ("add", true) => cli_path::set_on_path_for_all_users(true)?,
                ("remove", true) => cli_path::set_on_path_for_all_users(false)?,
                _ => cli_path::status(),
            };
            match (&st.bundled, st.on_path) {
                (Some(p), true) => println!("porter is on the PATH ({p}). Open a new terminal to use it."),
                (Some(p), false) => println!("porter is not on the PATH ({p})."),
                (None, on) => println!("porter is {}on the PATH.", if on { "" } else { "not " }),
            }
            if let Some(note) = st.note {
                println!("{note}");
            }
        }
        Some(Cmd::Kill { port, yes }) => {
            let rows = scan(Options {
                connections: true,
                ..opts
            })?;
            // When TCP and UDP share the number, the row with a visible owner
            // wins, TCP first.
            let mut matching: Vec<_> = rows.iter().filter(|r| r.port.port == port).collect();
            matching.sort_by_key(|r| (r.pid().is_none(), r.proto() != "tcp"));
            let Some(row) = matching.first().copied() else {
                bail!("nothing is using port {port}");
            };
            let Some(pid) = row.pid() else {
                match &row.port.container {
                    Some(c) => bail!(
                        "port {port} belongs to container {}; stop it with `{} stop {}`",
                        c.name,
                        c.runtime,
                        c.name
                    ),
                    None => bail!("can't see which process owns port {port}; try again with sudo"),
                }
            };
            if !yes && !confirm(&format!("Stop {} (pid {pid}) on port {port}?", row.owner()))? {
                println!("Left it running.");
                return Ok(ExitCode::SUCCESS);
            }
            stop(pid)?;
            println!("Stopped {} (pid {pid}). Port {port} is free.", row.owner());
        }
    }
    Ok(ExitCode::SUCCESS)
}

/// Stop a process: SIGTERM then SIGKILL, falling back to the platform's
/// elevation prompt (pkexec, the macOS password dialog) when refused.
pub fn stop(pid: u32) -> Result<()> {
    porter_core::services::ProcessManager::new().kill_process(pid)?;
    Ok(())
}

fn confirm(question: &str) -> Result<bool> {
    print!("{question} [y/N] ");
    std::io::stdout().flush()?;
    let mut answer = String::new();
    std::io::stdin().read_line(&mut answer)?;
    Ok(matches!(answer.trim(), "y" | "Y" | "yes"))
}
