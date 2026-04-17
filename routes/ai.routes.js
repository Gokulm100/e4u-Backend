import express from "express";
import { summarizeAdUsingAi ,provideAiAnalytics,provideAiPriceInsights} from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/summarizeAdUsingAi",authMiddleware, summarizeAdUsingAi);
router.post("/provideAiAnalytics", provideAiAnalytics);
router.get("/provideAiPriceInsights",provideAiPriceInsights);




export default router;
