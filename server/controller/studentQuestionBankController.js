
import mongoose from "mongoose";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";

// GET /api/student-question-bank/subjects
// Return active subjects with their active question counts.
export async function getStudentQuestionBankSubjects(req, res, next) {
  try {
    const subjects = await Subject.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $lookup: {
          from: Question.collection.name,
          let: { subjectId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$subject", "$$subjectId"] },
                isActive: true,
              },
            },
            {
              $count: "count",
            },
          ],
          as: "questionStats",
        },
      },
      {
        $addFields: {
          questionCount: {
            $ifNull: [
              { $arrayElemAt: ["$questionStats.count", 0] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          name: 1,
          code: 1,
          description: 1,
          category: 1,
          questionCount: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/student-question-bank/:subjectId
// Return active questions without correct answers or explanations.
export async function getStudentSubjectQuestions(req, res, next) {
  try {
    const { subjectId } = req.params;
    const {
      search = "",
      difficulty = "all",
    } = req.query;

    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      isActive: true,
    })
      .select("name code description category")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or inactive.",
      });
    }

    if (!["all", "easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty filter.",
      });
    }

    const filter = {
      subject: subjectId,
      isActive: true,
    };

    if (difficulty !== "all") {
      filter.difficulty = difficulty;
    }

    if (typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.questionText = {
        $regex: escaped,
        $options: "i",
      };
    }

    const questions = await Question.find(filter)
      .select("_id questionText type options difficulty marks createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      subject,
      count: questions.length,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/student-question-bank/:questionId/answer
// Reveal the correct answer only after the student submits an option.
export async function checkStudentQuestionAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { selectedOption } = req.body ?? {};

    if (!mongoose.isValidObjectId(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
    }

    if (
      !Number.isInteger(selectedOption) ||
      selectedOption < 0 ||
      selectedOption > 3
    ) {
      return res.status(400).json({
        success: false,
        message: "Select a valid option.",
      });
    }

    const question = await Question.findOne({
      _id: questionId,
      isActive: true,
    })
      .select("subject correctOption explanation marks")
      .populate({
        path: "subject",
        select: "isActive",
      })
      .lean();

    if (!question || !question.subject?.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found or inactive.",
      });
    }

    const isCorrect = selectedOption === question.correctOption;

    return res.status(200).json({
      success: true,
      isCorrect,
      selectedOption,
      correctOption: question.correctOption,
      explanation: question.explanation,
      marksAwarded: isCorrect ? question.marks : 0,
    });
  } catch (error) {
    next(error);
  }
}
