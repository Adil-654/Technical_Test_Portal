
import { Router } from "express";
import {
  getStudentQuestionBankSubjects,
  getStudentSubjectQuestions,
  checkStudentQuestionAnswer,
} from "../controller/studentQuestionBankController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("student"));

router.get("/subjects", getStudentQuestionBankSubjects);
router.get("/:subjectId", getStudentSubjectQuestions);
router.post("/:questionId/answer", checkStudentQuestionAnswer);

export default router;
