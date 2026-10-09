import { redis } from "./redis";

// Bounds how long a role change or account removal can be served from a stale cache
const SESSION_TTL_SECONDS = 60 * 60;

const SENSITIVE_FIELDS = ["password", "resetPasswordToken", "resetPasswordExpires"];

export const toSafeUser = (user: any): Record<string, any> => {
  const plain = typeof user?.toObject === "function" ? user.toObject() : { ...user };
  for (const field of SENSITIVE_FIELDS) delete plain[field];
  return plain;
};

export const cacheUserSession = async (user: any): Promise<void> => {
  if (!user?._id) return;
  await redis
    .set(String(user._id), JSON.stringify(toSafeUser(user)), "EX", SESSION_TTL_SECONDS)
    .catch(() => null);
};

export const clearUserSession = async (userId: unknown): Promise<void> => {
  if (!userId) return;
  await redis.del(String(userId)).catch(() => null);
};
