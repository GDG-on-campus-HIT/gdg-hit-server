require("dotenv").config();

// Load before routes/models so Mongoose buffer timeout applies to all operations
import "./utlis/db";

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
import mailRoute from "./routes/mail.route";
import analyticsRoute from "./routes/analytics.route";
import recruitmentRouter from "./routes/recruitment.route";
import blogRouter from "./routes/blog.route";
import membersIdRouter from "./routes/membersId.route";
import eventRegistration from "./routes/eventregistration.route";
import quizRoute from "./routes/quiz.route";
import formRouter from "./routes/form.route";
import recruitmentFormRouter from "./routes/recruitmentForm.route";
import reviewRouter from "./routes/review.route";
import { registerSuperadminRoutes } from "./routes/superadmin.route";

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

/* ---------------------------- CORS ---------------------------- */

const allowedOrigins = [
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:5174",

  // Old production domains
  "https://gdghit.site",
  "https://admin.gdghit.site",
  "https://blog.gdghit.site",

  // Vercel deployments
  "https://gdg-hit-main-ffch.vercel.app",
  "https://my-admin-panel-livid.vercel.app",

  // Current production domains
  "https://gdghit.dev",
  "https://www.gdghit.dev",
  "https://admin.gdghit.dev",
  "https://blog.gdghit.dev",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests without an Origin header
    // Example: Postman, server-to-server requests, etc.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`❌ CORS blocked origin: ${origin}`);

    return callback(
      new Error(`CORS not allowed for origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

// Main CORS middleware
app.use(cors(corsOptions));

// Preflight requests
app.options("*", cors(corsOptions));

/* ---------------------------- RATE LIMIT ---------------------------- */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  validate: {
    trustProxy: false,
  },
});

app.use(limiter);

/* ---------------------------- ROUTES ---------------------------- */

registerSuperadminRoutes(app);

app.use("/api/v1", userRouter);
app.use("/api/v1", memberRouter);
app.use("/api/v1", eventRouter);
app.use("/api/v1", testimonialRouter);
app.use("/api/v1", contactRouter);
app.use("/api/v1", certificateRouter);
app.use("/api/v1", templateRouter);
app.use("/api/v1", adminRoute);
app.use("/api/v1", mailRoute);
app.use("/api/v1", analyticsRoute);
app.use("/api/v1", recruitmentRouter);
app.use("/api/v1", blogRouter);
app.use("/api/v1", membersIdRouter);
app.use("/api/v1", eventRegistration);
app.use("/api/v1", quizRoute);
app.use("/api/v1", formRouter);
app.use("/api/v1", recruitmentFormRouter);
app.use("/api/v1", reviewRouter);

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

    res.cookie(
      "access_token",
      accessToken,
      accessTokenOptions
    );

    res.cookie(
      "refresh_token",
      refreshToken,
      refreshTokenOptions
    );

    const frontendHost =
      process.env.FRONTEND_HOST ||
      "http://localhost:3000";

    res.send(
      `<script>
        if (window.opener) {
          window.opener.postMessage({ success: true }, '*');
          window.close();
        } else {
          window.location.href = '${frontendHost}';
        }
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

app.all(
  "*",
  (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(
      `Route ${req.originalUrl} not found`
    ) as any;

    err.statusCode = 404;

    next(err);
  }
);

/* ---------------------------- ERROR MIDDLEWARE ---------------------------- */

app.use(ErrorMiddleware);
