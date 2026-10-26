
import { Router } from "express";

import {
  getAvailableTests,
  startTestAttempt,
  getTestAttempt,
  saveTestAnswers,
  submitTestAttempt,
} from "../controller/studentAssessmentController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";
import { getStudentResults } from "../controller/studentResultsController.js";
const router = Router();

// Every endpoint in this router requires an authenticated student.
router.use(protect, authorize("student"));

// GET /api/student-assessments
router.get("/", getAvailableTests);

// POST /api/student-assessments/:testId/start
router.post("/:testId/start", startTestAttempt);

// GET /api/student-assessments/attempts/:attemptId
router.get("/attempts/:attemptId", getTestAttempt);

// PATCH /api/student-assessments/attempts/:attemptId/answers
router.patch("/attempts/:attemptId/answers", saveTestAnswers);

// POST /api/student-assessments/attempts/:attemptId/submit
router.post("/attempts/:attemptId/submit", submitTestAttempt);
router.get("/results", getStudentResults);

export default router;
