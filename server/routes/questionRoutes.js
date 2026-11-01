
import { Router } from "express";

import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
} from "../controller/questionController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

// All question management routes are admin-only.
router.use(protect, authorize("admin"));

router.get("/", getQuestions);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.patch("/:id", updateQuestion);

export default router;
