const express = require("express");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);

router.post("/", requireRole("student"), async (req, res) => {
  try {
    const category = String(req.body.category || "").trim();
    const issue = String(req.body.issue || "").trim();
    if (!category || !issue) {
      return res.status(400).json({ message: "Category and issue are required" });
    }

    const complaint = await Complaint.create({ studentId: req.user._id, category, issue });
    return res.status(201).json({ message: "Complaint submitted", complaint });
  } catch (error) {
    return res.status(500).json({ message: "Complaint creation failed", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "student") query.studentId = req.user._id;
    if (req.user.role === "staff") query.assignedTo = req.user._id;

    const complaints = await Complaint.find(query)
      .populate("studentId", "name email room")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    const now = Date.now();
    const enriched = complaints.map((complaint) => {
      const raw = complaint.toObject();
      return {
        ...raw,
        isOverdue:
          req.user.role === "chief" &&
          raw.status !== "Completed" &&
          now - new Date(raw.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch complaints", error: error.message });
  }
});

router.put("/:id/assign", requireRole("warden"), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo is required" });
    }

    const assignee = await User.findById(assignedTo);
    if (!assignee || assignee.role !== "staff") {
      return res.status(400).json({ message: "Complaint can only be assigned to staff" });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: "Assigned" },
      { new: true }
    )
      .populate("studentId", "name email room")
      .populate("assignedTo", "name email role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    return res.json({ message: "Complaint assigned", complaint });
  } catch (error) {
    return res.status(500).json({ message: "Assignment failed", error: error.message });
  }
});

router.put("/:id/status", requireRole("staff", "warden", "chief"), async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    const allowedStatuses = ["Assigned", "In Progress", "Completed", "Rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (req.user.role === "staff" && String(complaint.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: "Staff can only update assigned complaints" });
    }

    complaint.status = status;
    await complaint.save();
    return res.json({ message: "Complaint status updated", complaint });
  } catch (error) {
    return res.status(500).json({ message: "Status update failed", error: error.message });
  }
});

router.put("/:id/override", requireRole("chief"), async (req, res) => {
  try {
    const status = req.body.status ? String(req.body.status).trim() : "";
    const assignedTo = req.body.assignedTo;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (status) {
      const allowedStatuses = ["Pending", "Assigned", "In Progress", "Completed", "Rejected"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid override status" });
      }

      complaint.status = status;
    }
    if (assignedTo !== undefined) complaint.assignedTo = assignedTo || null;
    await complaint.save();

    return res.json({ message: "Complaint override applied", complaint });
  } catch (error) {
    return res.status(500).json({ message: "Override failed", error: error.message });
  }
});

module.exports = router;
