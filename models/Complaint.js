const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, trim: true },
    issue: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Assigned", "In Progress", "Completed", "Rejected"],
      default: "Pending"
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
