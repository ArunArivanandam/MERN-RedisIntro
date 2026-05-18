const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username must be at most 20 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned by default
    },
    avatar: {
      type: String,
      default: null, // stores public path e.g. /avatars/avatar-uuid.webp
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    tokenVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

// ── Hash password before save ─────────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// ── Instance method: verify password ─────────────────────────────────────────
userSchema.methods.verifyPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Strip sensitive fields from JSON output ───────────────────────────────────
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
