
import TestAttempt from "../models/TestAttempt.js";

export async function getStudentResults(req, res, next) {
  try {
    const attempts = await TestAttempt.find({
      student: req.user._id,
      status: { $in: ["submitted", "expired"] },
      submittedAt: { $ne: null },
    })
      .select(
        "test attemptNumber status score percentage totalMarks submittedAt answers"
      )
      .populate({
        path: "test",
        select: "title subject",
        populate: {
          path: "subject",
          select: "name code",
        },
      })
      .sort({ submittedAt: -1 })
      .lean();

    const results = attempts.map((attempt) => ({
      id: String(attempt._id),
      testId: attempt.test?._id
        ? String(attempt.test._id)
        : null,
      testTitle: attempt.test?.title || "Assessment",
      subjectName: attempt.test?.subject?.name || "Subject",
      subjectCode: attempt.test?.subject?.code || "",
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      score: attempt.score ?? 0,
      totalMarks: attempt.totalMarks ?? 0,
      percentage: attempt.percentage ?? 0,
      questionCount: attempt.answers?.length ?? 0,
      submittedAt: attempt.submittedAt,
    }));

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
}
