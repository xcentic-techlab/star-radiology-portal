import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/", (req, res) => {
  const { email, password } = req.body;

  if (email !== "admin@xstar.com" || password !== "Admin@123") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: "super-admin",
      role: "admin",
      email,
      name: "Super Admin",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

export default router;