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
  // Using pathless middleware for Express 5 catch-all compatibility
  app.use((req, res, next) => {
    // Only handle GET requests that are not API calls or file requests
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.includes(".")) {
      console.log(`[Static] Catch-all middleware hit for: ${req.path}. Serving index.html`);
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    next();
  });
}
