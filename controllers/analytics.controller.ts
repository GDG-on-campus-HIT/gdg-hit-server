import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import userModel from "../models/user.model";
import ErrorHandler from "../utlis/ErrorHandler";
import { eventModel } from "../models/events.model";
import { eventRegistrationModel } from "../models/events.model";
import { certificateModel } from "../models/certificate.model";
import { IRecruitment, RecruitmentModel } from "../models/recruitment.model";

export const getUserAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Get monthly user registrations for the last 12 months
      const monthlyRegistrations = await userModel.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
        {
          $project: {
            month: {
              $concat: [
                {
                  $arrayElemAt: [
                    [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ],
                    { $subtract: ["$_id.month", 1] },
                  ],
                },
                "-",
                { $toString: "$_id.year" },
              ],
            },
            count: 1,
          },
        },
      ]);

      // 2. Get daily user registrations for the last month
      const dailyRegistrations = await userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        {
          $project: {
            date: {
              $concat: [
                { $toString: "$_id.day" },
                "-",
                {
                  $arrayElemAt: [
                    [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ],
                    { $subtract: ["$_id.month", 1] },
                  ],
                },
              ],
            },
            count: 1,
          },
        },
      ]);

      // 3. Get department-wise user registrations
      const departmentWiseRegistrations = await userModel.aggregate([
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            department: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]);

      // 4. Get total number of users
      const totalUsers = await userModel.countDocuments();

      // 5. Get role-based registration counts
      const roleWiseRegistrations = await userModel.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            role: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]);

      // 7. Get all users
      const allUsers = await userModel.find().sort({ createdAt: -1 });
      // .select("name email role createdAt");

      // Combine the results
      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          monthlyRegistrations,
          dailyRegistrations,
          departmentWiseRegistrations,
          roleWiseRegistrations,
          allUsers,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);


export const getRecruitmentAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // General Statistics
      const totalApplicants = await RecruitmentModel.countDocuments();
      const applicantsPerBranch = await RecruitmentModel.aggregate([
        { $group: { _id: "$generalInfo.branch", count: { $sum: 1 } } },
      ]);
      const applicantsPerYear = await RecruitmentModel.aggregate([
        { $group: { _id: "$generalInfo.branchYear", count: { $sum: 1 } } },
      ]);
      const applicantsPerPosition = await RecruitmentModel.aggregate([
        { $unwind: "$generalInfo.positions" },
        { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } },
      ]);
      const applicantsPerStatus = await RecruitmentModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Position-Specific Analytics
      const topAppliedPositions = await RecruitmentModel.aggregate([
        { $unwind: "$generalInfo.positions" },
        { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);
      const leastAppliedPositions = await RecruitmentModel.aggregate([
        { $unwind: "$generalInfo.positions" },
        { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } },
        { $sort: { count: 1 } },
        { $limit: 5 },
      ]);
      const multipleRoleApplicants = await RecruitmentModel.aggregate([
        {
          $addFields: {
            numPositionsApplied: {
              $cond: {
                if: { $isArray: "$generalInfo.positions" },
                then: { $size: "$generalInfo.positions" },
                else: 0
              }
            }
          }
        },
        { $match: { numPositionsApplied: { $gt: 1 } } },
        { $count: "multipleRoleApplicants" }
      ]);

      // Branch & Year-Based Analytics
      const mostPopularPositionPerBranch = await RecruitmentModel.aggregate([
        { $unwind: "$generalInfo.positions" },
        { $group: { _id: { branch: "$generalInfo.branch", position: "$generalInfo.positions" }, count: { $sum: 1 } } },
        { $sort: { "_id.branch": 1, count: -1 } },
        { $group: { _id: "$_id.branch", position: { $first: "$_id.position" } } },
      ]);
      const mostPopularPositionPerYear = await RecruitmentModel.aggregate([
        { $unwind: "$generalInfo.positions" },
        { $group: { _id: { year: "$generalInfo.branchYear", position: "$generalInfo.positions" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, count: -1 } },
        { $group: { _id: "$_id.year", position: { $first: "$_id.position" } } },
      ]);
      const branchHighestSelectionRate = await RecruitmentModel.aggregate([
        { $match: { status: "accepted" } },
        { $group: { _id: "$generalInfo.branch", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      const branchHighestRejectionRate = await RecruitmentModel.aggregate([
        { $match: { status: "rejected" } },
        { $group: { _id: "$generalInfo.branch", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      const yearWiseSelectionRate = await RecruitmentModel.aggregate([
        { $group: { _id: { year: "$generalInfo.branchYear", status: "$status" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.year", accepted: { $sum: { $cond: [ { $eq: ["$_id.status", "accepted"] }, "$count", 0 ] } }, total: { $sum: "$count" } } },
        { $project: { year: "$_id", selectionRate: { $multiply: [{ $divide: ["$accepted", "$total"] }, 100] } } },
      ]);

      // Application Timeline Analysis
      const applicationsOverTime = await RecruitmentModel.aggregate([
        { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
      ]);
      const peakApplicationHour = await RecruitmentModel.aggregate([
        { $group: { _id: { hour: { $hour: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      const avgShortlistingTime = await RecruitmentModel.aggregate([
        { $match: { status: "shortlisted" } },
        { $project: { diff: { $subtract: ["$updatedAt", "$createdAt"] } } },
        { $group: { _id: null, avgTime: { $avg: "$diff" } } },
      ]);
      const dailyApplications = await RecruitmentModel.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: {
                  $dateFromParts: {
                    year: "$_id.year",
                    month: "$_id.month",
                    day: "$_id.day"
                  }
                }
              }
            },
            count: 1
          }
        },
        { $sort: { date: 1 } } // Sort by date in ascending order
      ]);


      // Response
      res.status(200).json({
        success: true,
        data: {
          generalStatistics: {
            totalApplicants,
            applicantsPerBranch,
            applicantsPerYear,
            applicantsPerPosition,
            applicantsPerStatus,
          },
          positionSpecificAnalytics: {
            topAppliedPositions,
            leastAppliedPositions,
            multipleRoleApplicants,
          },
          branchYearBasedAnalytics: {
            mostPopularPositionPerBranch,
            mostPopularPositionPerYear,
            branchHighestSelectionRate,
            branchHighestRejectionRate,
            yearWiseSelectionRate,
          },
          applicationTimelineAnalysis: {
            applicationsOverTime,
            peakApplicationHour,
            avgShortlistingTime,
            dailyApplications
          },
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);



export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract query parameters for pagination and filtering
      const {
        page = 1,
        limit = 10,
        role,
        department,
        isVerified,
        name,
      } = req.query;

      // Build query object for filtering
      const query: any = {};

      if (role) {
        query.role = role;
      }
      if (department) {
        query.department = department;
      }
      if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true'; // Convert string 'true'/'false' to boolean
      }
      if (name) {
        query.name = { $regex: new RegExp(name as string, 'i') }; // Case-insensitive name search
      }

      // Convert page and limit to numbers
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Fetch total count for pagination
      const totalDocuments = await userModel.countDocuments(query);

      // Fetch user data with pagination and filtering
      const users = await userModel
        .find(query)
        .select('-password') // Exclude password field from response
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }); // Sort by creation date, newest first

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalDocuments / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      // Response
      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            totalDocuments,
            totalPages,
            currentPage: pageNum,
            pageSize: limitNum,
            hasNextPage,
            hasPrevPage,
          },
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);