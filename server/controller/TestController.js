
import mongoose from "mongoose";
import Test from "../models/Test.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";

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

  if (
    !Number.isInteger(Number(durationMinutes)) ||
    Number(durationMinutes) < 1 ||
    Number(durationMinutes) > 600
  ) {
    return "Duration must be between 1 and 600 minutes.";
  }

  if (
    attemptsAllowed !== undefined &&
    (!Number.isInteger(Number(attemptsAllowed)) ||
      Number(attemptsAllowed) < 1 ||
      Number(attemptsAllowed) > 10)
  ) {
    return "Allowed attempts must be between 1 and 10.";
  }

  if (startAt && Number.isNaN(Date.parse(startAt))) {
    return "Enter a valid test start date.";
  }

  if (endAt && Number.isNaN(Date.parse(endAt))) {
    return "Enter a valid test end date.";
  }

  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
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
    (sum, question) => sum + question.marks,
    0
  );

  return { totalMarks };
}

function getTestPayload(body) {
  return {
    title: body.title,
    description: body.description ?? "",
    subject: body.subject,
    questions: body.questionIds,
    durationMinutes: Number(body.durationMinutes),
    startAt: body.startAt || null,
    endAt: body.endAt || null,
    attemptsAllowed: Number(body.attemptsAllowed ?? 1),
  };
}

/* GET /api/tests */
import TestAttempt from "../models/TestAttempt.js";

// GET /api/tests/:id/results
export async function getTestResults(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid test ID." });
    }

    const test = await Test.findById(id)
      .populate("subject", "name code")
      .select("title subject totalMarks")
      .lean();

    if (!test) {
      return res.status(404).json({ message: "Test not found." });
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
      studentId: attempt.student?.studentId || "—",
      email: attempt.student?.email || "—",
      marksObtained: attempt.score ?? 0,
      totalMarks: attempt.totalMarks ?? test.totalMarks ?? 0,
      percentage:
        attempt.percentage ??
        (attempt.totalMarks > 0
          ? Number(
              (((attempt.score ?? 0) / attempt.totalMarks) * 100).toFixed(2)
            )
          : 0),
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
    }));

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
    next(error);
  }
}
// GET /api/tests


/* GET /api/tests */
export async function getTests(req, res, next) {
  try {
    const {
      search = "",
      subject = "",
      status = "",
    } = req.query;

    const filter = {};

    if (subject) {
      if (!mongoose.isValidObjectId(subject)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
      }

      filter.subject = subject;
    }

    if (["draft", "published", "closed"].includes(status)) {
      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.title = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    // Fetch tests without populating potentially undefined schema paths.
    const tests = await Test.find(filter)
      .populate("subject", "name code")
      .sort({ createdAt: -1 })
      .lean();

    if (tests.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        tests: [],
      });
    }

    // Count unique students and attempts for each test.
    const testIds = tests.map((test) => test._id);

    const attempts = await TestAttempt.find({
      test: { $in: testIds },
    })
      .select("test student status")
      .lean();

    const stats = new Map();

    for (const attempt of attempts) {
      const testId = String(attempt.test);

      if (!stats.has(testId)) {
        stats.set(testId, {
          students: new Set(),
          submittedAttempts: 0,
          totalAttempts: 0,
        });
      }

      const stat = stats.get(testId);

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

      const questionIds = Array.isArray(test.questionIds)
        ? test.questionIds
        : Array.isArray(test.questions)
          ? test.questions
          : [];

      const manualQuestions = Array.isArray(test.manualQuestions)
        ? test.manualQuestions
        : [];

      return {
        ...test,

        questionCount:
          test.questionCount ??
          questionIds.length + manualQuestions.length,

        totalMarks:
          test.totalMarks ??
          questionIds.reduce(
            (total, question) =>
              total +
              (typeof question === "object"
                ? Number(question?.marks || 0)
                : 0),
            0
          ) +
          manualQuestions.reduce(
            (total, question) =>
              total + Number(question?.marks || 0),
            0
          ),

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
    console.error("GET /api/tests failed:", error);
    next(error);
  }
}

/* GET /api/tests/:id */
export async function getTestById(req, res, next) {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID.",
      });
    }

    const test = await Test.findById(req.params.id)
      .populate("subject", "name code")
      .populate("questions", "questionText options marks difficulty isActive")
      .lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    return res.status(200).json({
      success: true,
      test,
    });
  } catch (error) {
    next(error);
  }
}



export const createTest = async (req, res) => {
  try {
    const {
      title,
      description = "",
      subject,
      questionIds = [],
      manualQuestions = [],
      durationMinutes = 30,
      attemptsAllowed = 1,
      startAt = null,
      endAt = null,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        message: "Test title is required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(subject)
    ) {
      return res.status(400).json({
        message: "A valid subject is required.",
      });
    }

    if (!Array.isArray(questionIds) || !Array.isArray(manualQuestions)) {
      return res.status(400).json({
        message: "Questions must be provided as arrays.",
      });
    }

    if (questionIds.length === 0 && manualQuestions.length === 0) {
      return res.status(400).json({
        message: "Add at least one question.",
      });
    }

    if (
      !Number.isInteger(Number(durationMinutes)) ||
      Number(durationMinutes) < 1 ||
      Number(durationMinutes) > 600
    ) {
      return res.status(400).json({
        message: "Duration must be between 1 and 600 minutes.",
      });
    }

    if (
      !Number.isInteger(Number(attemptsAllowed)) ||
      Number(attemptsAllowed) < 1 ||
      Number(attemptsAllowed) > 10
    ) {
      return res.status(400).json({
        message: "Allowed attempts must be between 1 and 10.",
      });
    }

    if (startAt && Number.isNaN(Date.parse(startAt))) {
      return res.status(400).json({
        message: "Invalid start date.",
      });
    }

    if (endAt && Number.isNaN(Date.parse(endAt))) {
      return res.status(400).json({
        message: "Invalid end date.",
      });
    }

    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      return res.status(400).json({
        message: "The end date must be after the start date.",
      });
    }

    const subjectExists = await Subject.findById(subject);

    if (!subjectExists) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    if (subjectExists.isActive === false) {
      return res.status(400).json({
        message: "This subject is inactive.",
      });
    }

    // Validate Question Bank IDs.
    const uniqueQuestionIds = [...new Set(questionIds.map(String))];

    for (const id of uniqueQuestionIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: `Invalid question ID: ${id}`,
        });
      }
    }

    const bankQuestions = uniqueQuestionIds.length
      ? await Question.find({
          _id: { $in: uniqueQuestionIds },
          subject,
          status: "active",
        })
      : [];

    if (bankQuestions.length !== uniqueQuestionIds.length) {
      return res.status(400).json({
        message:
          "Some selected questions are unavailable, inactive, or belong to another subject.",
      });
    }

    // Validate and normalize manually created questions.
    const normalizedManualQuestions = [];

    for (let index = 0; index < manualQuestions.length; index += 1) {
      const question = manualQuestions[index];

      if (!question.questionText?.trim()) {
        return res.status(400).json({
          message: `Question ${index + 1}: question text is required.`,
        });
      }

      if (!["MCQ", "TRUE_FALSE"].includes(question.type)) {
        return res.status(400).json({
          message: `Question ${index + 1}: unsupported question type.`,
        });
      }

      const marks = Number(question.marks ?? 1);

      if (!Number.isFinite(marks) || marks < 1) {
        return res.status(400).json({
          message: `Question ${index + 1}: marks must be at least 1.`,
        });
      }

      const options =
        question.type === "TRUE_FALSE"
          ? ["True", "False"]
          : Array.isArray(question.options)
            ? question.options
                .filter(
                  (option) =>
                    typeof option === "string" && option.trim()
                )
                .map((option) => option.trim())
            : [];

      if (question.type === "MCQ" && options.length < 2) {
        return res.status(400).json({
          message: `Question ${index + 1}: provide at least two options.`,
        });
      }

      const correctAnswer = question.correctAnswer?.trim();

      if (!correctAnswer || !options.includes(correctAnswer)) {
        return res.status(400).json({
          message: `Question ${index + 1}: correct answer must match one of its options.`,
        });
      }

      const difficulty = ["easy", "medium", "hard"].includes(
        question.difficulty
      )
        ? question.difficulty
        : "medium";

      normalizedManualQuestions.push({
        questionText: question.questionText.trim(),
        type: question.type,
        options,
        correctAnswer,
        marks,
        difficulty,
        explanation: question.explanation?.trim() || "",
      });
    }

    const bankMarks = bankQuestions.reduce(
      (total, question) => total + Number(question.marks || 1),
      0
    );

    const manualMarks = normalizedManualQuestions.reduce(
      (total, question) => total + question.marks,
      0
    );

    const test = await Test.create({
      title: title.trim(),
      description: description.trim(),
      subject,
      questionIds: uniqueQuestionIds,
      manualQuestions: normalizedManualQuestions,
      durationMinutes: Number(durationMinutes),
      attemptsAllowed: Number(attemptsAllowed),
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      status: "draft",
      questionCount:
        bankQuestions.length + normalizedManualQuestions.length,
      totalMarks: bankMarks + manualMarks,
      createdBy: req.user?._id,
    });

    const populatedTest = await Test.findById(test._id)
      .populate("subject", "name code")
      .populate("questionIds");

    return res.status(201).json({
      message: "Test created successfully as a draft.",
      test: populatedTest,
    });
  } catch (error) {
    console.error("Create test error:", error);

    return res.status(500).json({
      message: "Unable to create the test.",
    });
  }
};

/* PATCH /api/tests/:id */
export async function updateTest(req, res, next) {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID.",
      });
    }

    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    if (test.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft tests can be edited. Close a published test before creating a revised draft.",
      });
    }

    const validation = await validateTestData(req.body);

    if (typeof validation === "string") {
      return res.status(400).json({
        success: false,
        message: validation,
      });
    }

    Object.assign(test, getTestPayload(req.body));
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
    next(error);
  }
}

/* PATCH /api/tests/:id/status */
export async function updateTestStatus(req, res, next) {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID.",
      });
    }

    const { status } = req.body;

    if (!["published", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be published or closed.",
      });
    }

    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    if (status === "published") {
      if (test.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: "Only draft tests can be published.",
        });
      }

      const activeQuestions = await Question.countDocuments({
        _id: { $in: test.questions },
        subject: test.subject,
        isActive: true,
      });

      if (
        test.questions.length === 0 ||
        activeQuestions !== test.questions.length
      ) {
        return res.status(400).json({
          success: false,
          message: "This test contains unavailable questions. Update the draft before publishing.",
        });
      }
    } else if (test.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Only published tests can be closed.",
      });
    }

    test.status = status;
    await test.save();

    return res.status(200).json({
      success: true,
      message:
        status === "published"
          ? "Test published successfully."
          : "Test closed successfully.",
      test,
    });
  } catch (error) {
    next(error);
  }
}
