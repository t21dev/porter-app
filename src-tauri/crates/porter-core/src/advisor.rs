//! Why a port is open, how far it reaches, and whether it should be.
//!
//! Everything here is offline and rule-based: a table of well-known services
//! matched by container image, process name and port number, plus the address
//! the socket is bound to. It can't see firewall rules, so "all interfaces"
//! means the program accepts connections from any network the machine is on,
//! not that the internet can reach it. The advice says so where it matters.

use crate::models::{Port, Protocol};
use serde::Serialize;
use std::net::IpAddr;

/// How far a listening socket reaches, from its bind address.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Exposure {
    /// Loopback: only programs on this machine can connect.
    Local,
    /// One private or link-local address: the local network.
    Private,
    /// One public address.
    Public,
    /// `0.0.0.0` or `::`: every network the machine is on.
    All,
}

impl Exposure {
    pub fn of(address: &str) -> Self {
        let addr = address.trim_start_matches('[').trim_end_matches(']');
        // `::ffff:127.0.0.1` and friends.
        let addr = addr.rsplit_once("::ffff:").map(|(_, v4)| v4).unwrap_or(addr);
        match addr.parse::<IpAddr>() {
            Ok(ip) if ip.is_unspecified() => Exposure::All,
            Ok(ip) if ip.is_loopback() => Exposure::Local,
            Ok(IpAddr::V4(v4)) if v4.is_private() || v4.is_link_local() || is_cgnat(v4) => Exposure::Private,
            Ok(IpAddr::V6(v6)) if (v6.segments()[0] & 0xfe00) == 0xfc00 || (v6.segments()[0] & 0xffc0) == 0xfe80 => {
                Exposure::Private
            }
            Ok(_) => Exposure::Public,
            // `*` from lsof, or a name: treat it as everywhere.
            Err(_) if addr == "*" || addr.is_empty() => Exposure::All,
            Err(_) => Exposure::All,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Exposure::Local => "this machine only",
            Exposure::Private => "local network",
            Exposure::Public => "public address",
            Exposure::All => "all interfaces",
        }
    }
}

/// 100.64.0.0/10, which Tailscale and carrier NAT use. Not routable from the
/// internet, so treated like a private network.
fn is_cgnat(v4: std::net::Ipv4Addr) -> bool {
    let o = v4.octets();
    o[0] == 100 && (o[1] & 0xc0) == 64
}

/// How much attention a port deserves.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Risk {
    /// Expected, or reachable from this machine only.
    Ok,
    /// Worth knowing about; nothing urgent.
    Low,
    /// Probably shouldn't be reachable this widely.
    Medium,
    /// Commonly exploited when exposed: close it or restrict it.
    High,
}

impl Risk {
    pub fn label(self) -> &'static str {
        match self {
            Risk::Ok => "ok",
            Risk::Low => "low",
            Risk::Medium => "medium",
            Risk::High => "high",
        }
    }

    fn step_down(self) -> Self {
        match self {
            Risk::High => Risk::Medium,
            Risk::Medium => Risk::Low,
            r => r,
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s.to_ascii_lowercase().as_str() {
            "ok" => Some(Risk::Ok),
            "low" => Some(Risk::Low),
            "medium" | "med" => Some(Risk::Medium),
            "high" => Some(Risk::High),
            _ => None,
        }
    }
}

/// What kind of thing a service is. Decides the default risk and advice when
/// the service has none of its own.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Web,
    RemoteAccess,
    Database,
    Queue,
    Admin,
    DevServer,
    Mail,
    Dns,
    FileShare,
    Vpn,
    Media,
    /// A desktop app's local-network feature: streaming, discovery, LAN sync.
    LanApp,
    OsService,
    Runtime,
    Unknown,
}

impl Kind {
    fn exposed_risk(self) -> Risk {
        match self {
            Kind::Web | Kind::Mail | Kind::Vpn => Risk::Ok,
            Kind::RemoteAccess | Kind::Dns | Kind::Media | Kind::LanApp | Kind::OsService => Risk::Low,
            Kind::Admin | Kind::DevServer | Kind::FileShare | Kind::Runtime | Kind::Unknown => Risk::Medium,
            Kind::Database | Kind::Queue => Risk::High,
        }
    }

    fn exposed_advice(self) -> &'static str {
        match self {
            Kind::Web => "Expected on a web server. Keep it patched and serve HTTPS.",
            Kind::RemoteAccess => "Allow only your own IP or VPN in the firewall, and use key-based login.",
            Kind::Database => {
                "Databases shouldn't face the network. Bind it to 127.0.0.1, or allow only your app servers in the firewall."
            }
            Kind::Queue => {
                "Message brokers shouldn't face the network. Bind it to 127.0.0.1, or allow only the hosts that use it."
            }
            Kind::Admin => {
                "Dashboards and admin APIs belong behind a VPN, an SSH tunnel or a login. Bind it to 127.0.0.1 if you only use it here."
            }
            Kind::DevServer => {
                "Dev servers aren't hardened. Bind it to localhost (often `--host 127.0.0.1`) unless you're testing from another device."
            }
            Kind::Mail => "Expected on a mail server. Close it if this machine doesn't handle mail.",
            Kind::Dns => "Expected on a DNS server. Make sure it answers only your own network, not the whole internet.",
            Kind::FileShare => "Keep file sharing blocked from the internet, and turn it off if you don't share files.",
            Kind::Vpn => "Expected for a VPN endpoint.",
            Kind::Media => "Fine on a home network. Put it behind a login or VPN before exposing it to the internet.",
            Kind::LanApp => {
                "Lets the app find or stream to your other devices on the local network. Turn that feature off in the app if you don't use it."
            }
            Kind::OsService => {
                "Part of the operating system. Its firewall normally blocks this from outside; leave it unless you know you don't need it."
            }
            Kind::Runtime => {
                "Check what this program is. If it's a dev server or an internal tool, bind it to 127.0.0.1."
            }
            Kind::Unknown => {
                "If you don't know why it's listening, or no other device needs to reach it, stop the program or block the port in the firewall."
            }
        }
    }
}

/// A well-known service.
struct Service {
    name: &'static str,
    kind: Kind,
    purpose: &'static str,
    ports: &'static [u16],
    /// Process names, lowercase and without `.exe`.
    processes: &'static [&'static str],
    /// Substrings of a container image's name (`postgres` matches `postgres:16`
    /// and `bitnami/postgresql`).
    images: &'static [&'static str],
    /// Overrides the kind's risk when reachable beyond this machine.
    risk: Option<Risk>,
    /// Overrides the kind's advice when reachable beyond this machine.
    advice: Option<&'static str>,
}

const fn svc(name: &'static str, kind: Kind, purpose: &'static str) -> Service {
    Service { name, kind, purpose, ports: &[], processes: &[], images: &[], risk: None, advice: None }
}

impl Service {
    const fn ports(mut self, p: &'static [u16]) -> Self {
        self.ports = p;
        self
    }
    const fn procs(mut self, p: &'static [&'static str]) -> Self {
        self.processes = p;
        self
    }
    const fn images(mut self, i: &'static [&'static str]) -> Self {
        self.images = i;
        self
    }
    const fn risk(mut self, r: Risk) -> Self {
        self.risk = Some(r);
        self
    }
    const fn advice(mut self, a: &'static str) -> Self {
        self.advice = Some(a);
        self
    }
}

use Kind::*;

/// Order matters only between entries that share a port: the first wins when
/// nothing more specific (process or image) decides.
static SERVICES: &[Service] = &[
    // Remote access
    svc("SSH", RemoteAccess, "Remote shell and file transfer (SFTP).")
        .ports(&[22]).procs(&["sshd", "dropbear"])
        .advice("Expected on a server. Use key-only login (PasswordAuthentication no), disable root login, and consider fail2ban or allowing only your IP."),
    svc("Telnet", RemoteAccess, "Unencrypted remote shell from the 1970s.")
        .ports(&[23]).procs(&["telnetd", "in.telnetd"]).risk(Risk::High)
        .advice("Telnet sends passwords in plain text. Turn it off and use SSH."),
    svc("Remote Desktop (RDP)", RemoteAccess, "Windows Remote Desktop.")
        .ports(&[3389]).procs(&["xrdp"]).risk(Risk::High)
        .advice("RDP is one of the most attacked services on the internet. Reach it over a VPN or SSH tunnel, or turn it off."),
    svc("VNC", RemoteAccess, "Remote screen sharing.")
        .ports(&[5900, 5901, 5902]).procs(&["x11vnc", "xvnc", "vncserver", "winvnc", "tvnserver", "screensharingd"]).risk(Risk::High)
        .advice("VNC passwords are weak and often unencrypted. Reach it over an SSH tunnel or VPN only."),
    svc("WinRM", RemoteAccess, "Windows remote management (PowerShell remoting).")
        .ports(&[5985, 5986]).risk(Risk::Medium),
    svc("X11", RemoteAccess, "X Window System display server.")
        .ports(&[6000]).risk(Risk::High)
        .advice("An open X server lets others read your keystrokes and screen. Start it with -nolisten tcp."),

    // Web and proxies
    svc("HTTP", Web, "Web traffic, unencrypted.")
        .ports(&[80]).procs(&["nginx", "apache2", "httpd", "caddy", "traefik", "haproxy", "envoy", "lighttpd", "h2o"])
        .images(&["nginx", "httpd", "caddy", "traefik", "haproxy", "envoy"])
        .advice("Expected on a web server. Redirect it to HTTPS (443) unless it serves only ACME challenges."),
    svc("HTTPS", Web, "Encrypted web traffic.").ports(&[443, 8443]),

    // Databases and caches
    svc("PostgreSQL", Database, "PostgreSQL database.").ports(&[5432]).procs(&["postgres", "postmaster"]).images(&["postgres", "postgis", "timescale"]),
    svc("MySQL / MariaDB", Database, "MySQL or MariaDB database.").ports(&[3306]).procs(&["mysqld", "mariadbd", "mariadb"]).images(&["mysql", "mariadb", "percona"]),
    svc("SQL Server", Database, "Microsoft SQL Server.").ports(&[1433]).procs(&["sqlservr"]).images(&["mssql"]),
    svc("Oracle", Database, "Oracle database listener.").ports(&[1521]).procs(&["tnslsnr"]),
    svc("MongoDB", Database, "MongoDB database.").ports(&[27017, 27018]).procs(&["mongod", "mongos"]).images(&["mongo"]),
    svc("Redis", Database, "Redis in-memory store, used for caches and queues.")
        .ports(&[6379]).procs(&["redis-server", "valkey-server", "keydb-server"]).images(&["redis", "valkey", "keydb"])
        .advice("Redis has no password by default and an exposed one is taken over within hours. Bind it to 127.0.0.1 and set requirepass."),
    svc("Memcached", Database, "Memcached cache.").ports(&[11211]).procs(&["memcached"]).images(&["memcached"])
        .advice("Exposed memcached is used for DDoS amplification. Bind it to 127.0.0.1."),
    svc("Elasticsearch / OpenSearch", Database, "Search engine and document store.").ports(&[9200, 9300]).images(&["elasticsearch", "opensearch"]),
    svc("CouchDB", Database, "CouchDB database.").ports(&[5984]).procs(&["beam.smp"]).images(&["couchdb"]),
    svc("InfluxDB", Database, "InfluxDB time-series database.").ports(&[8086]).procs(&["influxd"]).images(&["influxdb"]),
    svc("Cassandra", Database, "Cassandra database.").ports(&[9042]).images(&["cassandra", "scylla"]),
    svc("Neo4j", Database, "Neo4j graph database.").ports(&[7474, 7687]).images(&["neo4j"]),
    svc("ClickHouse", Database, "ClickHouse analytics database.").ports(&[8123]).procs(&["clickhouse-server", "clickhouse"]).images(&["clickhouse"]),
    svc("CockroachDB", Database, "CockroachDB database.").ports(&[26257]).procs(&["cockroach"]).images(&["cockroach"]),
    svc("etcd", Database, "etcd key-value store (often Kubernetes' brain).").ports(&[2379, 2380]).procs(&["etcd"]).images(&["etcd"]),

    // Queues
    svc("RabbitMQ", Queue, "RabbitMQ message broker.").ports(&[5672]).images(&["rabbitmq"]),
    svc("RabbitMQ management", Admin, "RabbitMQ's web dashboard.").ports(&[15672]),
    svc("Kafka", Queue, "Kafka event streaming.").ports(&[9092]).images(&["kafka", "redpanda"]),
    svc("NATS", Queue, "NATS messaging.").ports(&[4222]).procs(&["nats-server"]).images(&["nats"]),
    svc("MQTT", Queue, "MQTT broker for IoT devices.").ports(&[1883]).procs(&["mosquitto"]).images(&["mosquitto", "eclipse-mosquitto", "emqx"])
        .advice("Make sure the broker requires a login, or bind it to your local network only."),

    // Containers and orchestration
    svc("Docker API", Admin, "Docker's remote API, without TLS.").ports(&[2375]).risk(Risk::High)
        .advice("An open Docker API gives anyone root on this machine. Turn it off and use the local socket or SSH (DOCKER_HOST=ssh://)."),
    svc("Docker API (TLS)", Admin, "Docker's remote API over TLS.").ports(&[2376]),
    svc("Kubernetes API", Admin, "Kubernetes control plane API.").ports(&[6443]).procs(&["kube-apiserver", "k3s"]),
    svc("Kubelet", Admin, "Kubernetes node agent API.").ports(&[10250]).procs(&["kubelet"]).risk(Risk::High)
        .advice("The kubelet API can run commands in pods. Allow only the control plane to reach it."),
    svc("Portainer", Admin, "Portainer container dashboard.").ports(&[9443]).images(&["portainer"]),

    // Admin, monitoring, tooling
    svc("Grafana", Admin, "Grafana dashboards.").procs(&["grafana", "grafana-server"]).images(&["grafana"]),
    svc("Prometheus", Admin, "Prometheus metrics server.").ports(&[9090]).procs(&["prometheus"]).images(&["prometheus"]),
    svc("Cockpit", Admin, "Cockpit server admin web console.").procs(&["cockpit-ws"]),
    svc("Node exporter", Admin, "Prometheus node exporter (system metrics).").ports(&[9100]).procs(&["node_exporter"]).images(&["node-exporter"])
        .advice("It reveals detailed system information. Allow only your Prometheus server to reach it."),
    svc("Alertmanager", Admin, "Prometheus Alertmanager.").ports(&[9093]).procs(&["alertmanager"]),
    svc("Netdata", Admin, "Netdata monitoring dashboard.").ports(&[19999]).procs(&["netdata"]).images(&["netdata"]),
    svc("Consul", Admin, "HashiCorp Consul.").ports(&[8500]).procs(&["consul"]).images(&["consul"]),
    svc("Vault", Admin, "HashiCorp Vault secrets store.").ports(&[8200]).procs(&["vault"]).images(&["vault"]),
    svc("MinIO", Admin, "MinIO object storage (S3-compatible).").procs(&["minio"]).images(&["minio"]),
    svc("Adminer / pgAdmin / phpMyAdmin", Admin, "A database admin web UI.").images(&["adminer", "pgadmin", "phpmyadmin"]).risk(Risk::High)
        .advice("A database admin UI on the network is a login page away from your data. Reach it over an SSH tunnel instead."),
    svc("Syncthing GUI", Admin, "Syncthing's web settings page.").ports(&[8384]),
    svc("Ollama", Admin, "Ollama local AI model server.").ports(&[11434]).procs(&["ollama"]).images(&["ollama"])
        .advice("Ollama has no login. Anyone who can reach it can use your GPU and models. Bind it to 127.0.0.1 (OLLAMA_HOST)."),
    svc("LDAP", Admin, "Directory service (LDAP).").ports(&[389, 636]).procs(&["slapd"]),
    svc("CUPS", OsService, "Printing service.").ports(&[631]).procs(&["cupsd"])
        .advice("Printing should stay on this machine or the local network. Bind CUPS to localhost if you don't share printers."),

    // Dev tools
    svc("Jupyter", DevServer, "Jupyter notebook server.").ports(&[8888]).images(&["jupyter"]).risk(Risk::High)
        .advice("Jupyter runs code for whoever connects. Bind it to 127.0.0.1 and reach it over an SSH tunnel."),
    svc("Vite dev server", DevServer, "Vite front-end dev server.").ports(&[5173, 5174]),
    svc("Angular dev server", DevServer, "Angular CLI dev server.").ports(&[4200]),
    svc("Dev server", DevServer, "A common port for Node, React, Rails, Flask, Django and other dev servers.")
        .ports(&[3000, 3001, 5000, 8000, 8080, 8081, 4000, 9000]),
    svc("Webpack / browser-sync", DevServer, "Dev tooling (live reload, browser sync).").ports(&[3002, 35729]),

    // Mail
    svc("SMTP", Mail, "Mail transfer between servers.").ports(&[25]).procs(&["master", "postfix", "exim", "exim4", "sendmail", "opensmtpd"]),
    svc("SMTP submission", Mail, "Mail clients sending mail.").ports(&[587, 465]),
    svc("IMAP", Mail, "Mail clients reading mail.").ports(&[143, 993]).procs(&["dovecot", "imap-login"]),
    svc("POP3", Mail, "Mail clients downloading mail.").ports(&[110, 995]),

    // Network services
    svc("DNS", Dns, "Domain name resolution.").ports(&[53]).procs(&["named", "dnsmasq", "unbound", "coredns", "pihole-ftl", "systemd-resolved"]).images(&["pihole", "adguard", "coredns", "bind9"]),
    svc("mDNS", OsService, "Local network discovery (Bonjour, Avahi): how browsers, printers and casting find devices nearby.").ports(&[5353]).procs(&["avahi-daemon", "mdnsresponder"])
        .advice("Normal on a desktop or home network. On a server, turn off avahi-daemon if nothing uses it."),
    svc("WireGuard", Vpn, "WireGuard VPN.").ports(&[51820]),
    svc("OpenVPN", Vpn, "OpenVPN.").ports(&[1194]).procs(&["openvpn"]),
    svc("Tailscale", Vpn, "Tailscale mesh VPN.").ports(&[41641]).procs(&["tailscaled"]),
    svc("rpcbind", OsService, "RPC port mapper, used by NFS.").ports(&[111]).procs(&["rpcbind", "portmap"]).risk(Risk::High)
        .advice("rpcbind is used for DDoS amplification and NFS discovery. Block it from the internet, or remove it if you don't use NFS."),

    // Mostly UDP
    svc("NTP", OsService, "Network time: keeps the clock right, or serves time to others.").ports(&[123]).procs(&["ntpd", "chronyd", "systemd-timesyncd", "w32time"]).risk(Risk::Medium)
        .advice("A time server open to the internet can be used to amplify DDoS attacks. Serve time only to your own network unless that's the point."),
    svc("chrony control", OsService, "chrony's local control port.").ports(&[323]),
    svc("SNMP", Admin, "Network device monitoring (SNMP).").ports(&[161, 162]).procs(&["snmpd", "snmptrapd"]).risk(Risk::High)
        .advice("SNMP leaks system details and amplifies DDoS attacks, and v1/v2c 'community' strings are plain-text passwords. Restrict it to your monitoring host, or use SNMPv3."),
    svc("DHCP server", OsService, "Hands out IP addresses on the local network.").ports(&[67]).procs(&["dhcpd", "kea-dhcp4"])
        .advice("Expected on a router or LAN server. It should never answer on a public interface."),
    svc("DHCP client", OsService, "This machine asking the network for its IP address.").ports(&[68]).procs(&["dhclient", "dhcpcd"]).risk(Risk::Ok),
    svc("TFTP", FileShare, "Trivial file transfer, with no login at all.").ports(&[69]).procs(&["in.tftpd", "tftpd"]).risk(Risk::High)
        .advice("TFTP has no authentication. Keep it on an isolated network (it's for network booting) or turn it off."),
    svc("SSDP / UPnP", OsService, "UPnP device discovery on the local network.").ports(&[1900]).risk(Risk::Medium)
        .advice("Fine on a home network, but reachable from the internet it amplifies DDoS attacks. Turn UPnP off if you don't use it."),
    svc("LLMNR", OsService, "Windows local name resolution.").ports(&[5355]),
    svc("WS-Discovery", OsService, "Windows network device discovery.").ports(&[3702]),
    svc("Syslog", Admin, "Receives log messages from other machines.").ports(&[514]).procs(&["rsyslogd", "syslog-ng"])
        .advice("Anyone who can reach it can write fake log lines. Accept logs only from your own hosts."),
    svc("IPsec VPN", Vpn, "IPsec VPN (IKE and NAT traversal).").ports(&[500, 4500]).procs(&["charon", "charon-systemd", "racoon", "pluto"]),
    svc("STUN / TURN", Media, "Helps video calls and WebRTC get through NAT (coturn).").ports(&[3478, 5349]).procs(&["turnserver", "coturn"]).risk(Risk::Ok),

    // File sharing
    svc("FTP", FileShare, "File transfer, unencrypted.").ports(&[21]).procs(&["vsftpd", "proftpd", "pure-ftpd"]).risk(Risk::High)
        .advice("FTP sends passwords in plain text. Use SFTP (over SSH) and turn FTP off."),
    svc("SMB file sharing", FileShare, "Windows file and printer sharing (SMB).").ports(&[445, 139]).procs(&["smbd"]),
    svc("NetBIOS", FileShare, "Legacy Windows network naming.").ports(&[137, 138]).procs(&["nmbd"]),
    svc("NFS", FileShare, "Network file system.").ports(&[2049]).risk(Risk::High),
    svc("Syncthing", FileShare, "Syncthing device-to-device sync.").ports(&[22000]).procs(&["syncthing"]).risk(Risk::Low),

    // Media and games
    svc("Plex", Media, "Plex media server.").ports(&[32400]).procs(&["plex media server"]).images(&["plex"]),
    svc("Jellyfin", Media, "Jellyfin media server.").ports(&[8096]).procs(&["jellyfin"]).images(&["jellyfin"]),
    svc("Minecraft", Media, "Minecraft game server.").ports(&[25565, 19132]).images(&["minecraft"]).risk(Risk::Ok),
    svc("Game server (Source/Steam)", Media, "A Steam or Source engine game server.").ports(&[27015]).risk(Risk::Ok),

    // Desktop apps with a local-network feature
    svc("Steam", LanApp, "Steam Remote Play and local game transfers.").ports(&[27036, 27037]).procs(&["steam", "steamwebhelper", "steamservice"]),
    svc("Spotify", LanApp, "Spotify Connect, which lets other devices on your network play to and control Spotify.").ports(&[57621]).procs(&["spotify", "spotifylauncher"]),
    svc("Dropbox LAN sync", LanApp, "Dropbox syncing files directly with your other computers on the network.").ports(&[17500]).procs(&["dropbox"]),
    svc("KDE Connect", LanApp, "KDE Connect, pairing this computer with your phone.").ports(&[1716]).procs(&["kdeconnectd"]),
    svc("BitTorrent", LanApp, "A BitTorrent client: peer connections and finding peers on the local network.").ports(&[6771, 6881]).procs(&["qbittorrent", "transmission-daemon", "transmission-qt", "utorrent", "bittorrent", "deluged", "ttorrent"])
        .advice("Expected while a torrent client runs: other peers connect to it. Close the client when you're not using it."),
    svc("LocalSend", LanApp, "LocalSend file sharing between nearby devices.").ports(&[53317]).procs(&["localsend", "localsend_app"]),

    // Operating system
    svc("AirPlay Receiver", OsService, "macOS AirPlay Receiver (Control Center).").procs(&["controlcenter"])
        .advice("Turn off AirPlay Receiver in System Settings > General > AirDrop & Handoff if you don't use it; it also frees ports 5000 and 7000."),
    svc("Windows RPC", OsService, "Windows Remote Procedure Call endpoint mapper.").ports(&[135]),
    svc("Windows Delivery Optimization", OsService, "Windows Update peer-to-peer sharing.").ports(&[7680]),
    svc("Windows Connected Devices", OsService, "Windows Connected Devices Platform.").ports(&[5040]),
    svc("Windows HTTP (http.sys)", OsService, "Windows' built-in web server, shared by IIS and system services.").procs(&["system"]),
    svc("Windows service", OsService, "A Windows system service.")
        .procs(&["svchost", "lsass", "wininit", "services", "spoolsv", "searchindexer"]),
    svc("Docker port forward", OsService, "Docker or Podman forwarding a published port to a container.")
        .procs(&["docker-proxy", "com.docker.backend", "vpnkit", "rootlessport", "rootlesskit", "slirp4netns", "pasta", "conmon", "wslrelay"]),

    // Language runtimes: the program could be anything.
    svc("Node.js program", Runtime, "A Node.js program, often a dev server or web app.").procs(&["node", "nodejs", "bun", "deno"]),
    svc("Python program", Runtime, "A Python program, often a dev server, API or script.").procs(&["python", "python3", "pythonw", "uvicorn", "gunicorn", "hypercorn"]),
    svc("Java program", Runtime, "A Java program (app server, build tool or IDE helper).").procs(&["java", "javaw"]),
    svc("Ruby program", Runtime, "A Ruby program, often Rails or Puma.").procs(&["ruby", "puma", "rails"]),
    svc("PHP program", Runtime, "A PHP program or PHP-FPM.").procs(&["php", "php-fpm", "php-fpm8"]),
    svc(".NET program", Runtime, "A .NET program.").procs(&["dotnet"]),
];

/// The names of forwarding processes that stand in for a container. They say
/// nothing about what runs there, so the container decides instead.
fn is_forwarder(process: &str) -> bool {
    SERVICES
        .iter()
        .find(|s| s.name == "Docker port forward")
        .is_some_and(|s| s.processes.contains(&process))
}

/// Everything Porter can say about one port.
#[derive(Debug, Clone, Serialize)]
pub struct Advice {
    /// The service it's most likely for, if recognised.
    pub service: Option<&'static str>,
    pub kind: Kind,
    /// What that service does: why the port is open.
    pub purpose: String,
    pub exposure: Exposure,
    pub risk: Risk,
    /// What to do about it.
    pub recommendation: String,
    /// Extra facts worth knowing (the Docker firewall bypass, an unknown owner).
    pub notes: Vec<String>,
}

/// Normalise a process name for matching: lowercase, no `.exe`.
fn norm(name: &str) -> String {
    let n = name.to_ascii_lowercase();
    n.strip_suffix(".exe").map(str::to_string).unwrap_or(n)
}

/// The service behind a port: container image first, then a specific process,
/// then the port number (the container's own port when there is one), then a
/// language runtime.
fn identify(port: &Port) -> Option<&'static Service> {
    let process = port.process.as_ref().map(|p| norm(&p.name));
    let forwarded = process.as_deref().is_some_and(is_forwarder);

    if let Some(c) = &port.container {
        let image = c.image.to_ascii_lowercase();
        // `ghcr.io/org/postgres:16` -> `postgres`; keep the repo path too for
        // images like `bitnami/postgresql`.
        let repo = image.split('@').next().unwrap_or(&image);
        let repo = repo.rsplit_once(':').filter(|(_, tag)| !tag.contains('/')).map_or(repo, |(r, _)| r);
        // Any path segment that starts with a known name: `bitnami/postgresql`,
        // `jupyter/base-notebook`, `linuxserver/plex`, but not `acme/complexapp`.
        let known = |s: &&Service| repo.split('/').any(|seg| s.images.iter().any(|i| seg.starts_with(i)));
        if let Some(s) = SERVICES.iter().find(known) {
            return Some(s);
        }
        if let Some(s) = SERVICES.iter().find(|s| s.kind != Runtime && s.ports.contains(&c.container_port)) {
            return Some(s);
        }
    }
    if let Some(p) = process.as_deref().filter(|_| !forwarded) {
        if let Some(s) = SERVICES.iter().find(|s| s.kind != Runtime && s.processes.contains(&p)) {
            // Windows' catch-alls only name the owner; a well-known port is
            // more telling (svchost on 3389 is Remote Desktop).
            let generic = matches!(s.name, "Windows service" | "Windows HTTP (http.sys)");
            if !generic {
                return Some(s);
            }
            return by_port(port.port).filter(|p| p.kind != DevServer).or(Some(s));
        }
    }
    if let Some(s) = by_port(port.port) {
        return Some(s);
    }
    if forwarded {
        return SERVICES.iter().find(|s| s.name == "Docker port forward");
    }
    let p = process?;
    SERVICES.iter().find(|s| s.processes.contains(&p.as_str()))
}

fn by_port(port: u16) -> Option<&'static Service> {
    SERVICES.iter().find(|s| s.ports.contains(&port))
}

/// Explain one port.
pub fn advise(port: &Port) -> Advice {
    let exposure = Exposure::of(&port.ip_address);
    let service = identify(port);
    let kind = service.map_or(Unknown, |s| s.kind);
    let mut notes = Vec::new();

    let purpose = match service {
        Some(s) => s.purpose.to_string(),
        None => {
            let by = port.process.as_ref().map_or(String::new(), |p| format!("Opened by {}. ", p.name));
            if port.port >= 49152 {
                format!("{by}A port from the dynamic range, picked at random, so it can change on each start.")
            } else {
                format!("{by}Porter has no notes on this port.")
            }
        }
    };

    // A UDP socket on a high port with nothing known about it is nearly always
    // a program's own outgoing socket (DNS lookups, QUIC, voice, discovery),
    // which UDP keeps bound for replies. Not a server; don't raise an alarm.
    let ephemeral_udp = service.is_none() && port.protocol == Protocol::UDP && port.port >= 32768;
    if ephemeral_udp {
        let by = port.process.as_ref().map_or("a program".to_string(), |p| p.name.clone());
        return Advice {
            service: None,
            kind,
            purpose: format!("Probably the socket {by} uses for its own outgoing traffic and replies, not a server."),
            exposure,
            risk: if exposure == Exposure::Local { Risk::Ok } else { Risk::Low },
            recommendation: "Nothing to do unless you don't recognise the program.".to_string(),
            notes: Vec::new(),
        };
    }

    let exposed_risk = service.and_then(|s| s.risk).unwrap_or(kind.exposed_risk());
    let (risk, recommendation) = match exposure {
        Exposure::Local => (Risk::Ok, "Nothing to do. Only programs on this machine can connect.".to_string()),
        _ => {
            let advice = service.and_then(|s| s.advice).unwrap_or(kind.exposed_advice());
            let risk = if exposure == Exposure::Private { exposed_risk.step_down() } else { exposed_risk };
            (risk, advice.to_string())
        }
    };

    if port.process.is_none() && port.container.is_none() {
        notes.push(
            "Porter can't see which program owns this port. Run it as root or administrator to find out.".to_string(),
        );
    }
    if let Some(c) = &port.container {
        if exposure == Exposure::All {
            notes.push(format!(
                "Published by container {} ({}). On Linux, Docker's port rules skip ufw and firewalld, so the firewall \
                 won't block it. To keep it private, publish it as 127.0.0.1:{}:{}.",
                c.name, c.image, port.port, c.container_port
            ));
        } else {
            notes.push(format!("Published by container {} ({}).", c.name, c.image));
        }
    }
    if exposure == Exposure::All && risk >= Risk::Medium && port.container.is_none() {
        notes.push("It accepts connections on every network this machine is on. A firewall may still block it; Porter doesn't read firewall rules.".to_string());
    }
    if port.protocol == Protocol::UDP && kind == Database {
        notes.push("Over UDP, an exposed service like this can be used to amplify DDoS attacks.".to_string());
    }

    Advice { service: service.map(|s| s.name), kind, purpose, exposure, risk, recommendation, notes }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{PortStatus, Process};

    fn port(n: u16, addr: &str, process: Option<&str>) -> Port {
        Port {
            port: n,
            status: PortStatus::Occupied,
            protocol: Protocol::TCP,
            process: process.map(|p| Process::named(1234, p.to_string())),
            ip_address: addr.to_string(),
            container: None,
        }
    }

    fn container(image: &str, inner: u16) -> crate::containers::Container {
        crate::containers::Container {
            runtime: "docker".into(),
            id: "abc".into(),
            name: "app".into(),
            image: image.into(),
            container_port: inner,
        }
    }

    #[test]
    fn exposure_follows_the_bind_address() {
        assert_eq!(Exposure::of("127.0.0.1"), Exposure::Local);
        assert_eq!(Exposure::of("::1"), Exposure::Local);
        assert_eq!(Exposure::of("::ffff:127.0.0.1"), Exposure::Local);
        assert_eq!(Exposure::of("0.0.0.0"), Exposure::All);
        assert_eq!(Exposure::of("::"), Exposure::All);
        assert_eq!(Exposure::of("*"), Exposure::All);
        assert_eq!(Exposure::of("192.168.1.20"), Exposure::Private);
        assert_eq!(Exposure::of("100.101.102.103"), Exposure::Private);
        assert_eq!(Exposure::of("fe80::1"), Exposure::Private);
        assert_eq!(Exposure::of("203.0.113.9"), Exposure::Public);
    }

    #[test]
    fn local_ports_are_always_fine() {
        let a = advise(&port(6379, "127.0.0.1", Some("redis-server")));
        assert_eq!((a.service, a.risk), (Some("Redis"), Risk::Ok));
    }

    #[test]
    fn exposed_databases_are_high_risk() {
        let a = advise(&port(5432, "0.0.0.0", Some("postgres")));
        assert_eq!((a.service, a.risk), (Some("PostgreSQL"), Risk::High));
        assert!(a.recommendation.contains("127.0.0.1"));
    }

    #[test]
    fn a_lan_address_lowers_the_risk_one_step() {
        let a = advise(&port(5432, "192.168.1.5", Some("postgres")));
        assert_eq!(a.risk, Risk::Medium);
    }

    #[test]
    fn the_process_beats_the_port_number() {
        // nginx on 8080 is a web server, not a dev server.
        let a = advise(&port(8080, "0.0.0.0", Some("nginx")));
        assert_eq!((a.service, a.risk), (Some("HTTP"), Risk::Ok));
    }

    #[test]
    fn windows_catch_alls_defer_to_a_known_port() {
        let a = advise(&port(3389, "0.0.0.0", Some("svchost.exe")));
        assert_eq!((a.service, a.risk), (Some("Remote Desktop (RDP)"), Risk::High));
        let b = advise(&port(49664, "0.0.0.0", Some("lsass.exe")));
        assert_eq!((b.service, b.risk), (Some("Windows service"), Risk::Low));
    }

    #[test]
    fn a_container_image_names_a_forwarded_port() {
        let mut p = port(15432, "0.0.0.0", Some("docker-proxy"));
        p.container = Some(container("postgres:16-alpine", 5432));
        let a = advise(&p);
        assert_eq!((a.service, a.risk), (Some("PostgreSQL"), Risk::High));
        assert!(a.notes.iter().any(|n| n.contains("ufw") && n.contains("127.0.0.1:15432:5432")));
    }

    #[test]
    fn an_unknown_image_falls_back_to_its_inner_port() {
        let mut p = port(18080, "0.0.0.0", None);
        p.container = Some(container("ghcr.io/acme/billing:1.2", 6379));
        assert_eq!(advise(&p).service, Some("Redis"));
    }

    #[test]
    fn a_registry_port_isnt_mistaken_for_a_tag() {
        let mut p = port(9999, "0.0.0.0", None);
        p.container = Some(container("registry.local:5000/team/redis", 1));
        assert_eq!(advise(&p).service, Some("Redis"));
    }

    #[test]
    fn runtimes_are_a_last_resort() {
        let a = advise(&port(5173, "0.0.0.0", Some("node")));
        assert_eq!((a.service, a.risk), (Some("Vite dev server"), Risk::Medium));
        let b = advise(&port(7777, "0.0.0.0", Some("node")));
        assert_eq!((b.service, b.kind), (Some("Node.js program"), Runtime));
    }

    #[test]
    fn unknown_owner_and_port_asks_for_review() {
        let a = advise(&port(7777, "0.0.0.0", None));
        assert_eq!((a.service, a.risk), (None, Risk::Medium));
        assert!(a.notes.iter().any(|n| n.contains("root or administrator")));
    }

    #[test]
    fn the_unencrypted_docker_api_is_high_risk() {
        let a = advise(&port(2375, "0.0.0.0", Some("dockerd")));
        assert_eq!((a.service, a.risk), (Some("Docker API"), Risk::High));
    }

    fn udp(n: u16, addr: &str, process: Option<&str>) -> Port {
        Port { protocol: Protocol::UDP, ..port(n, addr, process) }
    }

    #[test]
    fn udp_services_are_recognised() {
        assert_eq!(advise(&udp(53, "0.0.0.0", Some("named"))).service, Some("DNS"));
        assert_eq!(advise(&udp(51820, "0.0.0.0", None)).risk, Risk::Ok);
        let snmp = advise(&udp(161, "0.0.0.0", Some("snmpd")));
        assert_eq!((snmp.service, snmp.risk), (Some("SNMP"), Risk::High));
        // Memcached over UDP gets the amplification note.
        assert!(advise(&udp(11211, "0.0.0.0", Some("memcached"))).notes.iter().any(|n| n.contains("amplify")));
    }

    #[test]
    fn high_unknown_udp_ports_are_client_sockets() {
        let a = advise(&udp(52344, "0.0.0.0", Some("chrome.exe")));
        assert_eq!((a.service, a.risk), (None, Risk::Low));
        assert!(a.purpose.contains("chrome.exe"));
        // The same number over TCP is a listener and gets the usual review.
        assert_eq!(advise(&port(52344, "0.0.0.0", Some("chrome.exe"))).risk, Risk::Medium);
    }

    #[test]
    fn advice_serialises_for_json_output() {
        let v = serde_json::to_value(advise(&port(22, "0.0.0.0", Some("sshd")))).unwrap();
        assert_eq!(v["service"], "SSH");
        assert_eq!(v["exposure"], "all");
        assert_eq!(v["risk"], "low");
    }
}
