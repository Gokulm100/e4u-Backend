import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getUsers, setUserActive, getReports, updateReport } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/getUsers", authMiddleware, getUsers);
router.post("/setUserActive", authMiddleware, setUserActive);
router.post("/getReports", authMiddleware, getReports);
router.post("/updateReport", authMiddleware, updateReport);

export default router;
