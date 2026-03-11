import jwt from "jsonwebtoken";

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ ok: false, error: "Admin access required" });
};

export const staffOnly = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin")) {
    if (req.user.role === "staff" && !req.user.centerId) {
      return res
        .status(403)
        .json({ ok: false, error: "Staff not assigned to any center" });
    }
    return next();
  }
  return res.status(403).json({ ok: false, error: "Staff access required" });
};

export const adminOrStaff = (req, res, next) => {
  if (req.user && ["admin", "staff"].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ ok: false, error: "Access denied" });
};


export default { adminOnly, staffOnly, adminOrStaff };