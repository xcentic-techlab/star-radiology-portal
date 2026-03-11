import Center from '../models/Center.js';
import CenterStaff from '../models/CenterStaff.js';

const getAllCenters = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const centers = await Center.find(filter).sort({ city: 1, centerName: 1 });

    res.json({ success: true, count: centers.length, centers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCenterById = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }
    res.json({ success: true, data: center });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createCenter = async (req, res) => {
  try {
    const {
      centerName,
      address, city, state, pincode,
      phone, email, googleMapsLink,
      latitude, longitude, isActive
    } = req.body;

    if (!centerName) {
      return res.status(400).json({
        success: false,
        message: "Center name is required",
      });
    }

    const center = await Center.create({
      centerName,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      googleMapsLink,
      isActive: isActive ?? true,
      location: {
        type: "Point",
        coordinates: [
          Number(longitude) || 0,
          Number(latitude) || 0,
        ],
      },
    });

    res.status(201).json({ success: true, data: center });
  } catch (err) {
    console.error("CREATE CENTER ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCenter = async (req, res) => {
  try {
    const { latitude, longitude, ...rest } = req.body;
    const updateData = { ...rest };

    if (latitude !== undefined && longitude !== undefined) {
      updateData.location = { type: 'Point', coordinates: [longitude, latitude] };
    }

    const center = await Center.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    res.json({ success: true, data: center });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCenter = async (req, res) => {
  try {
    const center = await Center.findByIdAndDelete(req.params.id);

    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    await CenterStaff.updateMany({ center: req.params.id }, { isActive: false });

    res.json({ success: true, message: 'Center deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCenterStaffList = async (req, res) => {
  try {
    const staff = await CenterStaff.find({ center: req.params.id })
      .select('-password')
      .populate('center', 'centerName city'); 

    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllCentersAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const centers = await Center.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Center.countDocuments();

    res.json({
      success: true,
      centers,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  getAllCenters,
  getCenterById,
  createCenter,
  updateCenter,
  deleteCenter,
  getCenterStaffList,
  getAllCentersAdmin
};