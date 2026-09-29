import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import { roomHandler } from "./room";
import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";
import { authenticateSocket } from "./auth/socketAuth";
import { connectDatabase } from "./config/database";

const port = Number(process.env.PORT || 8080);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const app = express();

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);

// Tạo một HTTP server thuần túy từ ứng dụng Express
const server = http.createServer(app);

// Khởi tạo Socket.IO server gắn vào HTTP server và cấu hình bảo mật CORS
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  roomHandler(socket);
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const start = async () => {
  await connectDatabase();
  server.listen(port, () => {
    console.log(`Listening to the server on port ${port}`);
  });
};

start().catch((error: unknown) => {
  console.error("Could not start server:", error);
  process.exitCode = 1;
});
