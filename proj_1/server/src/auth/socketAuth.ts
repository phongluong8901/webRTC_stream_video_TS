import { Socket } from "socket.io";
import { getSocketSessionClaims } from "./session";

export const authenticateSocket = (
  socket: Socket,
  next: (error?: Error) => void,
) => {
  const claims = getSocketSessionClaims(socket.handshake.headers.cookie);
  if (!claims) {
    next(new Error("Authentication required"));
    return;
  }

  socket.data.userId = claims.sub;
  socket.data.email = claims.email;
  socket.data.displayName = claims.displayName;
  next();
};
