import User from '../models/User.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.json({ ok: false, message: 'User not found' });

    return res.json({
      ok: true,
      data: {
        id: user._id,
        name: user.fullName ?? '',
        email: user.email ?? '',
        phone: user.mobile ?? '',
        profile_pic_url: user.avatar
          ? `${req.protocol}://${req.get('host')}/uploads/${user.avatar}`
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user._id;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return res.json({ ok: false, message: 'Email already in use' });
      }
    }

    const updateData = {};
    if (name)  updateData.fullName = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();

    if (req.file) {
      const oldUser = await User.findById(userId);
      if (oldUser?.avatar) {
        const oldPath = path.join(__dirname, '../../uploads', oldUser.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.avatar = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    return res.json({
      ok: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.fullName ?? '',
        email: updatedUser.email ?? '',
        phone: updatedUser.mobile ?? '',
        profile_pic_url: updatedUser.avatar
          ? `${req.protocol}://${req.get('host')}/uploads/${updatedUser.avatar}`
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};