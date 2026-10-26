
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ["mcq"],
      default: "mcq",
      required: true,
    },
    options: {
      type: [
        {
          text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
          },
        },
      ],
      validate: {
        validator(options) {
          return options.length === 4 && options.every((option) => option.text);
        },
        message: "An MCQ must have exactly four non-empty options.",
      },
    },
    correctOption: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
      required: true,
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
  { timestamps: true }
);

questionSchema.index({ subject: 1, difficulty: 1, isActive: 1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;
