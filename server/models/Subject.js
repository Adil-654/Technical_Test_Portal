
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
      unique: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 20,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    category: {
      type: String,
      trim: true,
      default: "Technical",
      maxlength: 50,
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

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
