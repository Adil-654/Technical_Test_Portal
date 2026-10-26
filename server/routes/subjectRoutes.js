
import { Router } from "express";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controller/subjectController.js";
import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getSubjects);
router.post("/", authorize("admin"), createSubject);
router.patch("/:id", authorize("admin"), updateSubject);
router.delete("/:id", authorize("admin"), deleteSubject);

export default router;
