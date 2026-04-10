const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);

router.post("/create", requireRole("chief"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").trim();
    const room = String(req.body.room || "").trim();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    if (!["staff", "guard", "warden", "chief"].includes(role)) {
      return res.status(400).json({ message: "Chief can only create admin-side users" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: passwordHash, role, room });

    return res.status(201).json({
      message: "User created successfully",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, room: user.room }
    });
  } catch (error) {
    return res.status(500).json({ message: "User creation failed", error: error.message });
  }
});

router.get("/", requireRole("chief"), async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

router.get("/directory/staff", requireRole("warden", "chief"), async (_req, res) => {
  try {
    const users = await User.find({ role: "staff" }).select("name email room role").sort({ name: 1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch staff directory", error: error.message });
  }
});

router.get("/directory/overview", requireRole("chief"), async (_req, res) => {
  try {
    const users = await User.find().select("name email room role createdAt").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch directory overview", error: error.message });
  }
});

router.delete("/:id", requireRole("chief"), async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: "Chief cannot delete the currently logged-in profile" });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id).select("name email role");

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User deleted successfully",
      user: deletedUser
    });
  } catch (error) {
    return res.status(500).json({ message: "User deletion failed", error: error.message });
  }
});

router.get("/profile", async (req, res) => res.json(req.user));

router.put("/profile", async (req, res) => {
  try {
    const updates = {};
    ["name", "room"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = String(req.body[field]).trim();
      }
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    return res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Profile update failed", error: error.message });
  }
});

module.exports = router;
