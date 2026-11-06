import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO, DEFAULT_PORTS, FEATURES, RELEASE, SITE, installerMB, mb, type Asset, type DemoPort } from "./content";
import { Pulse, GitHub, ArrowRight, Download, Copy, Check, Search, X } from "./components/Icons";

type OS = "windows" | "mac" | "linux" | null;
function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua)) return "mac";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return null;
}
function useDownload() {
  const [os, setOS] = useState<OS>(null);
  useEffect(() => setOS(detectOS()), []);
  const a = RELEASE.assets;
  if (os === "windows" && a.windows) return { href: a.windows.url, label: "Download for Windows", size: mb(a.windows.size) };
  if (os === "mac" && a.macArm) return { href: a.macArm.url, label: "Download for macOS", size: mb(a.macArm.size) };
  if (os === "linux") return { href: "#download", label: "Download for Linux", size: null };
  return { href: "#download", label: "Download", size: null };
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="nav" data-scrolled={scrolled}>
      <div className="nav-inner">
        <a className="brand" href="#top" aria-label="Porter, back to top">
          <span className="brand-icon">
            <Pulse />
          </span>
          <span>Porter</span>
          <span className="live" aria-hidden="true">
            <i /> Live
          </span>
        </a>
        <nav aria-label="Sections" className="nav-links">
          <a href="#features">Features</a>
          <a href="#docker">Docker</a>
          <a href={SITE.changelog}>Changelog</a>
        </nav>
        <a className="icon-link" href={SITE.repo} aria-label="Porter on GitHub">
          <GitHub />
        </a>
        <a className="btn btn-solid btn-sm" href="#download">
          Download
        </a>
      </div>
    </header>
  );
}

const SEQUENCE = ["5432", "3000", "docker", "27017"];

/** The hero's interactive port list. Real data from the app screenshot; typing, filtering and stopping work. */
function LiveBoard({ onPort }: { onPort: (p: string) => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DemoPort[]>(DEMO);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [stopped, setStopped] = useState<DemoPort | null>(null);
  const auto = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  // Autoplay types a few queries until the visitor touches the demo. Off for reduced motion.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await wait(1200);
      for (let k = 0; alive; k++) {
        const q = SEQUENCE[k % SEQUENCE.length];
        for (let i = 1; i <= q.length && alive && auto.current; i++) {
          setQuery(q.slice(0, i));
          await wait(110);
        }
        if (!auto.current || !alive) return;
        if (/^\d+$/.test(q)) onPort(q);
        await wait(2000);
        for (let i = q.length - 1; i >= 0 && alive && auto.current; i--) {
          setQuery(q.slice(0, i));
          await wait(45);
        }
        if (!auto.current || !alive) return;
        await wait(600);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onPort]);

  const takeOver = useCallback(() => {
    if (auto.current) {
      auto.current = false;
      setQuery("");
    }
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (r: DemoPort) =>
    !q || String(r.port).startsWith(q) || r.service.toLowerCase().includes(q) || (r.process ?? "").toLowerCase().includes(q);

  const stop = (port: number) => {
    const row = rows.find((r) => r.port === port);
    if (!row?.process) return;
    // Stopping a process frees every port it held, as in the app.
    setRows((rs) => rs.map((r) => (r.process === row.process ? { ...r, status: "free", process: undefined, pid: undefined } : r)));
    setConfirm(null);
    setStopped(row);
  };
  const undo = () => {
    setRows(DEMO);
    setStopped(null);
  };

  const free = rows.filter((r) => r.status === "free").length;
  const used = rows.length - free;

  return (
    <div className="board" onPointerDown={takeOver} onFocusCapture={takeOver}>
      <div className="board-stats" aria-live="polite">
        <div>
          <span className="k k-free">
            <i /> Free
          </span>
          <b className="mono">{free}</b>
        </div>
        <div>
          <span className="k k-occ">
            <i /> Occupied
          </span>
          <b className="mono">{used}</b>
        </div>
        <div className="board-ratio" aria-hidden="true">
          <span className="r-free" style={{ transform: `scaleX(${free / rows.length})` }} />
        </div>
      </div>
      <label className="search" htmlFor="demo-search">
        <Search />
        <span className="sr-only">Search the example ports</span>
        <input
          ref={input}
          id="demo-search"
          className="mono"
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search by port number"
          value={query}
          onChange={(e) => {
            auto.current = false;
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
        />
        <kbd aria-hidden="true">/</kbd>
      </label>
      <ul className="ports" aria-label="Example ports">
        {rows.map((r) => {
          const hit = matches(r);
          const asking = confirm === r.port;
          return (
            <li key={r.port} className="port" data-status={r.status} data-dim={!hit} data-asking={asking}>
              <i className="sdot" aria-hidden="true" />
              <span className="pnum mono">{r.port}</span>
              <span className="psvc">{r.service}</span>
              <span className="pproc">
                {r.process ? (
                  <>
                    <b>{r.process}</b> <span className="mono">{r.pid}</span>
                  </>
                ) : (
                  <span className="dash">—</span>
                )}
              </span>
              <span className={`tag tag-${r.status}`}>{r.status === "free" ? "Free" : "In use"}</span>
              <span className="pact">
                {r.process && (
                  <button
                    type="button"
                    className="kill"
                    aria-label={`Stop ${r.process} on port ${r.port}`}
                    onClick={() => setConfirm(r.port)}
                    tabIndex={hit ? 0 : -1}
                  >
                    <X />
                  </button>
                )}
              </span>
              {asking && (
                <span className="confirm" role="group" aria-label="Confirm stop">
                  <span>
                    Stop <b>{r.process}</b>?
                  </span>
                  <button type="button" className="c-cancel" onClick={() => setConfirm(null)}>
                    Cancel
                  </button>
                  <button type="button" className="c-stop" onClick={() => stop(r.port)} autoFocus>
                    Stop
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="board-foot" aria-live="polite">
        {stopped ? (
          <>
            Stopped <b>{stopped.process}</b>. Its ports are free.{" "}
            <button type="button" className="link-btn" onClick={undo}>
              Reset
            </button>
          </>
        ) : (
          <>Example ports from the app. Type to search, or stop the process on 5432.</>
        )}
      </p>
    </div>
  );
}

function Hero() {
  const dl = useDownload();
  const [port, setPort] = useState("3000");
  const onPort = useCallback((p: string) => setPort(p), []);
  return (
    <section className="hero wrap" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <a className="release-pill" href={RELEASE.page}>
          <i className="dot" aria-hidden="true" />v{RELEASE.version} · Windows, macOS, Linux · MIT
        </a>
        <h1 id="hero-title">
          What's on port{" "}
          <span className="hero-port mono" key={port}>
            {port}
          </span>
          ?
        </h1>
        <p className="hero-sub">
          Porter shows every port on your machine, which process holds it, and stops it in one click. A small, fast,
          open-source desktop app{installerMB ? `, ${installerMB} MB to install` : ""}.
        </p>
        <div className="cta-row">
          <a className="btn btn-solid" href={dl.href}>
            <Download />
            {dl.label}
            {dl.size && <span className="btn-meta">{dl.size} MB</span>}
          </a>
          <a className="btn btn-ghost" href={SITE.repo}>
            <GitHub /> View on GitHub
          </a>
        </div>
        <LiveBoard onPort={onPort} />
      </div>
      <figure className="hero-shot">
        <picture>
          <img
            src="/screenshots/dark.webp"
            srcSet="/screenshots/dark-600.webp 600w, /screenshots/dark.webp 1054w"
            sizes="(min-width: 1000px) 460px, 90vw"
            width={1054}
            height={1354}
            alt="Porter on Windows in the dark theme: free, occupied and system counts, a search box, and a pinned list of ports with the process holding each one"
            loading="eager"
          />
        </picture>
        <figcaption>The real app, on Windows.</figcaption>
      </figure>
    </section>
  );
}

function Statuses() {
  return (
    <section className="wrap statuses" aria-label="What the colours mean">
      <div className="status rise" data-s="free">
        <span className="line" />
        <h2 className="k k-free">
          <i /> Free
        </h2>
        <p>Nothing is bound. Pin the ports you use and see at a glance that they're open, running or not.</p>
      </div>
      <div className="status rise" data-s="occupied">
        <span className="line" />
        <h2 className="k k-occ">
          <i /> Occupied
        </h2>
        <p>A process holds the port. Porter shows its name and PID, and you can stop it.</p>
      </div>
      <div className="status rise" data-s="system">
        <span className="line" />
        <h2 className="k k-sys">
          <i /> System
        </h2>
        <p>The operating system owns it. Porter marks it and leaves it alone, so you never stop something important.</p>
      </div>
    </section>
  );
}

/** Drag, click or use the arrow keys to compare the dark and light themes. */
function Compare() {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const fromEvent = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  return (
    <div
      className="compare"
      ref={box}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        fromEvent(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && fromEvent(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      style={{ ["--pos" as string]: `${pos}%` }}
    >
      <img
        src="/screenshots/light.webp"
        srcSet="/screenshots/light-600.webp 600w, /screenshots/light.webp 1054w"
        sizes="(min-width: 1000px) 520px, 90vw"
        width={1054}
        height={1354}
        alt="Porter in the light theme"
        loading="lazy"
        draggable={false}
      />
      <img
        className="compare-top"
        src="/screenshots/dark.webp"
        srcSet="/screenshots/dark-600.webp 600w, /screenshots/dark.webp 1054w"
        sizes="(min-width: 1000px) 520px, 90vw"
        width={1054}
        height={1354}
        alt="Porter in the dark theme"
        loading="lazy"
        draggable={false}
      />
      <div
        className="compare-handle"
        role="slider"
        tabIndex={0}
        aria-label="Compare dark and light themes"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% dark`}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 4;
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - step));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + step));
          if (e.key === "Home") setPos(0);
          if (e.key === "End") setPos(100);
        }}
      >
        <span />
      </div>
      <span className="compare-label l-dark" aria-hidden="true">
        Dark
      </span>
      <span className="compare-label l-light" aria-hidden="true">
        Light
      </span>
    </div>
  );
}

function Features() {
  return (
    <section className="wrap features" id="features" aria-labelledby="feat-title">
      <div className="feat-copy">
        <div className="section-head rise">
          <h2 id="feat-title">Small app. Sharp answers.</h2>
          <p>Built with Tauri and Rust for minimal resource use. It reads the port table straight from your system.</p>
        </div>
        <dl className="feat-list">
          {FEATURES.map((f) => (
            <div key={f.title} className="feat rise">
              <dt>{f.title}</dt>
              <dd>{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="feat-visual rise">
        <Compare />
        <p className="compare-hint">Drag to compare the two themes.</p>
      </div>
    </section>
  );
}

function Defaults() {
  return (
    <section className="wrap defaults" aria-labelledby="def-title">
      <div className="section-head rise">
        <h2 id="def-title">Watches the ports you actually use.</h2>
        <p>These are checked from the moment it opens. Add or remove any of them in settings.</p>
      </div>
      <ul className="chips">
        {DEFAULT_PORTS.map(([p, what]) => (
          <li key={p} className="chip rise">
            <span className="mono">{p}</span>
            <span>{what}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const t = useRef<number>(undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setDone(false), 1600);
    } catch {
      /* clipboard refused; the text stays selectable */
    }
  };
  return (
    <div className="copy-line">
      <code>{text}</code>
      <button type="button" className="copy-btn" onClick={copy} aria-label={done ? "Copied" : "Copy command"} data-done={done}>
        <span className="copy-icons" aria-hidden="true">
          <Copy />
          <Check />
        </span>
      </button>
    </div>
  );
}

function Docker() {
  return (
    <section className="wrap docker" id="docker" aria-labelledby="docker-title">
      <div className="section-head rise">
        <h2 id="docker-title">On a server, too.</h2>
        <p>
          Porter also runs in a container and shows in your browser. It shares the host's process namespace, so it lists
          the ports of the machine it runs on. Useful on a headless Linux box, or to see which container holds which
          port.
        </p>
      </div>
      <div className="docker-grid">
        <div className="docker-cmd rise">
          <p className="label">From the repository</p>
          <CopyLine text="docker compose up -d --build" />
          <p className="label">Then open</p>
          <CopyLine text="http://localhost:6080" />
        </div>
        <ul className="facts rise">
          <li>
            <b>Local by default.</b> The view has no password, so it is published on 127.0.0.1 only. Reach it from
            elsewhere with an SSH tunnel.
          </li>
          <li>
            <b>On a Linux host</b>, it sees every listening port and the process behind it, and can stop it.
          </li>
          <li>
            <b>On Docker Desktop</b>, the host is Docker's Linux VM, so it shows your containers' published ports.
          </li>
        </ul>
      </div>
    </section>
  );
}

function DlLink({ a, label }: { a?: Asset; label: string }) {
  if (!a) return null;
  return (
    <a className="dl" href={a.url}>
      <span className="dl-label">{label}</span>
      <span className="dl-meta mono">{mb(a.size)} MB</span>
      <ArrowRight />
    </a>
  );
}

function Downloads() {
  const a = RELEASE.assets;
  const date = new Date(RELEASE.date + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <section className="wrap downloads" id="download" aria-labelledby="dl-title">
      <div className="section-head rise">
        <h2 id="dl-title">Download Porter.</h2>
        <p>
          Version {RELEASE.version}, released {date}. Free and open source under the MIT licence.{" "}
          <a href={RELEASE.page}>Release notes</a>
        </p>
      </div>
      <div className="dl-grid">
        <div className="dl-col rise">
          <h3>Windows</h3>
          <DlLink a={a.windows} label="Installer (.exe)" />
          <DlLink a={a.windowsMsi} label="Installer (.msi)" />
          <DlLink a={a.windowsPortable} label="Portable (.zip)" />
          <p className="dl-note">
            Run as Administrator to stop any process. Not code-signed yet: if SmartScreen warns, click More info, then
            Run anyway.
          </p>
        </div>
        <div className="dl-col rise">
          <h3>macOS</h3>
          <DlLink a={a.macArm} label="Apple silicon (.dmg)" />
          <DlLink a={a.macIntel} label="Intel (.dmg)" />
          <p className="dl-note">
            Not notarised yet. If macOS says the app is damaged, run <code>xattr -cr /Applications/Porter.app</code>, or
            right-click it and choose Open.
          </p>
        </div>
        <div className="dl-col rise">
          <h3>Linux</h3>
          <DlLink a={a.appimage} label="AppImage" />
          <DlLink a={a.deb} label="Debian, Ubuntu (.deb)" />
          <DlLink a={a.rpm} label="Fedora (.rpm)" />
          <DlLink a={a.flatpak} label="Flatpak" />
          <p className="dl-note">
            The Flatpak runs <code>ss</code>, <code>kill</code> and <code>pkexec</code> on the host, and nothing else.
          </p>
        </div>
      </div>
      {a.checksums && (
        <p className="checksums">
          Check what you installed against the SHA-256 of every file in <a href={a.checksums.url}>SHA256SUMS.txt</a>.
        </p>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <p className="footer-statement">
          <span className="brand-icon brand-icon-lg">
            <Pulse />
          </span>
          Porter
        </p>
        <p className="footer-by">
          An open-source project of <a href="https://t21.dev">t21.dev</a>. Built with{" "}
          <a href="https://tauri.app">Tauri</a>, React and Rust.
        </p>
        <nav className="footer-links" aria-label="Footer">
          <a href={SITE.repo}>GitHub</a>
          <a href={SITE.changelog}>Changelog</a>
          <a href={SITE.privacy}>Privacy</a>
          <a href={SITE.license}>MIT licence</a>
          <a href="https://turbo-reader.t21.dev">Turbo Reader</a>
        </nav>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Statuses />
        <Features />
        <Defaults />
        <Docker />
        <Downloads />
      </main>
      <Footer />
    </>
  );
}
