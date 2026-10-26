
import { Router } from "express";
import {
  login,
  getMe,
  logout,
  registerStudent,
} from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/register", registerStudent);
router.get("/me", protect, getMe);
router.post("/logout", logout);

export default router;
