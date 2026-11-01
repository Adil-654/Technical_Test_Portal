import mongoose from "mongoose";
import Test from "../models/Test.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import TestAttempt from "../models/TestAttempt.js";

const VALID_STATUSES = ["draft", "published", "closed"];

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function validateObjectId(id) {
  return mongoose.isValidObjectId(id);
}

async function validateTestData(data) {
  const {
    title,
    subject,
    questionIds,
    durationMinutes,
    startAt,
    endAt,
    attemptsAllowed,
  } = data;

  if (typeof title !== "string" || !title.trim()) {
    return "Test title is required.";
  }

  if (!validateObjectId(subject)) {
    return "Select a valid subject.";
  }

  if (
    !Array.isArray(questionIds) ||
    questionIds.length === 0
  ) {
    return "Select at least one question.";
  }

  if (
    questionIds.some((id) => !validateObjectId(id)) ||
    new Set(questionIds.map(String)).size !== questionIds.length
  ) {
    return "Question IDs must be valid and unique.";
  }

  const duration = Number(durationMinutes);

  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 600
  ) {
    return "Duration must be between 1 and 600 minutes.";
  }

  if (
    attemptsAllowed !== undefined &&
    (
      !Number.isInteger(Number(attemptsAllowed)) ||
      Number(attemptsAllowed) < 1 ||
      Number(attemptsAllowed) > 10
    )
  ) {
    return "Allowed attempts must be between 1 and 10.";
  }

  if (
    startAt &&
    Number.isNaN(Date.parse(startAt))
  ) {
    return "Enter a valid test start date.";
  }

  if (
    endAt &&
    Number.isNaN(Date.parse(endAt))
  ) {
    return "Enter a valid test end date.";
  }

  if (
    startAt &&
    endAt &&
    new Date(endAt) <= new Date(startAt)
  ) {
    return "The end date must be after the start date.";
  }

  const selectedSubject = await Subject.findOne({
    _id: subject,
    isActive: true,
  });

  if (!selectedSubject) {
    return "The selected subject does not exist or is inactive.";
  }

  const selectedQuestions = await Question.find({
    _id: { $in: questionIds },
    subject,
    isActive: true,
  }).select("_id marks");

  if (selectedQuestions.length !== questionIds.length) {
    return "Some questions are inactive, unavailable, or belong to another subject.";
  }

  const totalMarks = selectedQuestions.reduce(
    (sum, question) => sum + Number(question.marks || 1),
    0
  );

  return { totalMarks };
}

function getTestPayload(body) {
  return {
    title: body.title.trim(),
    description: body.description ?? "",
    subject: body.subject,
    questionIds: body.questionIds,
    durationMinutes: Number(body.durationMinutes),
    startAt: body.startAt || null,
    endAt: body.endAt || null,
    attemptsAllowed: Number(body.attemptsAllowed ?? 1),
  };
}

// GET /api/tests
export async function getTests(req, res, next) {
  try {
    const {
      search = "",
      subject = "",
      status = "",
    } = req.query;

    const filter = {};

    if (subject) {
      if (!validateObjectId(subject)) {
        return sendError(res, 400, "Invalid subject ID.");
      }

      filter.subject = subject;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid test status.");
      }

      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      const escaped = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.title = {
        $regex: escaped,
        $options: "i",
      };
    }

    const tests = await Test.find(filter)
      .populate("subject", "name code")
      .sort({ createdAt: -1 })
      .lean();

    const testIds = tests.map((test) => test._id);

    const attempts = testIds.length
      ? await TestAttempt.find({
          test: { $in: testIds },
        })
          .select("test student status")
          .lean()
      : [];

    const stats = new Map();

    for (const attempt of attempts) {
      const id = String(attempt.test);

      if (!stats.has(id)) {
        stats.set(id, {
          students: new Set(),
          submittedAttempts: 0,
          totalAttempts: 0,
        });
      }

      const stat = stats.get(id);
      stat.totalAttempts += 1;

      if (attempt.student) {
        stat.students.add(String(attempt.student));
      }

      if (attempt.status === "submitted") {
        stat.submittedAttempts += 1;
      }
    }

    const result = tests.map((test) => {
      const stat = stats.get(String(test._id));

      const ids = Array.isArray(test.questionIds)
        ? test.questionIds
        : [];

      return {
        ...test,
        questionCount: test.questionCount ?? ids.length,
        totalMarks: test.totalMarks ?? 0,
        uniqueStudentsAttempted: stat?.students.size ?? 0,
        submittedAttempts: stat?.submittedAttempts ?? 0,
        totalAttempts: stat?.totalAttempts ?? 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      tests: result,
    });
  } catch (error) {
    console.error("getTests:", error);
    next(error);
  }
}

// GET /api/tests/:id
export async function getTestById(req, res, next) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return sendError(res, 400, "Invalid test ID.");
    }

    const test = await Test.findById(id)
      .populate("subject", "name code")
      .populate(
        "questionIds",
        "questionText options marks difficulty isActive"
      )
      .lean();

    if (!test) {
      return sendError(res, 404, "Test not found.");
    }

    return res.status(200).json({
      success: true,
      test,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/tests
export async function createTest(req, res, next) {
  let createdQuestionIds = [];

  try {
    const {
      title,
      description = "",
      subject,
      questionIds = [],
      manualQuestions = [],
      durationMinutes,
      startAt,
      endAt,
      attemptsAllowed = 1,
    } = req.body;

    if (!mongoose.isValidObjectId(subject)) {
      return sendError(res, 400, "Select a valid subject.");
    }

    const selectedSubject = await Subject.findOne({
      _id: subject,
      isActive: true,
    });

    if (!selectedSubject) {
      return sendError(res, 400, "Subject does not exist or is inactive.");
    }

    // Validate manual questions
    if (manualQuestions.length > 0) {
      for (const [index, q] of manualQuestions.entries()) {
        if (
          !q.questionText?.trim() ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          q.options.some((o) => !o.text?.trim()) ||
          !Number.isInteger(Number(q.correctOption)) ||
          Number(q.correctOption) < 0 ||
          Number(q.correctOption) > 3
        ) {
          return sendError(
            res,
            400,
            `Please complete all fields of manual question ${index + 1}.`
          );
        }
      }

      // Save manual questions in Question collection
   const createdBy = req.user?._id;

if (!createdBy) {
  return sendError(res, 401, "Admin authentication required.");
}

const questions = await Question.insertMany(
  manualQuestions.map((q) => ({
    subject,
    questionText: q.questionText.trim(),
    options: q.options.map((o) => ({ text: o.text.trim() })),
    correctOption: Number(q.correctOption),
    explanation: q.explanation || "",
    difficulty: q.difficulty || "medium",
    marks: Number(q.marks) || 1,
    isActive: true,
    createdBy,
  }))
);

      createdQuestionIds = questions.map((q) => q._id);
    }

    const finalQuestionIds = [
      ...questionIds,
      ...createdQuestionIds,
    ];

    const validation = await validateTestData({
      title,
      subject,
      questionIds: finalQuestionIds,
      durationMinutes,
      startAt,
      endAt,
      attemptsAllowed,
    });

    if (typeof validation === "string") {
      if (createdQuestionIds.length) {
        await Question.deleteMany({
          _id: { $in: createdQuestionIds },
        });
      }
      return sendError(res, 400, validation);
    }

    const testData = {
      title: title.trim(),
      description,
      subject,
      questionIds: finalQuestionIds,
      durationMinutes: Number(durationMinutes),
      startAt: startAt || null,
      endAt: endAt || null,
      attemptsAllowed: Number(attemptsAllowed),
      questionCount: finalQuestionIds.length,
      totalMarks: validation.totalMarks,
      status: "draft",
    };

    if (req.user?._id) {
      testData.createdBy = req.user._id;
    }

    const test = await Test.create(testData);

    const populatedTest = await Test.findById(test._id)
      .populate("subject", "name code")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Test created successfully as a draft.",
      test: populatedTest,
    });
  } catch (error) {
    if (createdQuestionIds.length) {
      await Question.deleteMany({
        _id: { $in: createdQuestionIds },
      }).catch(console.error);
    }

    console.error("createTest:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return sendError(res, 400, error.message);
    }

    next(error);
  }
}

// PATCH /api/tests/:id
export async function updateTest(req, res, next) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return sendError(res, 400, "Invalid test ID.");
    }

    const test = await Test.findById(id);

    if (!test) {
      return sendError(res, 404, "Test not found.");
    }

    if (test.status !== "draft") {
      return sendError(
        res,
        400,
        "Only draft tests can be edited."
      );
    }

    const validation = await validateTestData(req.body);

    if (typeof validation === "string") {
      return sendError(res, 400, validation);
    }

    Object.assign(test, getTestPayload(req.body));
    test.questionCount = req.body.questionIds.length;
    test.totalMarks = validation.totalMarks;

    await test.save();

    const updatedTest = await Test.findById(test._id)
      .populate("subject", "name code")
      .populate("createdBy", "name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Draft updated successfully.",
      test: updatedTest,
    });
  } catch (error) {
    console.error("updateTest:", error);
    next(error);
  }
}

// PATCH /api/tests/:id/status
export async function updateTestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validateObjectId(id)) {
      return sendError(res, 400, "Invalid test ID.");
    }

    if (!["draft", "published"].includes(status)) {
      return sendError(
        res,
        400,
        "Status must be either draft or published."
      );
    }

    const test = await Test.findById(id);

    if (!test) {
      return sendError(res, 404, "Test not found.");
    }

    if (test.status === "closed") {
      return sendError(
        res,
        400,
        "Closed tests cannot be published or unpublished."
      );
    }

    if (status === "published") {
      const questionIds = Array.isArray(test.questionIds)
        ? test.questionIds
        : [];

      if (questionIds.length === 0) {
        return sendError(
          res,
          400,
          "Add at least one question before publishing."
        );
      }

      const activeQuestions = await Question.find({
        _id: { $in: questionIds },
        subject: test.subject,
        isActive: true,
      }).select("_id");

      if (activeQuestions.length !== questionIds.length) {
        return sendError(
          res,
          400,
          "Some selected questions are inactive, unavailable, or belong to another subject."
        );
      }
    }

    test.status = status;
    await test.save();

    return res.status(200).json({
      success: true,
      message:
        status === "published"
          ? "Test published successfully."
          : "Test unpublished successfully.",
      test,
    });
  } catch (error) {
    console.error("updateTestStatus:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return sendError(res, 400, error.message);
    }

    next(error);
  }
}

// GET /api/tests/:id/results
export async function getTestResults(req, res, next) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return sendError(res, 400, "Invalid test ID.");
    }

    const test = await Test.findById(id)
      .populate("subject", "name code")
      .select("title subject totalMarks")
      .lean();

    if (!test) {
      return sendError(res, 404, "Test not found.");
    }

    const attempts = await TestAttempt.find({
      test: id,
      status: "submitted",
    })
      .populate("student", "name email studentId")
      .sort({ submittedAt: -1 })
      .lean();

    const students = attempts.map((attempt) => {
      const totalMarks = attempt.totalMarks ?? test.totalMarks ?? 0;
      const score = attempt.score ?? 0;

      return {
        attemptId: attempt._id,
        studentName: attempt.student?.name || "Unknown student",
        studentId: attempt.student?.studentId || "—",
        email: attempt.student?.email || "—",
        marksObtained: score,
        totalMarks,
        percentage:
          attempt.percentage ??
          (totalMarks > 0
            ? Number(((score / totalMarks) * 100).toFixed(2))
            : 0),
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
      };
    });

    return res.status(200).json({
      success: true,
      test,
      totalSubmittedAttempts: attempts.length,
      uniqueStudentsAttempted: new Set(
        attempts
          .filter((attempt) => attempt.student?._id)
          .map((attempt) => String(attempt.student._id))
      ).size,
      students,
    });
  } catch (error) {
    console.error("getTestResults:", error);
    next(error);
  }
}
