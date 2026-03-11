import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtp } from "../utils/smsMock.js";
import Patient from "../models/Patient.js";


dotenv.config();

const router = express.Router();

console.log("LOADED OTP FN:", generateOtp());

export const protectMobileUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id, mobile: decoded.mobile };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
};


function generateOtp() {
  return "123456"; 
}

console.log("LOADED OTP FN:", generateOtp());


async function handleOtpSend(mobile, userData = {}) {
  let user = await User.findOne({ mobile });
  if (!user && userData.createNew) {
    user = await User.create({
      mobile,
      fullName: userData.fullName,
      email: userData.email,
    });
  } else if (!user && !userData.createNew) {
    throw new Error("User not found. Please sign up first.");
  }

  const otpCode = generateOtp();
  const expiryMin = parseInt(process.env.OTP_EXPIRY_MIN || "5", 10);
  const expiresAt = new Date(Date.now() + expiryMin * 60 * 1000);

  await Otp.findOneAndUpdate(
    { mobile },
    { otp: otpCode, expiresAt },
    { upsert: true, new: true }
  );

  console.log("OTP Saved for:", mobile, "OTP:", otpCode);


  await sendOtp(mobile, otpCode);
  return expiresAt;
}


router.post("/signup", async (req, res) => {
  try {
    const { fullName, mobile, email } = req.body;

    if (!mobile) {
      return res.status(400).json({ ok: false, msg: "Mobile is required" });
    }

    if (!email) {
      return res.status(400).json({ ok: false, msg: "Email is required" });
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(200).json({
        ok: false,
        msg: "Email already registered. Please sign in.",
      });
    }
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(200).json({
        ok: false,
        msg: "Mobile number already registered. Please sign in.",
      });
    }

    const expiresAt = await handleOtpSend(mobile, {
      fullName,
      email,
      createNew: true,
    });

    return res.json({
      ok: true,
      msg: "OTP sent (mock)",
      expiresAt,
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(200).json({
          ok: false,
          msg: "Email already registered. Please sign in.",
        });
      }
      if (err.keyPattern?.mobile) {
        return res.status(200).json({
          ok: false,
          msg: "Mobile number already registered. Please sign in.",
        });
      }
    }

    return res.status(500).json({
      ok: false,
      msg: "Something went wrong. Please try again.",
    });
  }
});


router.post("/signin", async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(200).json({
        ok: false,
        msg: "Mobile number is required",
      });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(200).json({
        ok: false,
        msg: "Mobile number not registered. Please sign up.",
      });
    }

    const expiresAt = await handleOtpSend(mobile, { createNew: false });

    return res.json({
      ok: true,
      msg: "OTP sent (mock)",
      expiresAt,
    });

  } catch (err) {
    console.error("SIGNIN ERROR:", err);
    return res.status(500).json({
      ok: false,
      msg: "Something went wrong. Please try again.",
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ error: "mobile & otp required" });

    const record = await Otp.findOne({ mobile });
    if (!record)
      return res.status(400).json({ error: "No OTP requested for this number" });

    if (new Date() > record.expiresAt)
      return res.status(400).json({ error: "OTP expired" });

    if (record.otp !== otp)
      return res.status(400).json({ error: "Invalid OTP" });

    let user = await User.findOne({ mobile });
    if (!user)
      return res.status(400).json({ error: "User not found. Please sign up first." });

    const patient = await Patient.findOne({ "contact.phone": mobile });


    let role = patient ? "patient" : "user";
    const token = jwt.sign(
      { id: user._id, mobile: user.mobile, role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    await Otp.deleteOne({ mobile });

    return res.json({
      ok: true,
      token,
      role,
      user,
      isPatient: !!patient,
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
