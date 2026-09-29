import { Model, Schema, model, models, Types } from "mongoose";

export interface IChatMessage {
  _id: Types.ObjectId;
  roomId: string;
  authorId: Types.ObjectId;
  authorPeerId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  roomId: { type: String, required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorPeerId: { type: String, required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now, index: true },
});

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

export const ChatMessage =
  (models.ChatMessage as Model<IChatMessage> | undefined) ||
  model<IChatMessage>("ChatMessage", chatMessageSchema);
