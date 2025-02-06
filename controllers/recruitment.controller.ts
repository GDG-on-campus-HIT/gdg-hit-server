import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { recruitmentModel } from "../models/recruitment.model";

interface IRecruitment {
  name: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  skills: string[];
  experience: string;
  status: "pending" | "shortlisted" | "rejected" | "accepted";
}

// Get all applications with filtering
export const getApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, department } = req.query;
      const query: any = {};

      if (status) query.status = status;
      if (department) query.department = department;

      const applications = await recruitmentModel
        .find(query)
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        applications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

// Submit new application (without image uploading)
export const submitApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, department, year, skills, experience } =
        req.body as IRecruitment;

      // Validation
      const requiredFields = {
        name: "Name is required",
        email: "Email is required",
        phone: "Phone number is required",
        department: "Department is required",
        year: "Year is required",
        skills: "Skills are required",
      };

      for (const [key, message] of Object.entries(requiredFields)) {
        if (!req.body[key]) {
          return next(new ErrorHandler(message, 400));
        }
      }

      const application = await recruitmentModel.create({
        name,
        email,
        phone,
        department,
        year,
        skills,
        experience,
        status: "pending",
      });

      res.status(201).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
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

      const application = await recruitmentModel.findById(id);
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
      const application = await recruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      await recruitmentModel.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Application deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
