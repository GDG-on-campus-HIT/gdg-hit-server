import { redis } from './../utlis/redis';
// get user by id

import { Response } from "express";
import userModel from "../models/user.model";


export const getUserById = async (id: string, res: Response) => {
    let userJson = null;
    try {
        userJson = await redis.get(id);
    } catch (err) {
        userJson = null;
    }

    if (userJson) {
        const user = JSON.parse(userJson);
        return res.status(200).json({
            success: true,
            user,
        });
    }

    // Fallback to Database if not found in Redis or Redis is down
    const user = await userModel.findById(id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    return res.status(200).json({
        success: true,
        user,
    });
};