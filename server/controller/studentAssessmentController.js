
import mongoose from "mongoose";
import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import Question from "../models/Question.js";

// Return a consistent API error response.
function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// Determine whether a published test is currently within its schedule.
function isWithinSchedule(test, now = new Date()) {
  if (test.startAt && now < new Date(test.startAt)) {
    return false;
  }

  if (test.endAt && now > new Date(test.endAt)) {
    return false;
  }

  return true;
}

// Never return the answer key or explanation to the student.
function toStudentAttempt(attempt) {
  return {
    id: attempt._id,
    test: attempt.test,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    totalMarks: attempt.totalMarks,
    score: attempt.score,
    percentage: attempt.percentage,
    answers: attempt.answers.map((answer) => ({
      question: answer.question,
      questionText: answer.questionText,
      options: answer.options.map((option) => ({
        text: option.text,
      })),
      marks: answer.marks,
      selectedOption: answer.selectedOption,
    })),
  };
}

// Calculate score using the answer key stored in MongoDB.
function gradeAttempt(attempt, status = "submitted") {
  let score = 0;

  for (const answer of attempt.answers) {
    if (answer.selectedOption === answer.correctOption) {
      score += answer.marks;
    }
  }

  attempt.score = score;
  attempt.percentage =
    attempt.totalMarks > 0
      ? Number(((score / attempt.totalMarks) * 100).toFixed(2))
      : 0;

  attempt.status = status;
  attempt.submittedAt = new Date();
}

// Load an attempt belonging to the logged-in student.
// Explicitly select the answer key for server-side grading only.
async function findStudentAttempt(attemptId, studentId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    return null;
  }

  return TestAttempt.findOne({
    _id: attemptId,
    student: studentId,
  }).select("+answers.correctOption");
}

/* ==================== List Published Tests ==================== */


export async function getAvailableTests(req, res, next) {
  try {
    const now = new Date();
    const studentId = req.user._id;

    // Return every published test, including upcoming and ended tests.
    const tests = await Test.find({ status: "published" })
      .select(
        "title description subject durationMinutes totalMarks startAt endAt attemptsAllowed questions status createdAt"
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
          .select("test attemptNumber status expiresAt")
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

      const withinSchedule = !startsInFuture && !hasEnded;

      const attemptsRemaining = Math.max(
        0,
        test.attemptsAllowed - completedAttempts
      );

      // A saved attempt may be resumed only if its deadline has not passed.
      const canResume =
        Boolean(inProgressAttempt) &&
        new Date(inProgressAttempt.expiresAt) > now;

      const isAvailable =
        withinSchedule &&
        attemptsRemaining > 0;

      return {
        id: String(test._id),
        title: test.title,
        description: test.description,
        subject: test.subject,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        questionCount: test.questions.length,
        startAt: test.startAt,
        endAt: test.endAt,
        attemptsAllowed: test.attemptsAllowed,
        attemptsUsed: completedAttempts,
        attemptsRemaining,
        startsInFuture,
        hasEnded,
        isAvailable: isAvailable || canResume,
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
    next(error);
  }
}


/* ==================== Start or Resume an Attempt ==================== */

export async function startTestAttempt(req, res, next) {
  try {
    const { testId } = req.params;
    const studentId = req.user._id;

    if (!mongoose.isValidObjectId(testId)) {
      return sendError(res, 400, "Invalid test ID.");
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
      return sendError(res, 404, "Published test not found.");
    }

    const now = new Date();

    if (!isWithinSchedule(test, now)) {
      return sendError(
        res,
        400,
        "This test is not currently available."
      );
    }

    // Resume an existing attempt rather than creating a duplicate.
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

    const completedAttempts = await TestAttempt.countDocuments({
      student: studentId,
      test: test._id,
      status: { $in: ["submitted", "expired"] },
    });

    if (completedAttempts >= test.attemptsAllowed) {
      return sendError(
        res,
        403,
        "You have used all attempts allowed for this test."
      );
    }

    // Load the question records from the database, not the browser.
    const questionIds = test.questions.map(String);

    const questions = await Question.find({
      _id: { $in: test.questions },
      subject: test.subject._id,
      isActive: true,
    }).select("questionText options correctOption marks");

    const questionMap = new Map(
      questions.map((question) => [
        String(question._id),
        question,
      ])
    );

    // Preserve the order selected by the administrator.
    const orderedQuestions = questionIds.map((id) =>
      questionMap.get(id)
    );

    if (
      orderedQuestions.length === 0 ||
      orderedQuestions.some((question) => !question)
    ) {
      return sendError(
        res,
        409,
        "Some questions in this test are unavailable. Please contact your administrator."
      );
    }

    const totalMarks = orderedQuestions.reduce(
      (sum, question) => sum + question.marks,
      0
    );

    const expiresAt = new Date(
      now.getTime() + test.durationMinutes * 60 * 1000
    );

    // A test's closing time can shorten its attempt deadline.
    if (test.endAt && new Date(test.endAt) < expiresAt) {
      expiresAt.setTime(new Date(test.endAt).getTime());
    }

    if (expiresAt <= now) {
      return sendError(
        res,
        400,
        "There is not enough time remaining to start this test."
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
        options: question.options.map((option) => ({
          text: option.text,
        })),
        marks: question.marks,
        correctOption: question.correctOption,
        selectedOption: null,
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Test started successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    next(error);
  }
}

/* ==================== Get Attempt ==================== */

export async function getTestAttempt(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Test attempt not found.");
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
    next(error);
  }
}

/* ==================== Save Answers ==================== */

export async function saveTestAnswers(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Test attempt not found.");
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
        message: "Time is up. Your attempt has been submitted.",
        attempt: toStudentAttempt(attempt),
      });
    }

    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return sendError(res, 400, "Answers must be an array.");
    }

    for (const submittedAnswer of answers) {
      if (
        !submittedAnswer ||
        !mongoose.isValidObjectId(submittedAnswer.questionId)
      ) {
        return sendError(res, 400, "Invalid question in submitted answers.");
      }

      const answer = attempt.answers.find(
        (item) =>
          String(item.question) ===
          String(submittedAnswer.questionId)
      );

      if (!answer) {
        return sendError(
          res,
          400,
          "An answer refers to a question outside this attempt."
        );
      }

      const selectedOption = submittedAnswer.selectedOption;

      if (
        selectedOption !== null &&
        (!Number.isInteger(selectedOption) ||
          selectedOption < 0 ||
          selectedOption >= answer.options.length)
      ) {
        return sendError(
          res,
          400,
          "A selected option is invalid."
        );
      }
    }

    // Apply answers only after validating the complete request.
    for (const submittedAnswer of answers) {
      const answer = attempt.answers.find(
        (item) =>
          String(item.question) ===
          String(submittedAnswer.questionId)
      );

      answer.selectedOption = submittedAnswer.selectedOption;
    }

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Answers saved successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    next(error);
  }
}

/* ==================== Submit Attempt ==================== */


export async function submitTestAttempt(req, res, next) {
  try {
    const attempt = await findStudentAttempt(
      req.params.attemptId,
      req.user._id
    );

    if (!attempt) {
      return sendError(res, 404, "Test attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      return res.status(200).json({
        success: true,
        message: "This attempt has already been finalized.",
        attempt: toStudentAttempt(attempt),
      });
    }

    // Check the deadline BEFORE accepting final answers.
    const expired = new Date() >= attempt.expiresAt;

    if (!expired && req.body.answers !== undefined) {
      if (!Array.isArray(req.body.answers)) {
        return sendError(res, 400, "Answers must be an array.");
      }

      const seenQuestions = new Set();

      // Validate every answer before modifying the attempt.
      for (const submittedAnswer of req.body.answers) {
        if (
          !submittedAnswer ||
          !mongoose.isValidObjectId(submittedAnswer.questionId)
        ) {
          return sendError(res, 400, "Invalid question in submitted answers.");
        }

        const questionId = String(submittedAnswer.questionId);

        if (seenQuestions.has(questionId)) {
          return sendError(
            res,
            400,
            "Duplicate questions were included in the submission."
          );
        }

        seenQuestions.add(questionId);

        const answer = attempt.answers.find(
          (item) => String(item.question) === questionId
        );

        if (!answer) {
          return sendError(
            res,
            400,
            "An answer refers to a question outside this attempt."
          );
        }

        const selectedOption = submittedAnswer.selectedOption;

        if (
          selectedOption !== null &&
          (!Number.isInteger(selectedOption) ||
            selectedOption < 0 ||
            selectedOption >= answer.options.length)
        ) {
          return sendError(res, 400, "A selected option is invalid.");
        }
      }

      // Apply only validated answers received before the deadline.
      for (const submittedAnswer of req.body.answers) {
        const answer = attempt.answers.find(
          (item) =>
            String(item.question) ===
            String(submittedAnswer.questionId)
        );

        answer.selectedOption = submittedAnswer.selectedOption;
      }
    }

    gradeAttempt(attempt, expired ? "expired" : "submitted");

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: expired
        ? "Time expired. Your previously saved answers have been finalized."
        : "Test submitted successfully.",
      attempt: toStudentAttempt(attempt),
    });
  } catch (error) {
    next(error);
  }
}

