
import mongoose from "mongoose";

const questionBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

questionBankSchema.index(
  { subject: 1, name: 1 },
  { unique: true }
);

const QuestionBank = mongoose.model(
  "QuestionBank",
  questionBankSchema
);

export default QuestionBank;
