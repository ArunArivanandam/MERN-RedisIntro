const express = require("express");
const cors = require("cors");
const path = require("path");

const userRouter = require("./routes/userRouter");
const postRoutes = require("./routes/postRoutes");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ── Static files — serves uploaded avatars at /avatars/<filename> ─────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users", userRouter);
app.use("/api/posts", postRoutes);
// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

module.exports = app;
