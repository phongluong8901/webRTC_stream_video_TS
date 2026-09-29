import { Model, Schema, model, models, Types } from "mongoose";

export interface IRoomParticipant {
  userId: Types.ObjectId;
  peerId: string;
  displayName: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface IRoom {
  roomId: string;
  ownerId: Types.ObjectId;
  status: "waiting" | "active" | "ended";
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  durationMs: number;
  sharingPeerId?: string;
  participants: IRoomParticipant[];
}

const participantSchema = new Schema<IRoomParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    peerId: { type: String, required: true },
    displayName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false },
);

const roomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true, index: true },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["waiting", "active", "ended"],
    default: "waiting",
    index: true,
  },
  createdAt: { type: Date, default: Date.now, index: true },
  startedAt: { type: Date },
  endedAt: { type: Date },
  durationMs: { type: Number, default: 0 },
  sharingPeerId: { type: String },
  participants: { type: [participantSchema], default: [] },
});

export const Room =
  (models.Room as Model<IRoom> | undefined) || model<IRoom>("Room", roomSchema);
