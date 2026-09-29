import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
};

export interface SessionClaims {
  sub: string;
  email: string;
  displayName: string;
}

export const createSessionToken = (user: IUser): string =>
  jwt.sign(
    {
      email: user.email,
      displayName: user.displayName,
    },
    getJwtSecret(),
    {
      subject: user._id.toString(),
      expiresIn: "7d",
      issuer: "realtime-video-calling",
    },
  );

export const setSessionCookie = (response: Response, user: IUser): void => {
  response.cookie(
    process.env.SESSION_COOKIE_NAME || "zoomchat_session",
    createSessionToken(user),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionDurationMs,
    },
  );
};

export const clearSessionCookie = (response: Response): void => {
  response.clearCookie(process.env.SESSION_COOKIE_NAME || "zoomchat_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

export const getSessionClaims = (request: Request): SessionClaims | null => {
  const token =
    request.cookies?.[process.env.SESSION_COOKIE_NAME || "zoomchat_session"];
  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret(), {
      issuer: "realtime-video-calling",
    }) as SessionClaims;
  } catch {
    return null;
  }
};

export const getSocketSessionClaims = (
  cookieHeader?: string,
): SessionClaims | null => {
  const cookieName = process.env.SESSION_COOKIE_NAME || "zoomchat_session";
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token) return null;

  try {
    return jwt.verify(decodeURIComponent(token), getJwtSecret(), {
      issuer: "realtime-video-calling",
    }) as SessionClaims;
  } catch {
    return null;
  }
};

export const requireSession = (
  request: Request,
  response: Response,
  next: () => void,
): void => {
  const claims = getSessionClaims(request);
  if (!claims) {
    response.status(401).json({ error: "Bạn cần đăng nhập để tiếp tục." });
    return;
  }

  response.locals.session = claims;
  next();
};
