require("dotenv").config();
import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import { ErrorMiddleware } from "./middleware/error";
import { rateLimit } from "express-rate-limit";
import userRouter from "./routes/user.route";
import passport from "passport";
import "./config/google.strategy";
import { accessTokenOptions, refreshTokenOptions } from "./utlis/jwt";
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

app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.setTimeout(0); // Disable timeout
  next();
});

app.set("trust proxy", true);
app.enable("trust proxy");

app.use(cookieParser());

// cors = cross origin resource sharing
app.use(
  cors({
    origin: ["http://localhost:3000","https://gdg-on-campus-hit.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// api request limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

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

//google auth route
app.get(
  "/auth/google",
  (req, res, next) => {
    const redirectTo = req.query.redirectTo || "/";
    res.cookie("redirectTo", redirectTo, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
    });
    next();
  },
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
  function (req, res) {
    const { user, accessToken, refreshToken } = req.user as any;

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, accessTokenOptions);

    let redirectUrl = req.cookies.redirect_url || "/";

    // Ensure redirect URL points to frontend (localhost:3000)
    redirectUrl = `http://localhost:3000${decodeURIComponent(redirectUrl)}`;

    res.clearCookie("redirect_url");
    res.send(
      `<script>
      window.opener.postMessage({ success: true, redirectUrl: '${redirectUrl}' }, '*');
      window.close();
    </script>`
    );
  }
);

// testing api
app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Hello Server",
  });
});

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

//unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

// middleware calls
app.use(limiter);
app.use(ErrorMiddleware);
