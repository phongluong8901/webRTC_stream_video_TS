import { Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Types } from "mongoose";
import { Room } from "../models/Room";
import { ChatMessage } from "../models/ChatMessage";

interface RoomParams {
  roomId?: unknown;
  peerId?: unknown;
}

interface ChatPayload {
  content?: unknown;
}

const getMemberships = (socket: Socket): Record<string, string> => {
  if (!socket.data.roomSessions) socket.data.roomSessions = {};
  return socket.data.roomSessions as Record<string, string>;
};

const activePeerIds = (
  participants: Array<{ peerId: string; leftAt?: Date }>,
) =>
  participants
    .filter((participant) => !participant.leftAt)
    .map((participant) => participant.peerId);

export const roomHandler = (socket: Socket) => {
  const createRoom = async () => {
    try {
      const roomId = uuidv4();
      await Room.create({
        roomId,
        ownerId: new Types.ObjectId(socket.data.userId as string),
        status: "waiting",
        createdAt: new Date(),
        durationMs: 0,
      });
      socket.emit("room-created", { roomId });
    } catch (error) {
      console.error("Could not create room:", error);
      socket.emit("room-error", "Không thể tạo phòng. Vui lòng thử lại.");
    }
  };

  const joinRoom = async ({
    roomId: rawRoomId,
    peerId: rawPeerId,
  }: RoomParams = {}) => {
    const roomId = typeof rawRoomId === "string" ? rawRoomId.trim() : "";
    const peerId = typeof rawPeerId === "string" ? rawPeerId.trim() : "";
    if (!roomId || !peerId || peerId.length > 100) {
      socket.emit("room-error", "Mã phòng hoặc Peer ID không hợp lệ.");
      return;
    }

    const memberships = getMemberships(socket);
    const previousPeerId = memberships[roomId];
    if (previousPeerId) await leaveRoom(roomId, previousPeerId, false);

    const room = await Room.findOne({ roomId });
    if (!room || room.status === "ended") {
      socket.emit("room-error", "Không tìm thấy phòng đang hoạt động.");
      return;
    }

    const now = new Date();
    const existingSession = room.participants.find(
      (participant) => participant.peerId === peerId && !participant.leftAt,
    );
    if (!existingSession) {
      room.participants.push({
        userId: new Types.ObjectId(socket.data.userId as string),
        peerId,
        displayName: String(socket.data.displayName || "Thành viên").slice(
          0,
          80,
        ),
        joinedAt: now,
      });
    }
    if (!room.startedAt) room.startedAt = now;
    room.status = "active";
    room.endedAt = undefined;
    await room.save();

    memberships[roomId] = peerId;
    await socket.join(roomId);
    const participants = activePeerIds(room.participants);
    socket.to(roomId).emit("user-joined", { peerId });
    socket.emit("get-users", {
      roomId,
      participants,
      sharingPeerId: room.sharingPeerId,
    });

    const history = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    socket.emit(
      "get-message",
      history.map((message) => ({
        content: message.content,
        timestamps: message.createdAt.getTime(),
        author: message.authorPeerId,
        authorName: message.authorName,
      })),
    );
  };

  const leaveRoom = async (roomId: string, peerId: string, notify = true) => {
    const memberships = getMemberships(socket);
    if (memberships[roomId] !== peerId) return;
    delete memberships[roomId];

    const now = new Date();
    const room = await Room.findOneAndUpdate(
      { roomId },
      {
        $set: { "participants.$[session].leftAt": now },
      },
      {
        arrayFilters: [
          { "session.peerId": peerId, "session.leftAt": { $exists: false } },
        ],
        new: true,
      },
    );

    if (!room) return;
    if (room.sharingPeerId === peerId) {
      room.sharingPeerId = undefined;
      if (notify) socket.to(roomId).emit("user-stopped-sharing", peerId);
    }

    const remainingPeerIds = activePeerIds(room.participants);
    if (remainingPeerIds.length === 0) {
      room.status = "ended";
      room.endedAt = now;
      room.durationMs = Math.max(
        0,
        now.getTime() - (room.startedAt || room.createdAt).getTime(),
      );
    }
    await room.save();
    if (notify) socket.to(roomId).emit("user-disconnected", peerId);
    await socket.leave(roomId);
  };

  socket.on(
    "start-sharing",
    async ({ roomId: rawRoomId, peerId: rawPeerId }: RoomParams = {}) => {
      const roomId = typeof rawRoomId === "string" ? rawRoomId : "";
      const peerId = typeof rawPeerId === "string" ? rawPeerId : "";
      if (!roomId || getMemberships(socket)[roomId] !== peerId) return;
      await Room.updateOne(
        { roomId, status: "active" },
        { $set: { sharingPeerId: peerId } },
      );
      socket.to(roomId).emit("user-started-sharing", peerId);
    },
  );

  socket.on(
    "stop-sharing",
    async ({ roomId: rawRoomId, peerId: rawPeerId }: RoomParams = {}) => {
      const roomId = typeof rawRoomId === "string" ? rawRoomId : "";
      const peerId = typeof rawPeerId === "string" ? rawPeerId : "";
      if (!roomId || getMemberships(socket)[roomId] !== peerId) return;
      await Room.updateOne(
        { roomId, sharingPeerId: peerId },
        { $unset: { sharingPeerId: 1 } },
      );
      socket.to(roomId).emit("user-stopped-sharing", peerId);
    },
  );

  socket.on(
    "send-message",
    async (rawRoomId: unknown, payload: ChatPayload = {}) => {
      const roomId = typeof rawRoomId === "string" ? rawRoomId : "";
      const peerId = getMemberships(socket)[roomId];
      const content =
        typeof payload?.content === "string" ? payload.content.trim() : "";
      if (!roomId || !peerId || !content || content.length > 4000) return;

      const userId = socket.data.userId as string;
      const message = await ChatMessage.create({
        roomId,
        authorId: new Types.ObjectId(userId),
        authorPeerId: peerId,
        authorName: String(socket.data.displayName || "Thành viên").slice(
          0,
          80,
        ),
        content,
        createdAt: new Date(),
      });
      socket.to(roomId).emit("add-message", {
        content: message.content,
        timestamps: message.createdAt.getTime(),
        author: message.authorPeerId,
        authorName: message.authorName,
      });
    },
  );

  socket.on("disconnect", () => {
    const memberships = getMemberships(socket);
    void Promise.all(
      Object.entries(memberships).map(([roomId, peerId]) =>
        leaveRoom(roomId, peerId),
      ),
    ).catch((error: unknown) =>
      console.error("Could not persist room disconnect:", error),
    );
  });

  socket.on("create-room", () => {
    void createRoom();
  });
  socket.on("join-room", (params: RoomParams) => {
    void joinRoom(params).catch((error: unknown) => {
      console.error("Could not join room:", error);
      socket.emit("room-error", "Không thể tham gia phòng. Vui lòng thử lại.");
    });
  });
};
