# Porter in a container, viewed in the browser.
#
# The app runs on a virtual display (Xvfb) and noVNC shows that display in a
# browser tab. Started with the host's process namespace (see
# docker-compose.yml), it reads the host's socket table through /proc/1/net,
# so it monitors the machine the container runs on, not just itself.

# ---------------------------------------------------------------- build
FROM rust:1-bookworm AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
      libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf \
      curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The binary alone: no .deb or AppImage is needed inside the image.
RUN npx tauri build --no-bundle

# ---------------------------------------------------------------- runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 librsvg2-common \
      xvfb x11vnc novnc python3-websockify \
      fonts-dejavu-core ca-certificates procps \
 && rm -rf /var/lib/apt/lists/* \
 && printf '<!doctype html><meta http-equiv="refresh" content="0; url=vnc.html?autoconnect=1&resize=scale&reconnect=1">\n' \
      > /usr/share/novnc/index.html

COPY --from=build /src/src-tauri/target/release/porter-app /usr/local/bin/porter
COPY docker/entrypoint.sh /usr/local/bin/porter-entrypoint
RUN chmod +x /usr/local/bin/porter-entrypoint /usr/local/bin/porter

# Software rendering: a virtual display has no GPU.
ENV DISPLAY=:99 \
    LIBGL_ALWAYS_SOFTWARE=1 \
    WEBKIT_DISABLE_COMPOSITING_MODE=1 \
    WEBKIT_DISABLE_DMABUF_RENDERER=1 \
    PORTER_BIND=127.0.0.1 \
    PORTER_PORT=6080 \
    PORTER_NET_DIR=/proc/1/net

EXPOSE 6080
ENTRYPOINT ["porter-entrypoint"]
