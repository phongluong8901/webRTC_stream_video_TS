import { randomBytes, createHash } from "crypto";
import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { User, IUser } from "../models/User";
import {
  clearSessionCookie,
  requireSession,
  setSessionCookie,
} from "../auth/session";

const router = Router();
const googleClient = new OAuth2Client();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút." },
});

const publicUser = (user: IUser) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  emailVerified: user.emailVerified,
});

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const sendVerificationEmail = async (
  email: string,
  displayName: string,
  rawToken: string,
) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    EMAIL_VERIFICATION_URL,
  } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_VERIFICATION_URL) {
    throw new Error(
      "Email verification is not configured. Set SMTP_* and EMAIL_VERIFICATION_URL.",
    );
  }

  const verificationUrl = new URL(EMAIL_VERIFICATION_URL);
  verificationUrl.searchParams.set("token", rawToken);
  const safeDisplayName = displayName.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] || character,
  );
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: "Xác minh email cho Realtime Video Calling",
    text: `Xin chào ${displayName}, mở liên kết sau để xác minh email: ${verificationUrl.toString()}. Liên kết hết hạn sau 30 phút.`,
    html: `<p>Xin chào ${safeDisplayName},</p><p><a href="${verificationUrl.toString()}">Xác minh địa chỉ email</a></p><p>Liên kết hết hạn sau 30 phút.</p>`,
  });
};

router.post(
  "/register",
  authLimiter,
  async (request: Request, response: Response) => {
    const email = String(request.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(request.body?.password || "");
    const displayName = String(request.body?.displayName || "").trim();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 ||
      displayName.length < 2 ||
      displayName.length > 80
    ) {
      response.status(400).json({
        error:
          "Nhập email hợp lệ, tên từ 2-80 ký tự và mật khẩu ít nhất 12 ký tự.",
      });
      return;
    }

    const existing = await User.findOne({ email }).select("_id");
    if (existing) {
      response.status(409).json({ error: "Email này đã được đăng ký." });
      return;
    }

    const rawToken = randomBytes(32).toString("hex");
    let createdUser: IUser;
    try {
      createdUser = await User.create({
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 12),
        emailVerified: false,
        verificationTokenHash: hashToken(rawToken),
        verificationTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        response.status(409).json({ error: "Email này đã được đăng ký." });
        return;
      }
      throw error;
    }

    try {
      await sendVerificationEmail(
        createdUser.email,
        createdUser.displayName,
        rawToken,
      );
    } catch (error) {
      await User.deleteOne({ _id: createdUser._id });
      console.error("Could not send verification email:", error);
      response.status(503).json({
        error:
          "Không gửi được email xác minh. Kiểm tra cấu hình SMTP rồi thử lại.",
      });
      return;
    }

    response.status(201).json({
      message: "Đã gửi email xác minh. Hãy xác minh trước khi đăng nhập.",
    });
  },
);

router.post(
  "/verify-email",
  authLimiter,
  async (request: Request, response: Response) => {
    const rawToken = String(request.body?.token || "");
    if (rawToken.length < 32) {
      response.status(400).json({ error: "Liên kết xác minh không hợp lệ." });
      return;
    }

    const user = await User.findOneAndUpdate(
      {
        verificationTokenHash: hashToken(rawToken),
        verificationTokenExpiresAt: { $gt: new Date() },
      },
      {
        $set: { emailVerified: true },
        $unset: { verificationTokenHash: 1, verificationTokenExpiresAt: 1 },
      },
      { new: true },
    );

    if (!user) {
      response
        .status(400)
        .json({ error: "Liên kết đã hết hạn hoặc đã được sử dụng." });
      return;
    }

    setSessionCookie(response, user);
    response.json({ user: publicUser(user) });
  },
);

router.post(
  "/login",
  authLimiter,
  async (request: Request, response: Response) => {
    const email = String(request.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(request.body?.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      response
        .status(401)
        .json({ error: "Email hoặc mật khẩu không chính xác." });
      return;
    }
    if (!user.emailVerified) {
      response
        .status(403)
        .json({ error: "Hãy xác minh email trước khi đăng nhập." });
      return;
    }

    setSessionCookie(response, user);
    response.json({ user: publicUser(user) });
  },
);

router.post(
  "/google",
  authLimiter,
  async (request: Request, response: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const credential = String(request.body?.credential || "");
    if (!clientId || !credential) {
      response
        .status(400)
        .json({ error: "Google sign-in chưa được cấu hình." });
      return;
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      response
        .status(401)
        .json({ error: "Không xác minh được tài khoản Google." });
      return;
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      response.status(403).json({
        error: "Google cần xác nhận địa chỉ email trước khi đăng nhập.",
      });
      return;
    }

    let user = await User.findOne({
      $or: [{ googleSub: payload.sub }, { email: payload.email.toLowerCase() }],
    });
    if (user?.googleSub && user.googleSub !== payload.sub) {
      response.status(409).json({
        error: "Email này đã liên kết với một tài khoản Google khác.",
      });
      return;
    }

    if (!user) {
      user = await User.create({
        email: payload.email.toLowerCase(),
        displayName:
          payload.name?.trim().slice(0, 80) || payload.email.split("@")[0],
        googleSub: payload.sub,
        emailVerified: true,
      });
    } else {
      user.googleSub = payload.sub;
      user.emailVerified = true;
      if (payload.name && !user.displayName)
        user.displayName = payload.name.slice(0, 80);
      await user.save();
    }

    setSessionCookie(response, user);
    response.json({ user: publicUser(user) });
  },
);

router.get(
  "/me",
  requireSession,
  async (_request: Request, response: Response) => {
    const session = response.locals.session as { sub: string };
    const user = await User.findById(session.sub);
    if (!user || !user.emailVerified) {
      clearSessionCookie(response);
      response.status(401).json({ error: "Phiên đăng nhập không còn hợp lệ." });
      return;
    }
    response.json({ user: publicUser(user) });
  },
);

router.post("/logout", (_request: Request, response: Response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

export default router;
