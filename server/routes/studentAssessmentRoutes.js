
import { Router } from "express";

import {
  getAvailableTests,
  startTestAttempt,
  getTestAttempt,
  saveTestAnswers,
  submitTestAttempt,
} from "../controller/studentAssessmentController.js";

import { getStudentResults } from "../controller/studentResultsController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

// Every endpoint requires an authenticated student.
router.use(protect, authorize("student"));

// List published assessments.
router.get("/", getAvailableTests);

// Results must be registered before parameterized attempt routes.
router.get("/results", getStudentResults);

// Start or resume an assessment.
router.post("/:testId/start", startTestAttempt);

// Retrieve an existing attempt.
router.get("/attempts/:attemptId", getTestAttempt);

// Save answers.
router.patch("/attempts/:attemptId/answers", saveTestAnswers);

// Submit an attempt.
router.post("/attempts/:attemptId/submit", submitTestAttempt);

export default router;
