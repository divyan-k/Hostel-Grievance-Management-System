const express = require("express");
const Leave = require("../models/Leave");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);

router.post("/", requireRole("student"), async (req, res) => {
  try {
    const reason = String(req.body.reason || "").trim();
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({ message: "Reason, fromDate, and toDate are required" });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ message: "From date cannot be after to date" });
    }

    const leave = await Leave.create({ studentId: req.user._id, reason, fromDate, toDate });
    return res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    return res.status(500).json({ message: "Leave request failed", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "student") query.studentId = req.user._id;

    const leaves = await Leave.find(query)
      .populate("studentId", "name email room")
      .populate("approvedBy", "name role")
      .sort({ createdAt: -1 });

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch leaves", error: error.message });
  }
});

router.put("/:id", requireRole("guard"), async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    await leave.save();

    return res.json({ message: "Leave request updated", leave });
  } catch (error) {
    return res.status(500).json({ message: "Leave update failed", error: error.message });
  }
});

module.exports = router;
