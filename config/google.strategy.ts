import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import crypto from "crypto";
import userModel from "../models/user.model";
import ErrorHandler from "../utlis/ErrorHandler";
import { cacheUserSession } from "../utlis/session";

// Only register Google Strategy if ENV vars exist
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, cb: Function) => {
        try {
          let user = await userModel.findOne({ email: profile._json.email });

          if (!user) {
            // Google users sign in via OAuth; the password only satisfies the schema and must be unguessable
            user = await userModel.create({
              name: profile._json.name,
              email: profile._json.email,
              isVerified: true,
              password: crypto.randomBytes(32).toString("base64url"),
            });
          }

          await cacheUserSession(user);

          const accessTokenJwt = user.SignAcessToken();
          const refreshTokenJwt = user.SignRefreshToken();

          return cb(null, { user, accessToken: accessTokenJwt, refreshToken: refreshTokenJwt });
        } catch (error: any) {
          return cb(new ErrorHandler(error.message, error.code));
        }
      }
    )
  );
} else {
  console.warn("⚠️ Skipping Google OAuth strategy: clientID/secret not set");
}
