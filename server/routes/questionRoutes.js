
import { Router } from "express";
import {
  getQuestions,
  createQuestion,
  updateQuestion,
} from "../controller/questionController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/", getQuestions);
router.post("/", createQuestion);
router.patch("/:id", updateQuestion);

export default router;
