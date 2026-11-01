import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Test title is required."],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required."],
    },

    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    durationMinutes: {
      type: Number,
      required: [true, "Test duration is required."],
      min: 1,
      max: 600,
    },

    // Date and time when students can start the test.
    startAt: {
      type: Date,
      default: null,
    },

    // Date and time when the test closes.
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

    questionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Test = mongoose.model("Test", testSchema);

export default Test;