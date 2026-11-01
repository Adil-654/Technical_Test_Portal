
import mongoose from "mongoose";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import QuestionBank from "../models/QuestionBank.js";

function validateQuestion(body) {
  const {
    subject,
    questionBank,
    questionText,
    options,
    correctOption,
    explanation = "",
    difficulty = "medium",
    marks = 1,
  } = body ?? {};

  if (
    typeof subject !== "string" ||
    !mongoose.isValidObjectId(subject) ||
    typeof questionBank !== "string" ||
    !mongoose.isValidObjectId(questionBank) ||
    typeof questionText !== "string" ||
    !questionText.trim() ||
    questionText.trim().length > 5000
  ) {
    return {
      error: "Provide a valid subject, question bank and question.",
    };
  }

  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some(
      (option) =>
        typeof option?.text !== "string" ||
        !option.text.trim() ||
        option.text.trim().length > 1000
    )
  ) {
    return { error: "Provide exactly four non-empty options." };
  }

  if (
    !Number.isInteger(correctOption) ||
    correctOption < 0 ||
    correctOption > 3
  ) {
    return { error: "Select a valid correct option." };
  }

  if (
    typeof explanation !== "string" ||
    explanation.length > 3000
  ) {
    return { error: "Explanation cannot exceed 3000 characters." };
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return { error: "Choose a valid difficulty level." };
  }

  if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
    return { error: "Marks must be an integer between 1 and 100." };
  }

  return {
    value: {
      subject,
      questionBank,
      questionText: questionText.trim(),
      options: options.map((option) => ({
        text: option.text.trim(),
      })),
      correctOption,
      explanation: explanation.trim(),
      difficulty,
      marks,
    },
  };
}

// GET /api/questions
export async function getQuestions(req, res, next) {
  try {
    const {
      search = "",
      subject = "",
      questionBank = "",
      difficulty = "all",
      status = "all",
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

    if (questionBank) {
      if (!mongoose.isValidObjectId(questionBank)) {
        return res.status(400).json({
          success: false,
          message: "Invalid question bank ID.",
        });
      }

      filter.questionBank = questionBank;
    }

    if (["easy", "medium", "hard"].includes(difficulty)) {
      filter.difficulty = difficulty;
    } else if (difficulty !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty filter.",
      });
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    } else if (status !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter.",
      });
    }

    if (typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.questionText = {
        $regex: escaped,
        $options: "i",
      };
    }

    const questions = await Question.find(filter)
      .select("-correctOption -explanation")
      .populate("subject", "name code")
      .populate("questionBank", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/questions/:id
// Admin-only detail endpoint: includes answer and explanation.
export async function getQuestionById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
    }

    const question = await Question.findById(req.params.id)
      .populate("subject", "name code")
      .populate("questionBank", "name")
      .lean();

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/questions
export async function createQuestion(req, res, next) {
  try {
    const validation = validateQuestion(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const { subject, questionBank } = validation.value;

    const [subjectDoc, bank] = await Promise.all([
      Subject.findOne({
        _id: subject,
        isActive: true,
      }),
      QuestionBank.findOne({
        _id: questionBank,
        subject,
        isActive: true,
      }),
    ]);

    if (!subjectDoc) {
      return res.status(400).json({
        success: false,
        message: "Choose an existing active subject.",
      });
    }

    if (!bank) {
      return res.status(400).json({
        success: false,
        message: "Choose an active bank belonging to this subject.",
      });
    }

    const question = await Question.create({
      ...validation.value,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Question created successfully.",
      question: {
        _id: question._id,
        subject: question.subject,
        questionBank: question.questionBank,
        questionText: question.questionText,
        type: question.type,
        options: question.options,
        difficulty: question.difficulty,
        marks: question.marks,
        isActive: question.isActive,
        createdAt: question.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/questions/:id
export async function updateQuestion(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
    }

    const current = await Question.findById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    const body = req.body ?? {};

    const allowedFields = [
      "subject",
      "questionBank",
      "questionText",
      "options",
      "correctOption",
      "explanation",
      "difficulty",
      "marks",
    ];

    const hasContentChange = allowedFields.some(
      (key) => key in body
    );

    if (hasContentChange) {
      const merged = {
        subject: String(body.subject ?? current.subject),
        questionBank: String(
          body.questionBank ?? current.questionBank ?? ""
        ),
        questionText: body.questionText ?? current.questionText,
        options: body.options ?? current.options,
        correctOption: body.correctOption ?? current.correctOption,
        explanation: body.explanation ?? current.explanation,
        difficulty: body.difficulty ?? current.difficulty,
        marks: body.marks ?? current.marks,
      };

      const validation = validateQuestion(merged);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const [subjectDoc, bank] = await Promise.all([
        Subject.findOne({
          _id: validation.value.subject,
          isActive: true,
        }),
        QuestionBank.findOne({
          _id: validation.value.questionBank,
          subject: validation.value.subject,
          isActive: true,
        }),
      ]);

      if (!subjectDoc) {
        return res.status(400).json({
          success: false,
          message: "Choose an existing active subject.",
        });
      }

      if (!bank) {
        return res.status(400).json({
          success: false,
          message: "Choose an active bank belonging to this subject.",
        });
      }

      Object.assign(current, validation.value);
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      current.isActive = body.isActive;
    }

    await current.save();

    return res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      question: {
        _id: current._id,
        subject: current.subject,
        questionBank: current.questionBank,
        questionText: current.questionText,
        type: current.type,
        options: current.options,
        difficulty: current.difficulty,
        marks: current.marks,
        isActive: current.isActive,
        createdAt: current.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
