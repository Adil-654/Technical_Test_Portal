
import Subject from "../models/Subject.js";

export async function getSubjects(req, res, next) {
  try {
    const { search = "", active } = req.query;

    const filter = {};

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { code: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const subjects = await Subject.find(filter)
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubject(req, res, next) {
  try {
    const { name, code, description, category } = req.body;

    if (
      typeof name !== "string" ||
      typeof code !== "string" ||
      !name.trim() ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject name and code are required.",
      });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description,
      category,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      subject,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A subject with this name or code already exists.",
      });
    }

    next(error);
  }
}

export async function updateSubject(req, res, next) {
  try {
    const { name, code, description, category, isActive } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.isActive = isActive;

    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    res.json({
      success: true,
      message: "Subject updated successfully.",
      subject,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A subject with this name or code already exists.",
      });
    }

    next(error);
  }
}

export async function deleteSubject(req, res, next) {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    res.json({
      success: true,
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
