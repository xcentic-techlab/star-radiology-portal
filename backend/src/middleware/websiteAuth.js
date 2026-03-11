import jwt from 'jsonwebtoken';
import CenterStaff from '../models/CenterStaff.js';

const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const protectAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    req.userRole = 'admin';
    req.userId = decoded.id;
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const protectCenterStaff = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    if (!['staff', 'admin'].includes(decoded.role)) {
      return res.status(403).json({ success: false, message: 'Staff access only' });
    }

    const staff = await CenterStaff.findById(decoded.id)
      .populate('centerId', 'centerName isActive'); 

    if (!staff || !staff.isActive) {
      return res.status(401).json({ success: false, message: 'Staff not found or inactive' });
    }

    if (!staff.centerId?.isActive) {
      return res.status(403).json({ success: false, message: 'Center is inactive' });
    }

    req.userRole = staff.role;
    req.staff = staff;
    req.centerId = staff.centerId._id; 
    req.userId = staff._id;

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

export const protectAdminOrCenterStaff = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    const role = decoded.role;

    if (role === 'admin' && !decoded.centerId) {
      req.userRole = 'admin';
      req.userId = decoded.id;
      req.admin = decoded;
      return next();
    }

    if (['staff', 'admin'].includes(role)) {
      const staff = await CenterStaff.findById(decoded.id)
        .populate('centerId', 'centerName isActive'); 

      if (!staff || !staff.isActive) {
        return res.status(401).json({ success: false, message: 'Staff not found or inactive' });
      }

      if (!staff.centerId?.isActive) {
        return res.status(403).json({ success: false, message: 'Center is inactive' });
      }

      req.userRole = role;
      req.staff = staff;
      req.centerId = staff.centerId._id; 
      req.userId = staff._id;
      return next();
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (err) {
    console.error('AUTH ERROR:', err.message);
    res.status(401).json({ success: false, message: err.message });
  }
};