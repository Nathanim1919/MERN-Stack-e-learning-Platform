import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  getCurrentUser,
  forgotPasswordRequest,
  logoutUser,
} from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkMinimumBalance } from "../middlewares/checkMinimumBalance.js";
import { monthlyIncomeMiddleware } from "../middlewares/monthlyIncomeMiddleware.js";
import { monthlyExpenseDeductionMiddleware } from "../middlewares/monthlyExpenseMiddleware.js";
import { checkGoalDeadlinesMiddleware } from "../middlewares/checkGoalDeadline.js";

const router = Router();

router
    .post("/register", registerUser)
    .post("/login", loginUser)
    .post("/logout", verifyJWT, logoutUser)
    .post("/forgotPasswordRequest", forgotPasswordRequest)
    .get("/verify-email/:unHashedToken", verifyEmail)
    .get(
        "/getUser",
        verifyJWT,
        getCurrentUser,
        checkMinimumBalance,
        monthlyIncomeMiddleware,
        checkGoalDeadlinesMiddleware,
        monthlyExpenseDeductionMiddleware,
    );

export default router;