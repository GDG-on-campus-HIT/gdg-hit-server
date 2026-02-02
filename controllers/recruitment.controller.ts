import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { IRecruitment, RecruitmentModel } from "../models/recruitment.model";
import userModel, { IUser } from "../models/user.model";
import mongoose, { Document } from "mongoose";


// Get all applications with filtering
export const getApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, branch, positions } = req.query;
      const query: any = {};

      if (status) query.status = status;
      if (branch) query["generalInfo.branch"] = branch;
      if (positions) query["generalInfo.positions"] = { $in: [positions] };

      const applications = await RecruitmentModel.find(query).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        applications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

// Submit new application
export const submitApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("📨 Received recruitment form submission");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("User authenticated:", !!req.user);
      console.log("User ID:", req.user?._id);

      const { generalInfo, roleSpecific, finalInfo, formId } = req.body;

      console.log("Extracted fields:", {
        generalInfo,
        roleSpecific,
        finalInfo,
        formId
      });

      if (!req.user) {
        return next(new ErrorHandler("User authentication failed.", 401));
      }

      const userId = req.user?._id;

      if (!userId) {
        return next(new ErrorHandler("User ID is missing in request.", 400));
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      // console.log("Checking for existing application...");
      const existingApplication = await RecruitmentModel.findOne({
        $or: [{ "generalInfo.email": generalInfo.email }, { user: user._id }],
      });

      if (existingApplication) {
        return next(
          new ErrorHandler(
            `Application already exists with this ${existingApplication.generalInfo.email === generalInfo.email
              ? "email"
              : "roll number"
            }`,
            400
          )
        );
      }

      // console.log("Validating general information...");
      const requiredGeneralFields = [
        "fullName",
        "email",
        "phoneNumber",
        "rollNumber",
        "branch",
        "branchYear",
        "positions",
      ];

      for (const field of requiredGeneralFields) {
        if (!generalInfo?.[field]) {
          return next(new ErrorHandler(`${field} is required`, 400));
        }
      }

      // console.log("Checking and updating user roll number and branch...");
      // Check and update user roll number and branch
      if (
        generalInfo.rollNumber !== user.classRollNo ||
        generalInfo.branch !== user.department
      ) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              classRollNo: generalInfo.rollNumber,
              department: generalInfo.branch,
            },
          },
          { new: true }
        );
      }

      // Update user's LinkedIn and GitHub profiles
      if (finalInfo?.linkedIn || finalInfo?.portfolio) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              linkedinProfile: finalInfo.linkedIn || user.linkedinProfile,
              githubProfile: finalInfo.portfolio || user.githubProfile,
            },
          },
          { new: true }
        );
      }

      // console.log("Validating role-specific information...");
      // Validate role-specific information
      const roleSpecificData: any = {};
      generalInfo.positions.forEach((position: string) => {
        if (roleSpecific?.[position]) {
          roleSpecificData[position] = roleSpecific[position];
        }
      });

      // console.log("Creating new application...");
      const application = await RecruitmentModel.create({
        user: userId,
        formId,
        generalInfo,
        roleSpecific: roleSpecificData,
        finalInfo,
        status: "pending",
      });

      // console.log("Application created successfully:", application);

      res.status(201).json({
        success: true,
        application,
      });
    } catch (error: any) {
      // console.error("Error occurred:", error);

      if (error.code === 11000) {
        return next(
          new ErrorHandler(
            "An application with this email or roll number already exists",
            400
          )
        );
      }

      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Update application status
export const updateApplicationStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "shortlisted", "rejected", "accepted"];
      if (!validStatuses.includes(status)) {
        return next(new ErrorHandler("Invalid status", 400));
      }

      const application = await RecruitmentModel.findById(id);
      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      application.status = status;
      await application.save();

      res.status(200).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Delete application
export const deleteApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const application = await RecruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      await RecruitmentModel.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Application deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get single application
export const getApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const application = await RecruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      res.status(200).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
export const checkUserRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Build query based on provided parameters
      const query: any = {
        $or: [],
      };

      if (req?.user?._id) {
        query.$or.push({ user: req?.user?._id });
      }

      const existingApplication = await RecruitmentModel.findOne(query);

      res.status(200).json({
        success: true,
        isRegistered: !!existingApplication,
        application: existingApplication
          ? {
            id: existingApplication._id,
            status: existingApplication.status,
            positions: existingApplication.generalInfo.positions,
          }
          : null,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Deepak ----------?
export const getAllRecruitmentData = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract query parameters for pagination and filtering
      const {
        page = 1,
        limit = 10,
        branch,
        year,
        status,
        position,
        formId,
      } = req.query;

      // Build query object for filtering
      const query: any = {};

      if (formId) {
        query.formId = formId;
      }
      if (branch) {
        query["generalInfo.branch"] = branch;
      }
      if (year) {
        query["generalInfo.branchYear"] = year;
      }
      if (status) {
        query.status = status;
      }
      if (position) {
        query["generalInfo.positions"] = { $in: [position] }; // Match any document where position is in the positions array
      }

      // Convert page and limit to numbers
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Fetch total count for pagination
      const totalDocuments = await RecruitmentModel.countDocuments(query);

      // Fetch recruitment data with pagination and filtering
      const recruitmentData = await RecruitmentModel.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }); // Sort by creation date, newest first

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalDocuments / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      let positionStats: any[] = [];
      if (req.query.includeStats === 'true' && formId) {
        positionStats = await RecruitmentModel.aggregate([
          { $match: { formId: new mongoose.Types.ObjectId(formId as string) } },
          { $unwind: "$generalInfo.positions" },
          { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } }
        ]);
      }

      // Response
      res.status(200).json({
        success: true,
        data: {
          recruitmentData,
          positionStats,
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

export const searchRecruitmentData = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, page = 1, limit = 10, branch, year, position, status } = req.query;
      const query: any = {};

      // Advanced search across multiple fields
      if (q) {
        const searchRegex = new RegExp(q as string, "i"); // Case-insensitive
        query.$or = [
          { "generalInfo.fullName": searchRegex },
          { "generalInfo.email": searchRegex },
          { "generalInfo.rollNumber": searchRegex },
        ];
      }

      // Additional filters
      if (branch) query["generalInfo.branch"] = branch;
      if (year) query["generalInfo.branchYear"] = year;
      if (position) query["generalInfo.positions"] = { $in: [position] };
      if (status) query.status = status; // Add status filter

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const totalDocuments = await RecruitmentModel.countDocuments(query);
      const recruitmentData = await RecruitmentModel.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      const totalPages = Math.ceil(totalDocuments / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.status(200).json({
        success: true,
        data: {
          recruitmentData,
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

type RecruitmentDocument = Document<any, any, IRecruitment> & IRecruitment;

interface UpdateRequest extends Request {
  params: {
    id: string;
  };
  body: Partial<IRecruitment>;
}

interface UpdateResponse {
  success: boolean;
  data?: Partial<IRecruitment>;
  message?: string;
  statusCode?: number;
}

// Flatten update data to use dot notation
const flattenUpdateData = (
  data: Partial<IRecruitment>
): Record<string, any> => {
  const flattened: Record<string, any> = {};

  if (data.generalInfo) {
    for (const [key, value] of Object.entries(data.generalInfo)) {
      flattened[`generalInfo.${key}`] = value;
    }
  }

  if (data.roleSpecific) {
    for (const [role, fields] of Object.entries(data.roleSpecific)) {
      if (fields) {
        for (const [field, value] of Object.entries(fields)) {
          flattened[`roleSpecific.${role}.${field}`] = value;
        }
      }
    }
  }

  if (data.finalInfo) {
    for (const [key, value] of Object.entries(data.finalInfo)) {
      flattened[`finalInfo.${key}`] = value;
    }
  }

  if (data.status) flattened.status = data.status;
  if (data.user) flattened.user = data.user;

  return flattened;
};

export const updateRecruitmentData = CatchAsyncError(
  async (
    req: UpdateRequest,
    res: Response<UpdateResponse>,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const updateData: Partial<IRecruitment> = req.body;

      // Validate ID
      if (!id || typeof id !== "string") {
        return next(new ErrorHandler("Invalid or missing recruitment ID", 400));
      }

      // Basic validation for updateData
      if (Object.keys(updateData).length === 0) {
        return next(new ErrorHandler("No update data provided", 400));
      }

      // Validate status if provided
      if (
        updateData.status &&
        !["pending", "shortlisted", "rejected", "accepted"].includes(
          updateData.status
        )
      ) {
        return next(new ErrorHandler("Invalid status value", 400));
      }

      // Flatten the update data to use dot notation
      const flattenedUpdate = flattenUpdateData(updateData);

      // Update only the provided fields
      const updatedRecruitment: RecruitmentDocument | null =
        await RecruitmentModel.findByIdAndUpdate(
          id,
          { $set: flattenedUpdate },
          { new: true, runValidators: false } // Skip validation for partial updates
        );

      if (!updatedRecruitment) {
        return next(new ErrorHandler("Recruitment record not found", 404));
      }

      // Convert to plain object for response
      const responseData: Partial<IRecruitment> = {
        _id: updatedRecruitment._id.toString(),
        user: updatedRecruitment.user,
        generalInfo: updatedRecruitment.generalInfo,
        roleSpecific: updatedRecruitment.roleSpecific || {},
        finalInfo: updatedRecruitment.finalInfo || {},
        status: updatedRecruitment.status,
        createdAt: updatedRecruitment.createdAt,
        updatedAt: updatedRecruitment.updatedAt,
      };

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error: any) {
      // Handle duplicate key error specifically
      if (error.code === 11000) {
        return next(
          new ErrorHandler("Duplicate key error: email must be unique", 400)
        );
      }
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface UserWithApplication {
  id: string;
  name: string;
  email: string;
  branch: string;
  branchYear: string;
  hasApplied: boolean;
  positions: string[];
  status: string;
}

interface Pagination {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}


export const getAllUsersWithApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        q = "",
        page = "1",
        limit = "10",
        branch,
        year,
        hasApplied,
      } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Build user query with filters
      const userQuery: any = {};
      if (q) {
        userQuery.name = { $regex: q, $options: "i" }; // Case-insensitive search
      }
      if (branch) {
        userQuery.department = branch;
      }

      // Fetch users with pagination
      const totalUsers = await userModel.countDocuments(userQuery);
      const users = await userModel
        .find(userQuery)
        .select("name email classRollNo department")
        .skip(skip)
        .limit(limitNum);

      // Fetch all recruitment applications
      const applications = await RecruitmentModel.find().select(
        "user generalInfo.positions status generalInfo.branchYear"
      );

      // Map users to include application status
      const usersWithApplications = users
        .map((user: any) => {
          const application = applications.find(
            (app) => app.user.toString() === user._id.toString()
          );
          const userData = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            branch: user.department || "NA",
            branchYear: application
              ? application.generalInfo.branchYear || "NA"
              : "NA",
            hasApplied: !!application,
            positions: application ? application.generalInfo.positions : [],
            status: application ? application.status : "Not Applied",
          };

          // Apply hasApplied filter
          if (hasApplied === "applied" && !userData.hasApplied) return null;
          if (hasApplied === "not-applied" && userData.hasApplied) return null;

          // Apply year filter (from RecruitmentModel if applied)
          if (year && year !== "all" && userData.branchYear !== year)
            return null;

          return userData;
        })
        .filter((user) => user !== null); // Remove null entries from filters

      const totalFilteredUsers = usersWithApplications.length;
      const totalPages = Math.ceil(totalUsers / limitNum);
      const filteredUsers = usersWithApplications.slice(0, limitNum); // Apply limit after filtering

      const pagination: Pagination = {
        totalDocuments: totalUsers,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      };

      res.status(200).json({
        success: true,
        data: {
          usersData: filteredUsers,
          pagination,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
