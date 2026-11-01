
import { Router } from "express";
import {
  getQuestionBanks,
  createQuestionBank,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
} from "../controller/questionBankController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/", getQuestionBanks);
router.post("/", createQuestionBank);
router.get("/:id", getQuestionBankById);
router.patch("/:id", updateQuestionBank);
router.delete("/:id", deleteQuestionBank);

export default router;
