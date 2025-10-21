console.log("Server file loaded");

console.log("Server file loaded");
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import adRoutes from "./routes/ad.routes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});
// Global request logger
app.use((req, res, next) => {
	console.log(`[${req.method}] ${req.originalUrl} - Body:`, req.body);
	next();
});

app.use("/api/users", userRoutes);
app.use("/api/ads", adRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
