import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { RecruitmentModel } from "../models/recruitment.model";
import userModel from "../models/user.model";

// Get all applications with filtering
export const getApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, branch, positions } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (branch) query["generalInfo.branch"] = branch;
    if (positions) query["generalInfo.positions"] = { $in: positions };

    const applications = await RecruitmentModel.find(query).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      applications,
    });
  }
);

// Submit new application
export const submitApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { generalInfo, gdgPerspective, roleSpecific, finalInfo } = req.body;

      // Get user ID from authenticated request
      const userId = (req.user as { _id: string })._id;
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Check for existing application
      const existingApplication = await RecruitmentModel.findOne({
        $or: [
          { "generalInfo.email": generalInfo.email },
          { "generalInfo.rollNumber": generalInfo.rollNumber },
          { userId: userId },
        ],
      });

      if (existingApplication) {
        return next(
          new ErrorHandler(
            `Application already exists with this ${
              existingApplication.generalInfo.email === generalInfo.email
                ? "email"
                : "roll number"
            }`,
            400
          )
        );
      }

      // Validate required fields
      const requiredGeneralFields: Record<string, string> = {
        fullName: "Full name is required",
        email: "Email is required",
        phoneNumber: "Phone number is required",
        rollNumber: "Roll number is required",
        branch: "Branch is required",
        branchYear: "Year is required",
        positions: "At least one position is required",
      };

      for (const [key, message] of Object.entries(requiredGeneralFields)) {
        if (!generalInfo?.[key]) {
          return next(new ErrorHandler(message, 400));
        }
      }

      // Validate GDG perspective fields
      if (!gdgPerspective?.gdgPerspective || !gdgPerspective?.eventIdeas) {
        return next(
          new ErrorHandler("GDG perspective and event ideas are required", 400)
        );
      }

      // Validate final info
      if (!finalInfo?.timeCommitment || !finalInfo?.reasonToJoin) {
        return next(
          new ErrorHandler(
            "Time commitment and reason to join are required",
            400
          )
        );
      }

      // Process role-specific data
      const roleSpecificData: any = {};
      generalInfo.positions.forEach((position: string) => {
        if (roleSpecific?.[position]) {
          roleSpecificData[position] = roleSpecific[position];
        }
      });

      // Create new application with user reference
      const application = await RecruitmentModel.create({
        userId,
        generalInfo,
        gdgPerspective,
        roleSpecific: roleSpecificData,
        finalInfo,
        status: "pending",
        appliedAt: new Date(),
      });

      // Update user model if needed
      if (
        generalInfo.rollNumber !== user.classRollNo ||
        generalInfo.branch !== user.department ||
        generalInfo.phoneNumber !== user.whatsappNo
      ) {
        await userModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              classRollNo: generalInfo.rollNumber,
              department: generalInfo.branch,
              whatsappNo: generalInfo.phoneNumber,
            },
          },
          { new: true }
        );
      }

      res.status(201).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          error.message || "Something went wrong. Please try again.",
          400
        )
      );
    }
  }
);

// Update application status
export const updateApplicationStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

// Delete application
export const deleteApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

// Get single application
export const getApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const application = await RecruitmentModel.findById(id);

    if (!application) {
      return next(new ErrorHandler("Application not found", 404));
    }

    res.status(200).json({
      success: true,
      application,
    });
  }
);

// Check if a user is registered
export const checkUserRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, rollNumber } = req.query;

    if (!email && !rollNumber) {
      return next(
        new ErrorHandler("Email or Roll Number is required for checking", 400)
      );
    }

    const query: any = {
      $or: [],
    };

    if (email) query.$or.push({ "generalInfo.email": email });
    if (rollNumber) query.$or.push({ "generalInfo.rollNumber": rollNumber });

    const existingApplication = await RecruitmentModel.findOne(query);

    res.status(200).json({
      success: true,
      isRegistered: !!existingApplication,
      application: existingApplication
        ? {
            id: existingApplication._id,
            status: existingApplication.status,
            positions: existingApplication.positions,
          }
        : null,
    });
  }
);
