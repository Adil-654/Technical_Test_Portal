
import { Router } from "express";

import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  updateTestStatus,
  getTestResults,
} from "../controller/TestController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

// All test-management routes require an authenticated admin.
router.use(protect, authorize("admin"));

router.get("/", getTests);
router.post("/", createTest);

router.get("/:id/results", getTestResults);
router.get("/:id", getTestById);

router.patch("/:id/status", updateTestStatus);
router.patch("/:id", updateTest);

export default router;
