// Builds BOTH study versions for GitHub Pages (PLAN task T5):
//   dist/chatbot/      condition A (Ask AI)
//   dist/colleagues/   condition B (Call a colleague)
//   dist/index.html    a small start page with links to both versions and their wizards
// Run with: npm run build   (the GitHub Pages workflow does this on every push to main)
import { rm, writeFile } from "node:fs/promises";
import { build } from "vite";

const VERSIONS = [
  { mode: "chatbot", title: "Version A · Chatbot", text: "Help comes from the AI assistant." },
  { mode: "colleagues", title: "Version B · Colleagues", text: "Help comes from colleagues on the shop floor." },
];

// 1. Start from an empty dist folder.
await rm("dist", { recursive: true, force: true });

// 2. Build each version into its own folder.
for (const v of VERSIONS) {
  console.log(`\nBuilding ${v.title} ...`);
  await build({ mode: v.mode, build: { outDir: `dist/${v.mode}`, emptyOutDir: true } });
}

// 3. Write the start page.
const cards = VERSIONS.map((v) => `
    <section>
      <h2>${v.title}</h2>
      <p>${v.text}</p>
      <p><a class="btn" href="./${v.mode}/">Open participant screen</a></p>
      <p><a href="./${v.mode}/#/wizard">Wizard console</a> (researcher, open in a second tab)</p>
    </section>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>COROB Weld Cell · study versions</title>
  <style>
    body { margin: 0; padding: 32px 16px; background: #f4f4f4; color: #1e1e1e; font-family: "Segoe UI", system-ui, sans-serif; font-size: 17px; }
    main { max-width: 760px; margin: 0 auto; display: grid; gap: 16px; }
    h1 { font-family: Consolas, monospace; }
    section { background: #fff; padding: 20px; border-top: 6px solid #1e1e1e; border-radius: 4px; }
    .btn { display: inline-block; padding: 14px 22px; background: #ff7514; color: #1e1e1e; font-weight: 700; text-decoration: none; text-transform: uppercase; border-radius: 4px; }
    .note { color: #5c5c5c; }
  </style>
</head>
<body>
  <main>
    <h1>COROB Weld Cell · study versions</h1>
    <p class="note">Simulation for a Wizard-of-Oz study. Not connected to real equipment.
      Open the participant screen and its wizard console in two tabs of the same browser.</p>
    ${cards}
  </main>
</body>
</html>
`;
await writeFile("dist/index.html", html);
console.log("\nDone: dist/chatbot, dist/colleagues and dist/index.html");
