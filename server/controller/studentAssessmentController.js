
import mongoose from "mongoose";
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import Question from "../models/Question.js";

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function isWithinSchedule(test, now = new Date()) {
  if (test.startAt && now < new Date(test.startAt)) {
    return false;
  }

  if (test.endAt && now > new Date(test.endAt)) {
    return false;
  }

  return true;
}

// Never send correctOption or explanations to the student.
function toStudentAttempt(attempt) {
  return {
    id: String(attempt._id),
    _id: String(attempt._id),
    test: attempt.test,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    totalMarks: attempt.totalMarks,
    score: attempt.score,
    percentage: attempt.percentage,
    answers: (attempt.answers || []).map((answer) => ({
      question: answer.question,
      questionText: answer.questionText,
      options: (answer.options || []).map((option) => ({
        text: option.text,
      })),
      marks: answer.marks,
      selectedOption: answer.selectedOption,
    })),
  };
}

function gradeAttempt(attempt, status = "submitted") {
  let score = 0;

  for (const answer of attempt.answers || []) {
    if (
      answer.selectedOption !== null &&
      answer.selectedOption !== undefined &&
      answer.selectedOption === answer.correctOption
    ) {
      score += Number(answer.marks) || 0;
    }
  }

  attempt.score = score;
  attempt.percentage =
    Number(attempt.totalMarks) > 0
      ? Number(((score / attempt.totalMarks) * 100).toFixed(2))
      : 0;

  attempt.status = status;
  attempt.submittedAt = new Date();
}

async function findStudentAttempt(attemptId, studentId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    return null;
  }

  return TestAttempt.findOne({
    _id: attemptId,
    student: studentId,
  }).select("+answers.correctOption");
}

/* ==================== LIST PUBLISHED ASSESSMENTS ==================== */

export async function getAvailableTests(req, res, next) {
  try {
    const studentId = req.user._id;
    const now = new Date();

    const tests = await Test.find({
      status: "published",
    })
      .select(
        "title name description subject durationMinutes totalMarks startAt endAt attemptsAllowed questions status createdAt"
      )
      .populate("subject", "name code")
      .sort({ createdAt: -1 })
      .lean();

    const testIds = tests.map((test) => test._id);

    const attempts = testIds.length
      ? await TestAttempt.find({
          student: studentId,
          test: { $in: testIds },
        })
          .select("test attemptNumber status expiresAt startedAt")
          .sort({ attemptNumber: -1 })
          .lean()
      : [];

    const attemptsByTest = new Map();

    for (const attempt of attempts) {
      const key = String(attempt.test);

      if (!attemptsByTest.has(key)) {
        attemptsByTest.set(key, []);
      }

      attemptsByTest.get(key).push(attempt);
    }

    const result = tests.map((test) => {
      const studentAttempts =
        attemptsByTest.get(String(test._id)) || [];

      const inProgressAttempt = studentAttempts.find(
        (attempt) => attempt.status === "in_progress"
      );

      const completedAttempts = studentAttempts.filter(
        (attempt) =>
          attempt.status === "submitted" ||
          attempt.status === "expired"
      ).length;

      const startsInFuture =
        Boolean(test.startAt) && now < new Date(test.startAt);

      const hasEnded =
        Boolean(test.endAt) && now > new Date(test.endAt);

      const attemptsAllowed = Number(test.attemptsAllowed ?? 1);

      const attemptsRemaining = Math.max(
        0,
        attemptsAllowed - completedAttempts
      );

      const canResume =
        Boolean(inProgressAttempt) &&
        inProgressAttempt.expiresAt &&
        new Date(inProgressAttempt.expiresAt) > now &&
        !hasEnded;

      const isAvailable =
        !startsInFuture &&
        !hasEnded &&
        attemptsRemaining > 0;

      return {
        _id: String(test._id),
        id: String(test._id),
        title: test.title || test.name || "Untitled assessment",
        name: test.name || test.title || "Untitled assessment",
        description: test.description || "",
        subject: test.subject || null,
        durationMinutes: Number(test.durationMinutes) || 0,
        totalMarks: Number(test.totalMarks) || 0,
        questionCount: Array.isArray(test.questions)
          ? test.questions.length
          : 0,
        questions: Array.isArray(test.questions)
          ? test.questions
          : [],
        startAt: test.startAt || null,
        endAt: test.endAt || null,
        attemptsAllowed,
        attemptsUsed: completedAttempts,
        attemptsRemaining,
        startsInFuture,
        hasEnded,
        isAvailable: Boolean(isAvailable || canResume),
        inProgressAttemptId: canResume
          ? String(inProgressAttempt._id)
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      tests: result,
    });
  } catch (error) {
    console.error("getAvailableTests error:", error);
    return next(error);
  }
}

/* ==================== START OR RESUME ASSESSMENT ==================== */

export async function startTestAttempt(req, res, next) {
  try {
    const { testId } = req.params;
    const studentId = req.user._id;

    if (!mongoose.isValidObjectId(testId)) {
      return sendError(res, 400, "Invalid assessment ID.");
    }

    const test = await Test.findOne({
      _id: testId,
      status: "published",
    })
      .select(
        "title subject questions durationMinutes totalMarks startAt endAt attemptsAllowed"
      )
      .populate("subject", "name code");

    if (!test) {
      return sendError(res, 404, "Published assessment not found.");
    }

    const now = new Date();

    if (!isWithinSchedule(test, now)) {
      return sendError(
        res,
        400,
        "This assessment is outside its scheduled availability."
      );
    }

    const existingAttempt = await TestAttempt.findOne({
      student: studentId,
      test: test._id,
      status: "in_progress",
    }).select("+answers.correctOption");

    if (existingAttempt) {
      if (now >= existingAttempt.expiresAt) {
        gradeAttempt(existingAttempt, "expired");
        await existingAttempt.save();

        return res.status(200).json({
          success: true,
          message: "Your attempt has expired.",
          attempt: toStudentAttempt(existingAttempt),
        });
      }

      return res.status(200).json({
        success: true,
        message: "Resuming your existing attempt.",
        attempt: toStudentAttempt(existingAttempt),
      });
    }

    const attemptsAllowed = Number(test.attemptsAllowed ?? 1);

    const completedAttempts = await TestAttempt.countDocuments({
      student: studentId,
      test: test._id,
      status: { $in: ["submitted", "expired"] },
    });

    if (completedAttempts >= attemptsAllowed) {
      return sendError(
        res,
        403,
        "You have used all attempts allowed for this assessment."
      );
    }

    if (!test.subject?._id) {
      return sendError(
        res,
        409,
        "This assessment has no valid subject. Please contact your administrator."
      );
    }

    const questionIds = Array.isArray(test.questions)
      ? test.questions
      : [];

    if (questionIds.length === 0) {
      return sendError(
        res,
        409,
        "This assessment has no questions."
      );
    }

    const questions = await Question.find({
      _id: { $in: questionIds },
      subject: test.subject._id,
      isActive: true,
    }).select("questionText options correctOption marks");

    const questionMap = new Map(
      questions.map((question) => [
        String(question._id),
        question,
      ])
    );

    const orderedQuestions = questionIds.map((id) =>
      questionMap.get(String(id))
    );

    if (
      orderedQuestions.length === 0 ||
      orderedQuestions.some((question) => !question)
    ) {
      return sendError(
        res,
        409,
        "Some assessment questions are missing, inactive, or assigned to another subject."
      );
    }

    const totalMarks = orderedQuestions.reduce(
      (sum, question) => sum + (Number(question.marks) || 0),
      0
    );

    const durationMinutes = Number(test.durationMinutes);

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return sendError(
        res,
        409,
        "This assessment has an invalid duration."
      );
    }

    const expiresAt = new Date(
      now.getTime() + durationMinutes * 60 * 1000
    );

    if (test.endAt && new Date(test.endAt) < expiresAt) {
      expiresAt.setTime(new Date(test.endAt).getTime());
    }

    if (expiresAt <= now) {
      return sendError(
        res,
        400,
        "There is not enough time remaining to start this assessment."
      );
    }

    const attempt = await TestAttempt.create({
      student: studentId,
      test: test._id,
      attemptNumber: completedAttempts + 1,
      startedAt: now,
      expiresAt,
      totalMarks,
      answers: orderedQuestions.map((question) => ({
        question: question._id,
        questionText: question.questionText,
        options: (question.options || []).map((option) => ({
          text: option.text,
        })),
        marks: Number(question.marks) || 0,
        correctOption: question.correctOption,
        selectedOption: null,
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Assessment started successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    console.error("startTestAttempt error:", error);
    return next(error);
  }
}

/* ==================== GET ATTEMPT ==================== */

export async function getTestAttempt(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Assessment attempt not found.");
    }

    if (
      attempt.status === "in_progress" &&
      new Date() >= attempt.expiresAt
    ) {
      gradeAttempt(attempt, "expired");
      await attempt.save();
    }

    return res.status(200).json({
      success: true,
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    console.error("getTestAttempt error:", error);
    return next(error);
  }
}

/* ==================== SAVE ANSWERS ==================== */

function validateAnswers(answers, attempt) {
  if (!Array.isArray(answers)) {
    return "Answers must be an array.";
  }

  const seenQuestions = new Set();

  for (const submittedAnswer of answers) {
    if (
      !submittedAnswer ||
      !mongoose.isValidObjectId(submittedAnswer.questionId)
    ) {
      return "Invalid question in submitted answers.";
    }

    const questionId = String(submittedAnswer.questionId);

    if (seenQuestions.has(questionId)) {
      return "Duplicate questions were included in the answers.";
    }

    seenQuestions.add(questionId);

    const answer = attempt.answers.find(
      (item) => String(item.question) === questionId
    );

    if (!answer) {
      return "An answer refers to a question outside this attempt.";
    }

    const selectedOption = submittedAnswer.selectedOption;

    if (
      selectedOption !== null &&
      (!Number.isInteger(selectedOption) ||
        selectedOption < 0 ||
        selectedOption >= answer.options.length)
    ) {
      return "A selected option is invalid.";
    }
  }

  return null;
}

function applyAnswers(answers, attempt) {
  for (const submittedAnswer of answers) {
    const answer = attempt.answers.find(
      (item) =>
        String(item.question) === String(submittedAnswer.questionId)
    );

    answer.selectedOption = submittedAnswer.selectedOption;
  }
}

export async function saveTestAnswers(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Assessment attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      return sendError(
        res,
        409,
        "This attempt is no longer accepting answers."
      );
    }

    if (new Date() >= attempt.expiresAt) {
      gradeAttempt(attempt, "expired");
      await attempt.save();

      return res.status(409).json({
        success: false,
        message: "Time is up. Your attempt has been finalized.",
        attempt: toStudentAttempt(attempt),
      });
    }

    const { answers } = req.body || {};
    const validationError = validateAnswers(answers, attempt);

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    applyAnswers(answers, attempt);
    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Answers saved successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    console.error("saveTestAnswers error:", error);
    return next(error);
  }
}

/* ==================== SUBMIT ATTEMPT ==================== */

export async function submitTestAttempt(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Assessment attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      return res.status(200).json({
        success: true,
        message: "This attempt has already been finalized.",
        attempt: toStudentAttempt(attempt),
      });
    }

    const expired = new Date() >= attempt.expiresAt;
    const answers = req.body?.answers;

    if (!expired && answers !== undefined) {
      const validationError = validateAnswers(answers, attempt);

      if (validationError) {
        return sendError(res, 400, validationError);
      }

      applyAnswers(answers, attempt);
    }

    gradeAttempt(attempt, expired ? "expired" : "submitted");
    await attempt.save();

    return res.status(200).json({
      success: true,
      message: expired
        ? "Time expired. Previously saved answers have been finalized."
        : "Assessment submitted successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    console.error("submitTestAttempt error:", error);
    return next(error);
  }
}
