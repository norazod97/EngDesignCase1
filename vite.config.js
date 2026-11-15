// Vite settings.
// base "./" for builds: all file links are relative, so the same build works in
// any folder (e.g. GitHub Pages /EngDesignCase1/chatbot/ and /EngDesignCase1/colleagues/).
// The app uses hash routing (#/dashboard), so relative links are safe.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "./" : "/",
}));
