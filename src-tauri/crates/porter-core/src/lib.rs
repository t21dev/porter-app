//! The part of Porter that reads the machine: which ports are in use, by which
//! process or container, and what each one is likely for. The desktop app and
//! the `porter` CLI both build on it, so it has no UI or Tauri dependency.

pub mod advisor;
pub mod containers;
pub mod models;
pub mod platform;
pub mod services;
