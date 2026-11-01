
import mongoose from "mongoose";
import QuestionBank from "../models/QuestionBank.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";

export async function getQuestionBanks(req, res, next) {
  try {
    const { search = "", subject = "", status = "all" } = req.query;

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

    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;
    else if (status !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter.",
      });
    }

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: escaped, $options: "i" };
    }

    const banks = await QuestionBank.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "subjects",
          localField: "subject",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },
      {
        $lookup: {
          from: Question.collection.name,
          let: { bankId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$questionBank", "$$bankId"] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: { $cond: ["$isActive", 1, 0] },
                },
              },
            },
          ],
          as: "stats",
        },
      },
      {
        $addFields: {
          questionCount: {
            $ifNull: [{ $arrayElemAt: ["$stats.total", 0] }, 0],
          },
          activeQuestionCount: {
            $ifNull: [{ $arrayElemAt: ["$stats.active", 0] }, 0],
          },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          isActive: 1,
          createdAt: 1,
          subject: {
            _id: "$subject._id",
            name: "$subject.name",
            code: "$subject.code",
          },
          questionCount: 1,
          activeQuestionCount: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.json({
      success: true,
      count: banks.length,
      questionBanks: banks,
    });
  } catch (error) {
    next(error);
  }
}

export async function createQuestionBank(req, res, next) {
  try {
    const { name, subject, description = "" } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 120 ||
      typeof subject !== "string" ||
      !mongoose.isValidObjectId(subject) ||
      typeof description !== "string" ||
      description.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid bank name, subject and description.",
      });
    }

    const subjectDoc = await Subject.findOne({
      _id: subject,
      isActive: true,
    });

    if (!subjectDoc) {
      return res.status(400).json({
        success: false,
        message: "Choose an existing active subject.",
      });
    }

    const bank = await QuestionBank.create({
      name: name.trim(),
      subject,
      description: description.trim(),
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Question bank created successfully.",
      questionBank: bank,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A question bank with this name already exists in this subject.",
      });
    }
    next(error);
  }
}

export async function getQuestionBankById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question bank ID.",
      });
    }

    const bank = await QuestionBank.findById(req.params.id)
      .populate("subject", "name code")
      .lean();

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Question bank not found.",
      });
    }

    return res.json({
      success: true,
      questionBank: bank,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionBank(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question bank ID.",
      });
    }

    const { name, subject, description, isActive } = req.body ?? {};
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
        return res.status(400).json({
          success: false,
          message: "Provide a valid bank name.",
        });
      }
      updates.name = name.trim();
    }

    if (subject !== undefined) {
      if (typeof subject !== "string" || !mongoose.isValidObjectId(subject)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
      }

      const subjectDoc = await Subject.findOne({
        _id: subject,
        isActive: true,
      });

      if (!subjectDoc) {
        return res.status(400).json({
          success: false,
          message: "Choose an existing active subject.",
        });
      }
      updates.subject = subject;
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 500 characters.",
        });
      }
      updates.description = description.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }
      updates.isActive = isActive;
    }

    const bank = await QuestionBank.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate("subject", "name code");

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Question bank not found.",
      });
    }

    // Keep each question's subject consistent if the bank's subject changes.
    if (updates.subject) {
      await Question.updateMany(
        { questionBank: bank._id },
        { $set: { subject: updates.subject } }
      );
    }

    return res.json({
      success: true,
      message: "Question bank updated successfully.",
      questionBank: bank,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A question bank with this name already exists in this subject.",
      });
    }
    next(error);
  }
}

export async function deleteQuestionBank(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question bank ID.",
      });
    }

    const bank = await QuestionBank.findById(req.params.id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Question bank not found.",
      });
    }

    const linkedQuestions = await Question.countDocuments({
      questionBank: bank._id,
    });

    if (linkedQuestions > 0) {
      return res.status(409).json({
        success: false,
        message: "This bank contains questions. Deactivate it instead of deleting it.",
      });
    }

    await bank.deleteOne();

    return res.json({
      success: true,
      message: "Question bank deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
    