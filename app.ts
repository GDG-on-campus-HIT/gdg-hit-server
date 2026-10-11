require("dotenv").config();

// Load before routes/models so Mongoose buffer timeout applies to all operations
import "./utlis/db";

import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import { rateLimit } from "express-rate-limit";
import Jwt, { JwtPayload } from "jsonwebtoken";

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

// `true` would make req.ip the client-controlled leftmost X-Forwarded-For entry
app.set("trust proxy", parseInt(process.env.TRUST_PROXY_HOPS || "1", 10));

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

const ADMIN_ROLES = new Set(["domain_lead", "super_domain_admin", "super_admin"]);
const tokenUserCache = new WeakMap<Request, { id: string; role?: string } | null>();

// Signature-verified only (no DB hit); used to key the limiter per account instead of per IP,
// since many students share a campus/hostel IP.
const getTokenUser = (req: Request) => {
  if (tokenUserCache.has(req)) return tokenUserCache.get(req) ?? null;
  let token = req.cookies?.access_token as string | undefined;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  let user: { id: string; role?: string } | null = null;
  if (token) {
    try {
      const decoded = Jwt.verify(token, process.env.ACCESS_TOKEN as string) as JwtPayload;
      if (decoded?.id) user = { id: String(decoded.id), role: decoded.role };
    } catch {
      user = null;
    }
  }
  tokenUserCache.set(req, user);
  return user;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req: Request) => {
    const user = getTokenUser(req);
    if (!user) return 100;
    return user.role && ADMIN_ROLES.has(user.role) ? 2000 : 300;
  },
  keyGenerator: (req: Request) => {
    const user = getTokenUser(req);
    return user ? `user:${user.id}` : req.ip || "unknown";
  },

  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many submissions. Please try again later." },
});

if (process.env.NODE_ENV === "production") {
  app.use(limiter);
  app.use(
    [
      "/api/v1/login",
      "/api/v1/registration",
      "/api/v1/activate-user",
      "/api/v1/reset-password-link",
      "/api/v1/reset-password",
    ],
    authLimiter
  );
  app.post(["/api/v1/contact", "/api/v1/testimonial"], publicFormLimiter);
}

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

// The frontend sends the page to return to; it's carried through Google as the OAuth
// `state` and only honoured for origins on the CORS allow-list (no open redirect).
const safeRedirect = (raw: unknown): string | null => {
  try {
    const url = new URL(String(raw));
    return allowedOrigins.includes(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
};

const encodeOAuthState = (redirect: string) =>
  Buffer.from(JSON.stringify({ r: redirect })).toString("base64url");

const decodeOAuthState = (state: unknown): string | null => {
  try {
    return safeRedirect(JSON.parse(Buffer.from(String(state), "base64url").toString()).r);
  } catch {
    return null;
  }
};

app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
  const redirect = safeRedirect(req.query.redirect);
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    prompt: "select_account",
    ...(redirect && { state: encodeOAuthState(redirect) }),
  })(req, res, next);
});

app.get("/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
  const redirect = decodeOAuthState(req.query.state);
  const frontendHost = process.env.FRONTEND_HOST || "http://localhost:3000";

  passport.authenticate("google", { session: false }, (err: unknown, result: any) => {
    if (err || !result) {
      console.log("Google sign-in failed:", err);
      const failure = new URL("/login", redirect ? new URL(redirect).origin : frontendHost);
      failure.searchParams.set("error", "google");
      return res.redirect(failure.toString());
    }

    res.cookie("access_token", result.accessToken, accessTokenOptions);
    res.cookie("refresh_token", result.refreshToken, refreshTokenOptions);

    if (redirect) return res.redirect(redirect);

    // Legacy popup flow (older frontends)
    res.send(
      `<script>
        if (window.opener) {
          window.opener.postMessage({ success: true }, '*');
          window.close();
        } else {
          window.location.href = ${JSON.stringify(frontendHost)};
        }
      </script>`
    );
  })(req, res, next);
});

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
