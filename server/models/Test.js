
import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Test title is required."],
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    questions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
      ],
      validate: {
        validator(ids) {
          return (
            ids.length > 0 &&
            ids.every((id) => mongoose.isValidObjectId(id)) &&
            new Set(ids.map(String)).size === ids.length
          );
        },
        message: "Select at least one unique question.",
      },
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    startAt: {
      type: Date,
      default: null,
    },

    endAt: {
      type: Date,
      default: null,
    },

    attemptsAllowed: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
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

testSchema.index({ status: 1, startAt: 1, endAt: 1 });

const Test = mongoose.model("Test", testSchema);

export default Test;
