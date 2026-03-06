import crypto from "crypto";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function corsOptions() {
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.corsAllowedOrigins.length === 0) return callback(null, true);
      if (config.corsAllowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("CORS_NOT_ALLOWED"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-Merchant-Id", "X-Store-Locale"],
    credentials: false,
    maxAge: 600,
  };
}

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", res.locals.requestId);
  next();
});

app.use(cors(corsOptions()));
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(
  express.urlencoded({ extended: false, limit: config.requestBodyLimit }),
);

app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use(
  "/widget",
  express.static(path.join(__dirname, "../public/widget"), { maxAge: "1h" }),
);
app.use(
  "/dashboard/assets",
  express.static(path.join(__dirname, "../public/dashboard"), {
    maxAge: "10m",
  }),
);

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard/index.html"));
});

app.get("/", (_req, res) => {
  res.json({
    app: "Countdown Growth for Salla",
    docs: "/docs",
    dashboard: "/dashboard?merchantId=demo-merchant",
    health: "/api/health",
  });
});

app.get("/docs", (_req, res) => {
  res.redirect("/dashboard?merchantId=demo-merchant");
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "المسار المطلوب غير موجود.",
    },
    requestId: res.locals.requestId,
  });
});

app.use((error, _req, res, _next) => {
  const status =
    error.status || (error.message === "CORS_NOT_ALLOWED" ? 403 : 500);
  const code =
    error.code ||
    (error.message === "CORS_NOT_ALLOWED"
      ? "CORS_NOT_ALLOWED"
      : "INTERNAL_ERROR");
  const message = error.status ? error.message : "حدث خطأ غير متوقع.";

  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details: error.details || null,
    },
    requestId: res.locals.requestId,
  });
});

app.listen(config.port, () => {
  console.log(`Countdown app listening on http://localhost:${config.port}`);
});
