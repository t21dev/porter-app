// Builds `porter`, the terminal version, and puts it where Tauri expects a
// sidecar (bundle.externalBin in tauri.conf.json): src-tauri/binaries/
// porter-<target triple>[.exe]. Tauri then ships it in every installer, next
// to the app, as plain `porter`.
//
// Runs from beforeBuildCommand (release) and beforeDevCommand (--dev, a debug
// build). Tauri passes the target in TAURI_ENV_TARGET_TRIPLE; run by hand, it
// builds for this machine.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');

const host = execFileSync('rustc', ['-vV'], { encoding: 'utf8' }).match(/^host: (\S+)/m)[1];
const target = process.env.TAURI_ENV_TARGET_TRIPLE || host;
const windows = target.includes('windows');
const exe = windows ? '.exe' : '';

// Its own target folder: the static runtime flag below would otherwise make
// the app's build and this one rebuild their shared dependencies in turn.
const targetDir = join(root, 'src-tauri', 'target', 'sidecar');
const args = ['build', '-p', 'porter-cli', '--manifest-path', join(root, 'src-tauri', 'Cargo.toml')];
if (!dev) args.push('--release');
if (target !== host) args.push('--target', target);

const env = { ...process.env, CARGO_TARGET_DIR: targetDir };
// Link the Visual C++ runtime in, as the app does, so porter.exe runs on a
// clean Windows install.
if (windows && target.includes('msvc') && !dev) {
  env.RUSTFLAGS = `${env.RUSTFLAGS ?? ''} -C target-feature=+crt-static`.trim();
}

console.log(`Building porter for ${target}${dev ? ' (debug)' : ''}...`);
execFileSync('cargo', args, { stdio: 'inherit', env });

const built = join(targetDir, target !== host ? target : '', dev ? 'debug' : 'release', `porter${exe}`);
const out = join(root, 'src-tauri', 'binaries', `porter-${target}${exe}`);
mkdirSync(dirname(out), { recursive: true });
copyFileSync(built, out);
console.log(`Sidecar ready: ${out}`);
