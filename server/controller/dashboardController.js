
import User from "../models/User.js";
import Subject from "../models/Subject.js";

export async function getDashboardStats(req, res, next) {
  try {
    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalSubjects,
      recentStudents,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "student", isActive: false }),
      Subject.countDocuments(),
      User.find({ role: "student" })
        .select("name email studentId isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalSubjects,
      },
      recentStudents,
    });
  } catch (error) {
    next(error);
  }
}
