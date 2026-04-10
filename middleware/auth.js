const User = require("../models/User");

async function authRequired(req, res, next) {
  try {
    const userId = req.header("x-user-id");

    if (!userId) {
      return res.status(401).json({ message: "Missing x-user-id header" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid authentication context" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied for this role" });
    }

    return next();
  };
}

module.exports = { authRequired, requireRole };
