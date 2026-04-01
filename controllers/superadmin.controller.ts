import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utlis/ErrorHandler";
import { AdminActivityLogModel } from "../models/adminActivityLog.model";

// Get all admins
export const getAllAdmins = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await userModel
        .find({ 
          role: { 
            $in: ["super_admin", "domain_lead", "super_domain_admin"] 
          } 
        })
        .select("-password")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        admins,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Add new admin
export const addAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password, role, assignedDomains } = req.body;

      if (!email || !name) {
        return next(new ErrorHandler("Email and name are required", 400));
      }

      const resolvedRole = (role || "domain_lead") as string;
      const domains: string[] = Array.isArray(assignedDomains) ? assignedDomains : [];

      if (
        (resolvedRole === "domain_lead") &&
        domains.length === 0
      ) {
        return next(
          new ErrorHandler(
            "At least one assigned domain is required for Domain Lead role",
            400
          )
        );
      }

      let finalPassword =
        typeof password === "string" && password.trim().length >= 6
          ? password.trim()
          : crypto.randomBytes(18).toString("base64url").slice(0, 22);

      // Check if user already exists
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return next(new ErrorHandler("User with this email already exists", 400));
      }

      // Create new admin user
      const newAdmin = await userModel.create({
        name,
        email,
        password: finalPassword,
        role: resolvedRole,
        assignedDomains: domains,
        isVerified: true,
      });

      // Log the action (Non-blocking to improve performance)
      AdminActivityLogModel.create({
        admin: (req.user as any)?._id,
        action: "add_admin",
        targetAdminId: newAdmin._id,
        targetAdminEmail: email,
        description: `Added new admin: ${name} (${email})`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }).catch(err => console.error("Error creating activity log:", err));

      res.status(201).json({
        success: true,
        message: "Admin added successfully",
        admin: {
          _id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          assignedDomains: newAdmin.assignedDomains,
          password: finalPassword,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Update admin role and domains
export const updateAdminRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminId, role, assignedDomains } = req.body;

      if (!adminId) {
        return next(new ErrorHandler("Admin ID is required", 400));
      }

      const admin = await userModel.findById(adminId);
      if (!admin) {
        return next(new ErrorHandler("Admin not found", 404));
      }

      // Prevent modifying super admin if not authorized
      if (admin.role === "super_admin" && req.user?.role !== "super_admin") {
        return next(new ErrorHandler("You cannot modify a super admin", 403));
      }

      const oldRole = admin.role;
      const oldDomains = admin.assignedDomains;

      if (role) admin.role = role;
      if (assignedDomains !== undefined) admin.assignedDomains = assignedDomains;

      const effectiveRole = admin.role;
      const effectiveDomains = admin.assignedDomains || [];
      if (
        (effectiveRole === "domain_lead") &&
        effectiveDomains.length === 0
      ) {
        return next(
          new ErrorHandler(
            "Domain Lead must have at least one assigned domain",
            400
          )
        );
      }

      await admin.save();

      // Log the action (Non-blocking to improve performance)
      AdminActivityLogModel.create({
        admin: (req.user as any)?._id,
        action: "update_status",
        targetAdminId: adminId,
        targetAdminEmail: admin.email,
        description: `Updated admin ${admin.email}: role (${oldRole} -> ${admin.role}), domains ([${oldDomains}] -> [${admin.assignedDomains}])`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }).catch(err => console.error("Error creating activity log:", err));

      res.status(200).json({
        success: true,
        message: "Admin updated successfully",
        admin,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Remove admin
export const removeAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminId } = req.params;

      // Validation
      if (!adminId) {
        return next(new ErrorHandler("Admin ID is required", 400));
      }

      const admin = await userModel.findById(adminId);
      if (!admin) {
        return next(new ErrorHandler("Admin not found", 404));
      }

      // Prevent removing super admin if super admin is not involved
      if (admin.role === "super_admin" && req.user?.role !== "super_admin") {
        return next(new ErrorHandler("You cannot remove a super admin", 403));
      }

      // Prevent super admin from removing themselves
      if ((admin as any)._id.toString() === (req.user as any)?._id.toString()) {
        return next(new ErrorHandler("You cannot remove yourself", 400));
      }

      const adminEmail = admin.email;
      const adminName = admin.name;

      // Remove the admin
      await userModel.findByIdAndDelete(adminId);

      // Log the action (Non-blocking to improve performance)
      AdminActivityLogModel.create({
        admin: (req.user as any)?._id,
        action: "remove_admin",
        targetAdminId: adminId,
        targetAdminEmail: adminEmail,
        description: `Removed admin: ${adminName} (${adminEmail})`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }).catch(err => console.error("Error creating activity log:", err));

      res.status(200).json({
        success: true,
        message: "Admin removed successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get admin activity logs (Super admin only)
export const getAdminActivityLogs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminId, action, startDate, endDate, limit = 50, page = 1 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = {};

      // Filter by admin if specified
      if (adminId) {
        query.admin = adminId;
      }

      // Filter by action type if specified
      if (action) {
        query.action = action;
      }

      // Filter by date range if specified
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      const logs = await AdminActivityLogModel.find(query)
        .populate("admin", "name email")
        .populate("candidateId", "generalInfo")
        .populate("targetAdminId", "name email")
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(skip);

      const total = await AdminActivityLogModel.countDocuments(query);

      res.status(200).json({
        success: true,
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get activity log summary (Super admin only)
export const getActivityLogSummary = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      const query: any = {};

      // Filter by date range if specified
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      // Get action counts
      const actionCounts = await AdminActivityLogModel.aggregate([
        { $match: query },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]);

      // Get admin activity counts
      const adminActivityCounts = await AdminActivityLogModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$admin",
            count: { $sum: 1 },
            shortlistCount: {
              $sum: { $cond: [{ $eq: ["$action", "shortlist"] }, 1, 0] },
            },
            rejectCount: {
              $sum: { $cond: [{ $eq: ["$action", "reject"] }, 1, 0] },
            },
            acceptCount: {
              $sum: { $cond: [{ $eq: ["$action", "accept"] }, 1, 0] },
            },
          },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "adminInfo" } },
      ]);

      const totalLogs = await AdminActivityLogModel.countDocuments(query);

      res.status(200).json({
        success: true,
        summary: {
          totalLogs,
          actionCounts,
          adminActivityCounts,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get specific admin's activity logs
export const getSpecificAdminActivityLogs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminId } = req.params;
      const { limit = 50, page = 1 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Verify admin exists
      const admin = await userModel.findById(adminId);
      if (!admin) {
        return next(new ErrorHandler("Admin not found", 404));
      }

      const logs = await AdminActivityLogModel.find({ admin: adminId })
        .populate("candidateId", "generalInfo")
        .populate("targetAdminId", "name email")
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(skip);

      const total = await AdminActivityLogModel.countDocuments({ admin: adminId });

      res.status(200).json({
        success: true,
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
        },
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
