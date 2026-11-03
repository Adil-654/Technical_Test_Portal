
import TestAttempt from "../models/TestAttempt.js";

export async function getStudentResults(req, res, next) {
  try {
    // Fetch only attempts that were actually submitted or expired.
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
        select: "title subject status",
        populate: {
          path: "subject",
          select: "name code",
        },
      })
      .sort({ submittedAt: -1 })
      .lean();

    // Keep only attempts whose test still exists and is published.
    // Deleted tests populate as null.
    // Draft and closed tests are excluded.
  const validAttempts = attempts.filter(
  (attempt) =>
    attempt.test &&
    typeof attempt.test.title === "string" &&
    attempt.test.title.trim() !== ""
);

    // Each record represents one actual attempt.
    const results = validAttempts.map((attempt) => ({
      id: String(attempt._id),
      testId: String(attempt.test._id),
      testTitle: attempt.test.title.trim(),

      subjectName: attempt.test.subject?.name || "",
      subjectCode: attempt.test.subject?.code || "",

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
