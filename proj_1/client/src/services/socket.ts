import { io } from "socket.io-client";
import { API_URL } from "./api";

export const ws = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
});
