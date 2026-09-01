import express from "express";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const PYTHON_PORT = 8000;
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log("[Node] Spawning Python FastAPI backend on port 8000...");
  
  const env = {
    ...process.env,
    PYTHONPATH: process.cwd(),
    PYTHONUNBUFFERED: "1"
  };

  pythonProcess = spawn("python3", [
    "-m", "uvicorn",
    "backend.app.main:app",
    "--host", "127.0.0.1",
    "--port", String(PYTHON_PORT),
    "--log-level", "info"
  ], {
    cwd: process.cwd(),
    env,
    stdio: "inherit"
  });

  pythonProcess.on("error", (err) => {
    console.error("[Python Backend Error]", err);
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`[Python Backend Exited] code=${code}, signal=${signal}`);
  });
}

async function startServer() {
  // Start Python FastAPI backend in the background
  startPythonBackend();

  const app = express();

  // Proxy API and FastAPI Docs endpoints directly to Python FastAPI backend
  const fastApiProxy = createProxyMiddleware({
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
    ws: true,
    on: {
      error: (err, req, res) => {
        console.warn(`[Proxy Warning] FastAPI backend initializing for ${(req as any).url}`);
        if (res && "status" in res && typeof (res as any).status === "function") {
          (res as any).status(503).json({
            status: "starting",
            message: "Python FastAPI backend is initializing. Please retry in a moment."
          });
        }
      }
    }
  });

  app.use("/api", fastApiProxy);
  app.use("/docs", fastApiProxy);
  app.use("/redoc", fastApiProxy);
  app.use("/openapi.json", fastApiProxy);

  // Vite development middleware vs production static bundle
  if (process.env.NODE_ENV !== "production") {
    console.log("[Node] Initializing Vite middleware for SPA frontend...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Node] Serving production static build...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🚀 TowerTech Smart Society System is LIVE on port ${PORT}`);
    console.log(`🐍 Python FastAPI Backend running on http://127.0.0.1:${PYTHON_PORT}`);
    console.log(`📖 Interactive API Documentation available at /docs`);
    console.log(`====================================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("[Node] Shutting down servers...");
    if (pythonProcess) {
      pythonProcess.kill("SIGTERM");
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer();
