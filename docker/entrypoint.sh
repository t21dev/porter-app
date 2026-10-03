#!/bin/sh
# Start a virtual display, share it over VNC on localhost only, put noVNC in
# front of it, then run Porter. If Porter exits, the container exits.
set -e

Xvfb "$DISPLAY" -screen 0 700x900x24 -nolisten tcp &
for _ in $(seq 1 50); do
  [ -e "/tmp/.X11-unix/X${DISPLAY#:}" ] && break
  sleep 0.1
done

# No password, so VNC itself never leaves the container's loopback.
x11vnc -display "$DISPLAY" -localhost -forever -shared -nopw -quiet -rfbport 5900 &

websockify --web /usr/share/novnc "$PORTER_BIND:$PORTER_PORT" 127.0.0.1:5900 >/dev/null 2>&1 &

echo "Porter is running. Open http://${PORTER_BIND}:${PORTER_PORT} in a browser."
exec porter
