
import mongoose from "mongoose";

const attemptAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // Snapshot keeps the question unchanged for this attempt.
    questionText: {
      type: String,
      required: true,
    },

    options: {
      type: [
        {
          text: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
    },

    marks: {
      type: Number,
      required: true,
      min: 1,
    },

    // Stored only on the server; never send this field to students.
    correctOption: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      select: false,
    },

    selectedOption: {
      type: Number,
      min: 0,
      max: 3,
      default: null,
    },
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },

    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    answers: {
      type: [attemptAnswerSchema],
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "expired"],
      default: "in_progress",
      required: true,
      index: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    score: {
      type: Number,
      default: null,
      min: 0,
    },

    percentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attempt numbers for the same student and test.
testAttemptSchema.index(
  { student: 1, test: 1, attemptNumber: 1 },
  { unique: true }
);

// Helpful for retrieving a student's attempt history.
testAttemptSchema.index({
  student: 1,
  test: 1,
  status: 1,
});

const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);

export default TestAttempt;
