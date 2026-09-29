import { Model, Schema, model, models, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  displayName: string;
  passwordHash?: string;
  googleSub?: string;
  emailVerified: boolean;
  verificationTokenHash?: string;
  verificationTokenExpiresAt?: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, select: false },
  googleSub: { type: String, unique: true, sparse: true, index: true },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationTokenExpiresAt: { type: Date, select: false },
  createdAt: { type: Date, default: Date.now },
});

export const User =
  (models.User as Model<IUser> | undefined) || model<IUser>("User", userSchema);
