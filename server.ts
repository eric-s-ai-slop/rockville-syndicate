import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3324;

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.OMEGA_VERSION ?? null,
      revision: process.env.OMEGA_REVISION ?? null,
      builtAt: process.env.OMEGA_BUILD_TIME ?? null,
      environment: process.env.NODE_ENV ?? "development",
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.warn("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/api/chapters", (_req, res) => {
      res.sendFile(path.join(distPath, "production-chapters.json"));
    });
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.warn("Serving static production assets from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.warn(`[Project Omega] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
