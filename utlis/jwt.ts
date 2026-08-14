require('dotenv').config();
import { IUser } from "../models/user.model";
import { Response } from "express";
import { redis } from "./redis";

interface ITokenOptions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none" | undefined;
    secure?: boolean;
    hostOnly?: boolean;
    domain?: string;
}

const accessTokenExpire = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "1200", 10
);

const refreshTokenExpire = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "1200", 10
);

export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    hostOnly: false,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV === "production" && { domain: process.env.COOKIE_DOMAIN || ".gdghit.dev" }),
};

export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    hostOnly: false,
    secure: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV === "production" && { domain: process.env.COOKIE_DOMAIN || ".gdghit.dev" }),
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAcessToken();
    const refreshToken = user.SignRefreshToken();

    redis.set(user._id as any, JSON.stringify(user) as any);

    // if(process.env.NODE_ENV === 'producttion'){
    //     accessTokenOptions.secure = true;
    // }

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    res.status(statusCode).json({
        success: true,
        user,
        accessToken
    })
}

