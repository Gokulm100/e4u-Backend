import express from "express";
import { summarizeAdUsingAi ,provideAiAnalytics} from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/summarizeAdUsingAi",authMiddleware, summarizeAdUsingAi);
router.post("/provideAiAnalytics", provideAiAnalytics);




export default router;
