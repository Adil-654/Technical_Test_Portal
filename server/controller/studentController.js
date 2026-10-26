
import User from "../models/User.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getStudents(req, res, next) {
  try {
    const { search = "", status } = req.query;
    const filter = { role: "student" };

    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");

      filter.$or = [
        { name: pattern },
        { email: pattern },
        { studentId: pattern },
      ];
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const students = await User.find(filter)
      .select("name email studentId isActive createdAt updatedAt")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
}

export async function createStudent(req, res, next) {
  try {
    const { name, email, studentId, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof studentId !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !studentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, student ID and password are required.",
      });
    }

    if (
      name.trim().length > 100 ||
      email.trim().length > 254 ||
      studentId.trim().length > 50 ||
      password.length < 12 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Check the field lengths. Password must contain 12–128 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim().toUpperCase();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { studentId: normalizedStudentId },
      ],
    }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      studentId: normalizedStudentId,
      password,
      role: "student",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        isActive: student.isActive,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    next(error);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const { name, email, studentId, isActive } = req.body ?? {};

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid student name.",
        });
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim() ||
        email.trim().length > 254
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email.",
        });
      }
      updates.email = email.trim().toLowerCase();
    }

    if (studentId !== undefined) {
      if (
        typeof studentId !== "string" ||
        !studentId.trim() ||
        studentId.trim().length > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid student ID.",
        });
      }
      updates.studentId = studentId.trim().toUpperCase();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }
      updates.isActive = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update.",
      });
    }

    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: "student" },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("name email studentId isActive createdAt updatedAt");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully.",
      student,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    next(error);
  }
}
