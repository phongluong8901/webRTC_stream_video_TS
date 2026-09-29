import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { requireSession } from "../auth/session";
import { Room } from "../models/Room";

const router = Router();

router.get(
  "/",
  requireSession,
  async (_request: Request, response: Response) => {
    const session = response.locals.session as { sub: string };
    const rooms = await Room.find({ ownerId: new Types.ObjectId(session.sub) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    response.json({
      rooms: rooms.map((room) => ({
        roomId: room.roomId,
        status: room.status,
        createdAt: room.createdAt,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        durationMs: room.durationMs,
        participantCount: new Set(
          room.participants.map((participant) => participant.userId.toString()),
        ).size,
      })),
    });
  },
);

export default router;
