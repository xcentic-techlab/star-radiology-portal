
import jwt from 'jsonwebtoken'
import User from '../models/User.js';
import CenterStaff from '../models/CenterStaff.js';
import Admin from '../models/Admin.js'

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) return res.status(401).json({ ok: false, error: 'Admin not found' });
      req.user = { ...admin.toObject(), role: 'admin' };

    } else if (decoded.role === 'staff') {
      const staff = await CenterStaff.findById(decoded.id).select('-password');
      if (!staff) return res.status(401).json({ ok: false, error: 'Staff not found' });
      req.user = { ...staff.toObject(), role: 'staff', centerId: staff.centerId };

    } else {
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return res.status(401).json({ ok: false, error: 'User not found' });
  req.user = { ...user.toObject(), role: 'user' }; 
}

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ ok: false, error: 'Token invalid or expired' });
  }
};

export default protect ;