import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from 'cors';
import { roomHandler } from "./room";

const port = 8080;
const app = express();

// Kích hoạt middleware cors
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    roomHandler(socket);

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(port, () => {
    console.log(`Listening to the server on port ${port}`);
});