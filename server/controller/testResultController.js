
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";

const getTestResults = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id).lean();

    if (!test) {
      return res.status(404).json({
        message: "Test not found",
      });
    }

    const attempts = await TestAttempt.find({
      test: id,
      status: "submitted",
    })
      .populate("student", "name email studentId")
      .sort({ submittedAt: -1 })
      .lean();

    const students = attempts.map((attempt) => ({
      attemptId: attempt._id,
      studentName: attempt.student?.name || "Unknown student",
      studentId: attempt.student?.studentId || "",
      email: attempt.student?.email || "",
      marksObtained: attempt.score ?? 0,
      totalMarks: attempt.totalMarks,
      percentage:
        attempt.percentage ??
        (attempt.totalMarks > 0
          ? Number(
              ((attempt.score ?? 0) / attempt.totalMarks * 100).toFixed(2)
            )
          : 0),
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
    }));

    const uniqueStudents = new Set(
      attempts.map((attempt) => String(attempt.student?._id || attempt.student))
    );

    return res.status(200).json({
      test: {
        _id: test._id,
        title: test.title,
        subject: test.subject,
      },
      totalAttempts: attempts.length,
      uniqueStudentsAttempted: uniqueStudents.size,
      students,
    });
  } catch (error) {
    console.error("Get test results error:", error);

    return res.status(500).json({
      message: "Failed to fetch test results",
      error: error.message,
    });
  }
};

export default { getTestResults };
