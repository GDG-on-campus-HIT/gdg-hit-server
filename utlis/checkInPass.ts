import crypto from "crypto";
import { Request } from "express";
import { publicApiBase } from "./certificateRenderer";

// Pass format: GDGIN1.<participantId>.<signature>. Signed rather than stored so every
// existing registration has a pass without a migration, and passes can't be forged
// from a participant ID alone.
const PREFIX = "GDGIN1";

const secret = () => {
  const value = process.env.CHECKIN_SECRET || process.env.ACCESS_TOKEN;
  if (!value) throw new Error("CHECKIN_SECRET (or ACCESS_TOKEN) must be set to issue check-in passes");
  return value;
};

const sign = (participantId: string) =>
  crypto.createHmac("sha256", secret()).update(`checkin:${participantId}`).digest("base64url").slice(0, 16);

export const checkInToken = (participantId: string) => `${PREFIX}.${participantId}.${sign(participantId)}`;

/** Returns the participant ID for a valid pass, or null. Accepts the raw code or a pass URL. */
export const parseCheckInToken = (raw: unknown): string | null => {
  const text = String(raw ?? "").trim();
  const match = text.match(/GDGIN1\.([0-9a-f]{24})\.([A-Za-z0-9_-]{16})/);
  if (!match) return null;
  const [, participantId, signature] = match;
  const expected = Buffer.from(sign(participantId));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? participantId : null;
};

export const checkInPassUrl = (req: Request, token: string) =>
  `${publicApiBase(req)}/api/v1/check-in/pass/${encodeURIComponent(token)}`;
