const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// ── Ensure avatars directory exists ──────────────────────────────────────────
const AVATARS_DIR = path.join(__dirname, "../public/avatars");
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

// ── Helper: sign JWT ──────────────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

// ── POST /api/users/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({ userName, email, password });
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/users/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await user.verifyPassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    // Return user without password (toJSON strips it)
    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/users/logout ────────────────────────────────────────────────────
// Increment tokenVersion → all existing JWTs for this user become invalid
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/users/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/users/me/avatar ─────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete previous avatar from disk
    if (user.avatar) {
      const oldPath = path.join(__dirname, "../public", user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const filename = `avatar-${uuidv4()}.webp`;
    const outputPath = path.join(AVATARS_DIR, filename);

    // Resize to 256×256 square, convert to WebP
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const avatarUrl = `/avatars/${filename}`;
    user.avatar = avatarUrl;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Avatar updated", avatar: avatarUrl, user });
  } catch (err) {
    console.error("Avatar upload error:", err.message);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
};

// ── Middleware: isAuth ────────────────────────────────────────────────────────
exports.isAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Check tokenVersion to invalidate old tokens after logout
    const user = await User.findById(decoded.id).select("tokenVersion");
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    req.userId = decoded.id;
    req.isAdmin = decoded.role === "admin";
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
