require("dotenv").config();

import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import { rateLimit } from "express-rate-limit";

import "./config/google.strategy";
import { ErrorMiddleware } from "./middleware/error";
import { accessTokenOptions, refreshTokenOptions } from "./utlis/jwt";

// Routes
import userRouter from "./routes/user.route";
import memberRouter from "./routes/members.route";
import eventRouter from "./routes/event.route";
import testimonialRouter from "./routes/testimonial.route";
import contactRouter from "./routes/contact.route";
import certificateRouter from "./routes/certificate.route";
import templateRouter from "./routes/template.route";
import adminRoute from "./routes/admin.route";
import superadminRouter from "./routes/superadmin.route";
import mailRoute from "./routes/mail.route";
import analyticsRoute from "./routes/analytics.route";
import recruitmentRouter from "./routes/recruitment.route";
import blogRouter from "./routes/blog.route";
import membersIdRouter from "./routes/membersId.route";
import eventRegistration from "./routes/eventregistration.route";
import quizRoute from "./routes/quiz.route";
import formRouter from "./routes/form.route";
import recruitmentFormRouter from "./routes/recruitmentForm.route";

export const app = express();

/* ---------------------------- BASIC MIDDLEWARE ---------------------------- */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setTimeout(0);
  next();
});

app.set("trust proxy", true);
app.enable("trust proxy");

app.use(cookieParser());

/* ---------------------------- CORS (FIXED) ---------------------------- */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://gdghit.site",
  "https://admin.gdghit.site",
  "https://gdg-hit-main-ffch.vercel.app",
  "https://blog.gdghit.site",
  "https://my-admin-panel-livid.vercel.app",
  "https://gdghit.dev",
  "https://admin.gdghit.dev",
  "https://blog.gdghit.dev"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 REQUIRED for preflight
app.options("*", cors());

/* ---------------------------- RATE LIMIT (MOVED UP) ---------------------------- */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Explicitly disable trust proxy validation
  // If you're behind a reverse proxy (like nginx, cloudflare), this allows the rate limiter to work
  validate: {
    trustProxy: false, // Disable the strict validation
  },
});

app.use(limiter);

/* ---------------------------- ROUTES ---------------------------- */

app.use("/api/v1", userRouter);
app.use("/api/v1", memberRouter);
app.use("/api/v1", eventRouter);
app.use("/api/v1", testimonialRouter);
app.use("/api/v1", contactRouter);
app.use("/api/v1", certificateRouter);
app.use("/api/v1", templateRouter);
app.use("/api/v1", adminRoute);
app.use("/api/v1/superadmin", superadminRouter);
app.use("/api/v1", mailRoute);
app.use("/api/v1", analyticsRoute);
app.use("/api/v1", recruitmentRouter);
app.use("/api/v1", blogRouter);
app.use("/api/v1", membersIdRouter);
app.use("/api/v1", eventRegistration);
app.use("/api/v1", quizRoute);
app.use("/api/v1", formRouter);
app.use("/api/v1", recruitmentFormRouter);

/* ---------------------------- GOOGLE AUTH ---------------------------- */

app.get(
  "/auth/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_HOST}/signin`,
  }),
  (req, res) => {
    const { accessToken, refreshToken } = req.user as any;

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    const frontendHost =
      process.env.FRONTEND_HOST || "http://localhost:3000";

    res.send(
      `<script>
        window.opener.postMessage({ success: true }, '${frontendHost}');
        window.close();
      </script>`
    );
  }
);

/* ---------------------------- TEST ROUTES ---------------------------- */

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Hello Server",
  });
});

app.get("/test", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

/* ---------------------------- 404 HANDLER ---------------------------- */

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

/* ---------------------------- ERROR MIDDLEWARE ---------------------------- */

app.use(ErrorMiddleware);
