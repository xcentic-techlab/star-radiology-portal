import jwt from 'jsonwebtoken';
import CenterStaff from '../models/CenterStaff.js';
import Center from '../models/Center.js';
const generateToken = (id, role, centerId, name, centerName) => {
  return jwt.sign(
    { id, role, centerId, name, centerName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const staff = await CenterStaff.findOne({ email })
      .select('+password')
      .populate('centerId', 'centerName city isActive');

    console.log('LOGIN DEBUG:', {
      found: !!staff,
      isActive: staff?.isActive,
      centerPopulated: !!staff?.centerId,
      centerIsActive: staff?.centerId?.isActive,
    });

    if (!staff) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!staff.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is inactive' });
    }

    if (staff.centerId && staff.centerId.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your center is inactive' });
    }

    const isMatch = await staff.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(
      staff._id,
      staff.role,
      staff.centerId?._id,
      staff.name,
      staff.centerId?.centerName     
    );

    res.json({
      success: true,
      token,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        center: staff.centerId,
      },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    res.json({ success: true, data: req.staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, centerId, role } = req.body;

    if (!centerId) {
      return res.status(400).json({ success: false, message: 'centerId is required' });
    }

    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }
    if (!center.isActive) {
      return res.status(400).json({ success: false, message: 'Center is inactive' });
    }

    const exists = await CenterStaff.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const staff = await CenterStaff.create({
      name,
      email,
      password,
      phone: phone || '',
      centerId,
      role: role || 'staff',
    });

    const staffObj = staff.toObject();
    delete staffObj.password;

    res.status(201).json({ success: true, data: staffObj });
  } catch (err) {
    console.error('CREATE STAFF ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.centerId) filter.centerId = req.query.centerId;

    const staff = await CenterStaff.find(filter)
      .select('-password')
      .populate('centerId', 'centerName city')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await CenterStaff.countDocuments(filter);

    res.json({
      success: true,
      staff,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const staff = await CenterStaff.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('centerId', 'centerName city');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    if (password) {
      const staffDoc = await CenterStaff.findById(req.params.id);
      staffDoc.password = password;
      await staffDoc.save();
    }

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staff = await CenterStaff.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  loginStaff,
  getMe,
  createStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
};