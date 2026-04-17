import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import requestRoutes from "./routes/response.js";
import finesRoutes from "./routes/fines.js";
import lostFoundRoutes from "./routes/lostfound.js";
import attendanceRoutes from "./routes/attendance.js";
import chatbotRoutes from "./routes/chatbot.js";
import complaintRoutes from "./routes/complaints.js";
import guestRoomRoutes from "./routes/guestRoom.js";
import notificationsRoutes from "./routes/notifications.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/fines", finesRoutes);
app.use("/api/lostfound", lostFoundRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/guest-room", guestRoomRoutes);
app.use("/api/notifications", notificationsRoutes);

app.get("/", (req, res) => {
  res.send("Server running...");
});

app.get("/test", (req, res) => {
  res.send("Test successful");
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error", err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});