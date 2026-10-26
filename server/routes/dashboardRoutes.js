
import { Router } from "express";
import { getDashboardStats } from "../controller/dashboardController.js";
import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get("/stats", protect, authorize("admin"), getDashboardStats);

export default router;
