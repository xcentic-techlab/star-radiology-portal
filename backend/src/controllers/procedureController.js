import Procedure from "../models/Procedure.js";
const generateCode = (name) =>
  name.trim().toUpperCase().replace(/\s+/g, "");
const getAllProcedures = async (req, res) => {
  try {
    const filter =
      req.query.includeInactive === "true" ? {} : { isActive: true };

    const procedures = await Procedure.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      count: procedures.length,
      data: procedures,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProcedureById = async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id);
    if (!procedure) {
      return res
        .status(404)
        .json({ success: false, message: "Procedure not found" });
    }
    res.json({ success: true, data: procedure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createProcedure = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      priceRange,
      preparationInstructions,
      isActive = true,
    } = req.body;

    if (!name || !category) {
      return res
        .status(400)
        .json({ ok: false, error: "Name and category required" });
    }

    const code = generateCode(name);
    const exists = await Procedure.findOne({ code });
    if (exists) {
      return res
        .status(409)
        .json({ ok: false, error: "Procedure already exists" });
    }

    const procedure = await Procedure.create({
      name,
      code,
      category,
      description,
      priceRange,
      preparationInstructions,
      isActive,
    });

    res.json({ ok: true, procedure });
  } catch (err) {
    console.error("CREATE PROCEDURE ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

const updateProcedure = async (req, res) => {
  try {
    const procedure = await Procedure.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!procedure) {
      return res
        .status(404)
        .json({ success: false, message: "Procedure not found" });
    }

    res.json({ success: true, data: procedure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteProcedure = async (req, res) => {
  try {
    const procedure = await Procedure.findByIdAndDelete(req.params.id);

    if (!procedure) {
      return res.status(404).json({ success: false, message: "Procedure not found" });
    }

    res.json({ success: true, message: "Procedure deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
const getAllProceduresAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [procedures, total] = await Promise.all([
      Procedure.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Procedure.countDocuments(),
    ]);

    res.json({
      success: true,
      procedures,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default {
  getAllProcedures,
  getProcedureById,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  getAllProceduresAdmin,
};