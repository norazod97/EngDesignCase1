// STUDY SERVER for two devices (participant tablet + wizard laptop).
//
// What it does, on ONE port (default 8080):
//   1. serves the built app from dist/ (run "npm run build" first), so the tablet
//      can open e.g. http://192.168.1.20:8080/chatbot/
//   2. relays the Wizard-of-Oz messages between devices over WebSocket (/relay).
//      Each study version has its own room, so chatbot and colleagues never mix.
//
// Everything stays on the lab network: no internet service sees study data.
// Start it with:  npm run study      (stop with Ctrl + C)

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const DIST = join(process.cwd(), "dist");

// File types the browser needs to know.
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png",
  ".woff2": "font/woff2", ".ico": "image/x-icon",
};

// ---- 1. serve the app ------------------------------------------------------
const server = createServer((req, res) => {
  // Only files inside dist/ may be served (no "../" tricks).
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(DIST, urlPath));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404).end("Not found. Did you run npm run build?"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

// ---- 2. relay messages between devices -------------------------------------
const wss = new WebSocketServer({ server, path: "/relay" });
wss.on("connection", (socket, req) => {
  // Room = study version channel, e.g. "corob-woz-A_chatbot".
  socket.room = new URL(req.url, "http://x").searchParams.get("room") ?? "default";
  console.log(`[relay] device joined ${socket.room} (${wss.clients.size} connected)`);
  socket.on("message", (data) => {
    // Pass the message on to every OTHER device in the same room.
    for (const other of wss.clients) {
      if (other !== socket && other.room === socket.room && other.readyState === 1) other.send(data.toString());
    }
  });
  socket.on("close", () => console.log(`[relay] device left ${socket.room} (${wss.clients.size} connected)`));
});

// ---- start and show the addresses to type on the tablet --------------------
server.listen(PORT, "0.0.0.0", () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log(`\nStudy server running. On THIS laptop:  http://localhost:${PORT}/`);
  ips.forEach((ip) => console.log(`On the tablet (same network):        http://${ip}:${PORT}/`));
  console.log("\nOpen the participant screen on the tablet and the wizard on this laptop,");
  console.log("both from the SAME version (…/chatbot/ or …/colleagues/). Stop with Ctrl + C.\n");
});
