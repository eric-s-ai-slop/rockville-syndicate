import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple File-Based DB representing our Stateless SQLite Leaderboard
  const DATA_DIR = path.join(process.cwd(), "db_data");
  const DB_FILE = path.join(DATA_DIR, "leaderboard.json");

  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Pre-seed mock database if empty
  const defaultLeaderboard = [
    { id: 1, initials: "ERH", score: 3333, hero: "Eric Huang", date: "2026-06-11" },
    { id: 2, initials: "NKF", score: 2910, hero: "Nick Farrar", date: "2026-06-08" },
    { id: 3, initials: "SGB", score: 1030, hero: "Nick Hedgecock", date: "2026-06-10" },
    { id: 4, initials: "SBZ", score: 390, hero: "Jacob Lebby", date: "2026-06-11" },
    { id: 5, initials: "MYT", score: 850, hero: "Myat Maharko", date: "2026-06-05" }
  ];

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultLeaderboard, null, 2));
  }

  const getLeaderboardData = async () => {
    try {
      const content = await fs.promises.readFile(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      return defaultLeaderboard;
    }
  };

  const saveLeaderboardData = async (data: any[]) => {
    await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2));
  };

  // REST API Endpoints

  // Get Leaderboard (sorted by score descending)
  app.get("/api/leaderboard", async (req, res) => {
    const data = await getLeaderboardData();
    const sorted = [...data].sort((a, b) => b.score - a.score);
    res.json(sorted);
  });

  let leaderboardUpdatePromise = Promise.resolve();

  // Post entry to Leaderboard
  app.post("/api/leaderboard", async (req, res) => {
    const { initials, score, hero } = req.body;
    
    if (!initials || typeof score !== "number" || !hero) {
      return res.status(400).json({ error: "Invalid initials, score, or hero" });
    }

    const cleanInitials = String(initials).toUpperCase().slice(0, 3);
    
    const newEntry = {
      id: Date.now(),
      initials: cleanInitials,
      score,
      hero,
      date: new Date().toISOString().split("T")[0]
    };

    // Serialize updates
    const updateTask = async () => {
      const data = await getLeaderboardData();
      data.push(newEntry);
      await saveLeaderboardData(data);
    };

    leaderboardUpdatePromise = leaderboardUpdatePromise
      .then(updateTask)
      .catch((err) => {
        console.error("Failed to update leaderboard:", err);
      });

    await leaderboardUpdatePromise;

    res.json({ success: true, entry: newEntry });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Integrate Vite dev and production assets serving
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted successfully.");
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from dist directory.");
  }

  // Bind to host 0.0.0.0 and port 3000 as required
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Project Omega Server] Express API active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Project Omega full-stack server:", err);
});
