import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { corsConfig } from "./middleware/corsConfig";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

const app = express();
const httpServer = createServer(app);

// Startup marker for debugging
import fs from 'fs';
try {
  const startMsg = `Server starting at ${new Date().toISOString()}\n`;
  if (!fs.existsSync(path.join(process.cwd(), 'logs'))) fs.mkdirSync(path.join(process.cwd(), 'logs'));
  fs.appendFileSync(path.join(process.cwd(), 'logs', 'server_start.txt'), startMsg);
  console.log('[Startup] Marker written to logs/server_start.txt');
} catch (e) { }

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers
const isDev = process.env.NODE_ENV !== "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "ws:", "wss:", "http://localhost:*", "http://127.0.0.1:*", "*.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(corsConfig);

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      logger.info(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    }
  });

  next();
});

// Add API version header
app.use('/api', (req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

import { connectMongo } from "./db";

(async () => {
  try {
    await connectMongo();

    log(`NODE_ENV: ${process.env.NODE_ENV}`);
    log(`PORT: ${process.env.PORT}`);

    // Health check endpoint
    app.get("/api/health", (_req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        db: !!process.env.DATABASE_URL,
        mongo: !!process.env.MONGODB_URI
      });
    });

    // Standardize auth result for all routes
    await registerRoutes(httpServer, app);

    // Centralized Error Handling
    app.use(errorHandler);

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    log(`Attempting to start on port: ${port}`);
    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (err) {
    console.error("CRITICAL STARTUP ERROR:", err);
    process.exit(1);
  }
})();
