import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`[Static] Serving static files from: ${distPath}`);

  app.use(express.static(distPath));

  // fall through to index.html for SPA routing, avoiding API routes
  app.get("(.*)", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    console.log(`[Static] Catch-all route hit for: ${req.path}. Serving index.html`);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
