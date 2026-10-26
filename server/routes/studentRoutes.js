
import { Router } from "express";
import {
  getStudents,
  createStudent,
  updateStudent,
} from "../controller/studentController.js";
import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/", getStudents);
router.post("/", createStudent);
router.patch("/:id", updateStudent);

export default router;
