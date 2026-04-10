const mongoose = require("mongoose");

const roles = ["student", "staff", "guard", "warden", "chief"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: roles, required: true, default: "student" },
    room: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
