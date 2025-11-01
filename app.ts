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
import blogRouter from "./routes/blog.route";
import formRouter from "./routes/form.route";

import swaggerUi from 'swagger-ui-express';
import eventRegistration from "./routes/eventregistration.route";
import quizRoute from "./routes/quiz.route";
import membersIdRouter from "./routes/membersId.route";
// const swaggerDocument = require('./swagger-output.json');


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
    origin: [
      "http://localhost:3000",
      // "https://gdg-on-campus-hit.vercel.app",
      "https://gdghit.site",
      "https://admin.gdghit.site",
      "https://gdg-hit-main-ffch.vercel.app/",
      "https://blog.gdghit.site",
      "https://my-admin-panel-livid.vercel.app/",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// app.get('/docs-json', (req, res) => {
//     res.json(swaggerDocument);
// });


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
app.use("/api/v1",eventRegistration);
app.use("/api/v1", quizRoute)
app.use("/api/v1", formRouter)

//google auth route
app.get(
  "/auth/google",
  // (req, res, next) => {
  //   const redirectTo = req.query.redirectTo || "/";
  //   res.cookie("redirectTo", redirectTo, {
  //     httpOnly: false,
  //     secure: true,
  //     sameSite: "none",
  //     maxAge: 10 * 60 * 1000,
  //     ...(process.env.NODE_ENV === "production" && { domain: ".gdghit.site" }),
  //   });
  //   next();
  // },
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

    let redirectUrl = req.cookies.redirectTo || "/";

    // Ensure redirect URL points to frontend (localhost:3000)
    if (!redirectUrl.startsWith("http")) {
     
      redirectUrl = `https://gdghit.site${decodeURIComponent(redirectUrl)}`;
  
    }
    // redirectUrl = `${process.env.FRONTEND_HOST}${decodeURIComponent(redirectUrl)}`;

    res.clearCookie("redirectTo");
    res.send(
      `<script>
      window.opener.postMessage({ success: true, redirectUrl: '${redirectUrl}' }, 'https://gdghit.site');
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
