
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
export async function getTests(req, res, next) {
  try {
    const { search = "", subject = "", status = "" } = req.query;

    const filter = {};

    if (subject && validateObjectId(subject)) {
      filter.subject = subject;
    }

    if (["draft", "published", "closed"].includes(status)) {
      filter.status = status;
    }

    if (search.trim()) {
      filter.title = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const tests = await Test.find(filter)
      .populate("subject", "name code")
      .populate("createdBy", "name")
      .populate("questions", "questionText marks difficulty isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tests.length,
      tests: tests.map((test) => ({
        ...test,
        questionCount: test.questions.length,
        // Do not expose correctOption or explanation in test listings.
        questions: test.questions.map((question) => ({
          _id: question._id,
          questionText: question.questionText,
          marks: question.marks,
          difficulty: question.difficulty,
          isActive: question.isActive,
        })),
      })),
    });
  } catch (error) {
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

/* POST /api/tests */
export async function createTest(req, res, next) {
  try {
    const validation = await validateTestData(req.body);

    if (typeof validation === "string") {
      return res.status(400).json({
        success: false,
        message: validation,
      });
    }

    const payload = getTestPayload(req.body);

    const test = await Test.create({
      ...payload,
      totalMarks: validation.totalMarks,
      createdBy: req.user._id,
    });

    const createdTest = await Test.findById(test._id)
      .populate("subject", "name code")
      .populate("createdBy", "name")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Test created successfully as a draft.",
      test: createdTest,
    });
  } catch (error) {
    next(error);
  }
}

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
