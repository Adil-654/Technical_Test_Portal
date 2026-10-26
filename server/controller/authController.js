
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const COOKIE_NAME = "ttp_token";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
  }

  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}


export async function login(req, res) {
  try {
    const { email, password, role } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      password.length > 128 ||
      !["admin", "student"].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email, password, and role.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (
      !user ||
      !user.isActive ||
      user.role !== role ||
      !(await user.comparePassword(password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email, password, or account type.",
      });
    }

    const token = createToken(user._id.toString());

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.json({
      success: true,
      message: "Login successful.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
}


export async function getMe(req, res) {
  return res.json({
    success: true,
    user: formatUser(req.user),
  });
}

export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
  });

  return res.json({
    success: true,
    message: "Logged out successfully.",
  });
}


export async function registerStudent(req, res) {
  try {
    const { name, studentId, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof studentId !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    const cleanName = name.trim();
    const cleanStudentId = studentId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanName ||
      cleanName.length > 100 ||
      !cleanStudentId ||
      cleanStudentId.length > 50 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanEmail.length > 254 ||
      password.length < 12 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid details. Password must contain at least 12 characters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { studentId: cleanStudentId },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    const student = await User.create({
      name: cleanName,
      studentId: cleanStudentId,
      email: cleanEmail,
      password,
      role: "student",
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please log in.",
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        role: student.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    console.error("Student registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to register right now.",
    });
  }
}
