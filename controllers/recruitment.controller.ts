import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { IDomainStatus, IRecruitment, RecruitmentModel, RecruitmentStatus } from "../models/recruitment.model";
import { RecruitmentFormModel } from "../models/recruitmentForm.model";
import userModel, { IUser } from "../models/user.model";
import mongoose, { Document } from "mongoose";
import { AdminActivityLogModel } from "../models/adminActivityLog.model";
import { canAccessAllDomains, canAccessAnyDomain, canAccessDomain, hasGlobalDomainAccess } from "../middleware/rbac";
import { asString, escapeRegex } from "../utlis/query";

const VALID_STATUSES: RecruitmentStatus[] = ["pending", "shortlisted", "rejected", "accepted"];

const isValidStatus = (value: string): value is RecruitmentStatus => {
  return VALID_STATUSES.includes(value as RecruitmentStatus);
};

const normalizeDomain = (domain: string): string => domain.trim().toLowerCase();

const computeOverallStatus = (statuses: RecruitmentStatus[]): RecruitmentStatus => {
  if (statuses.length === 0) return "pending";
  if (statuses.every((status) => status === "accepted")) return "accepted";
  if (statuses.every((status) => status === "rejected")) return "rejected";
  if (statuses.some((status) => status === "shortlisted" || status === "accepted")) {
    return "shortlisted";
  }
  return "pending";
};

const buildDefaultDomainStatuses = (
  positions: string[],
  userId?: mongoose.Types.ObjectId
): IDomainStatus[] => {
  return positions.map((position) => ({
    domain: position,
    status: "pending",
    updatedBy: userId,
    updatedAt: new Date(),
  }));
};


// Get all applications with filtering
export const getApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = asString(req.query.status);
      const branch = asString(req.query.branch);
      const positions = asString(req.query.positions);
      const domain = asString(req.query.domain);
      const query: any = {};

      if (status && domain) {
        query.domainStatuses = {
          $elemMatch: {
            domain: domain,
            status: status,
          },
        };
      } else if (status) {
        query.status = status;
      }
      if (branch) query["generalInfo.branch"] = branch;

      const domainRestriction = req.query.domainRestriction as string[] | undefined;

      if (domainRestriction && domainRestriction.length > 0) {
        if (positions) {
          query["generalInfo.positions"] = { $in: [positions] };
        } else {
          query["generalInfo.positions"] = { $in: domainRestriction };
        }
      } else if (positions) {
        query["generalInfo.positions"] = { $in: [positions] };
      }

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

      // Fetch WhatsApp group links for selected positions/domains
      let whatsappGroupLinks: Record<string, string> = {};
      if (formId) {
        const recruitmentForm = await RecruitmentFormModel.findById(formId);
        if (recruitmentForm && recruitmentForm.roles) {
          // Map selected positions to their WhatsApp links
          generalInfo.positions.forEach((selectedPosition: string) => {
            const roleData = recruitmentForm.roles.find(
              (role) => role.roleName === selectedPosition
            );
            if (roleData && roleData.whatsappLink) {
              whatsappGroupLinks[selectedPosition] = roleData.whatsappLink;
            }
          });
        }
      }

      // console.log("Creating new application...");
      const application = await RecruitmentModel.create({
        user: userId,
        formId,
        generalInfo,
        roleSpecific: roleSpecificData,
        finalInfo,
        whatsappGroupLinks,
        status: "pending",
        domainStatuses: buildDefaultDomainStatuses(generalInfo.positions, user._id),
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
      const { status, domain, remarks } = req.body;

      if (!isValidStatus(status)) {
        return next(new ErrorHandler("Invalid status", 400));
      }

      if (!domain || typeof domain !== "string") {
        return next(new ErrorHandler("Domain is required to update status", 400));
      }

      const application = await RecruitmentModel.findById(id);
      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      const matchedDomain = application.generalInfo.positions.find(
        (position) => normalizeDomain(position) === normalizeDomain(domain)
      );

      if (!matchedDomain) {
        return next(new ErrorHandler("Candidate has not applied for the provided domain", 400));
      }

      if (!canAccessDomain(req.user, matchedDomain)) {
        return next(new ErrorHandler(`You do not have access to the "${matchedDomain}" domain`, 403));
      }

      if (!Array.isArray(application.domainStatuses) || application.domainStatuses.length === 0) {
        application.domainStatuses = buildDefaultDomainStatuses(application.generalInfo.positions);
      }

      let domainStatusRecord = application.domainStatuses.find(
        (item) => normalizeDomain(item.domain) === normalizeDomain(matchedDomain)
      );

      if (!domainStatusRecord) {
        application.domainStatuses.push({
          domain: matchedDomain,
          status: "pending",
          updatedAt: new Date(),
        });
        domainStatusRecord = application.domainStatuses[application.domainStatuses.length - 1];
      }

      const oldDomainStatus = domainStatusRecord.status;
      const oldOverallStatus = application.status;

      domainStatusRecord.status = status;
      domainStatusRecord.updatedBy = req.user?._id as any;
      domainStatusRecord.updatedAt = new Date();
      if (typeof remarks === "string") {
        domainStatusRecord.remarks = remarks;
      }

      const statusByDomain = application.generalInfo.positions.map((position) => {
        const existing = application.domainStatuses.find(
          (item) => normalizeDomain(item.domain) === normalizeDomain(position)
        );
        return (existing?.status || "pending") as RecruitmentStatus;
      });

      application.status = computeOverallStatus(statusByDomain);
      await application.save();

      // Log admin activity
      if (req.user) {
        const actionMap: Record<string, string> = {
          shortlisted: "shortlist",
          rejected: "reject",
          accepted: "accept",
          pending: "update_status",
        };

        await AdminActivityLogModel.create({
          admin: req.user._id,
          action: actionMap[status] || "update_status",
          candidateId: id,
          candidateName: application.generalInfo.fullName,
          candidateEmail: application.generalInfo.email,
          domain: matchedDomain,
          oldStatus: oldDomainStatus,
          newStatus: status,
          description: `Updated ${matchedDomain} status from "${oldDomainStatus}" to "${status}" for ${application.generalInfo.fullName}. Overall: "${oldOverallStatus}" -> "${application.status}"`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
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

// Delete application
export const deleteApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const application = await RecruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      // Deleting removes the candidate from every domain they applied to
      if (!canAccessAllDomains(req.user, application.generalInfo.positions)) {
        return next(
          new ErrorHandler("You can only delete applications where every applied domain is assigned to you", 403)
        );
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

      const isOwner = application.user?.toString() === req.user?._id?.toString();
      if (!isOwner && !canAccessAnyDomain(req.user, application.generalInfo.positions)) {
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

      // If application exists, get WhatsApp links
      let whatsappGroupLinks: Record<string, string> = {};
      if (existingApplication) {
        // Always fetch from the recruitment form to ensure latest/correct links
        if (existingApplication.formId) {
          const recruitmentForm = await RecruitmentFormModel.findById(existingApplication.formId);
          if (recruitmentForm && recruitmentForm.roles && recruitmentForm.roles.length > 0) {
            // Map selected positions to their WhatsApp links
            existingApplication.generalInfo.positions.forEach((selectedPosition: string) => {
              const roleData = recruitmentForm.roles.find(
                (role) => role.roleName === selectedPosition
              );
              if (roleData && roleData.whatsappLink) {
                whatsappGroupLinks[selectedPosition] = roleData.whatsappLink;
              }
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        isRegistered: !!existingApplication,
        application: existingApplication
          ? {
            id: existingApplication._id,
            status: existingApplication.status,
            domainStatuses: existingApplication.domainStatuses || [],
            positions: existingApplication.generalInfo.positions,
            whatsappGroupLinks, // WhatsApp links for selected positions
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
      const { page = 1, limit = 10 } = req.query;
      const branch = asString(req.query.branch);
      const year = asString(req.query.year);
      const status = asString(req.query.status);
      const position = asString(req.query.position);
      const formId = asString(req.query.formId);
      const q = asString(req.query.q);

      // Build query object for filtering
      const query: any = {};

      if (q) {
        const searchRegex = new RegExp(escapeRegex(q), "i");
        query.$or = [
          { "generalInfo.fullName": searchRegex },
          { "generalInfo.email": searchRegex },
          { "generalInfo.rollNumber": searchRegex },
          { "generalInfo.phoneNumber": searchRegex },
        ];
      }

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
        if (position) {
          query.domainStatuses = {
            $elemMatch: {
              domain: position,
              status,
            },
          };
        } else {
          query.status = status;
        }
      }
      const domainRestriction = req.query.domainRestriction as string[] | undefined;

      if (domainRestriction && domainRestriction.length > 0) {
        if (position) {
          query["generalInfo.positions"] = { $in: [position] };
        } else {
          query["generalInfo.positions"] = { $in: domainRestriction };
        }
      } else if (position) {
        query["generalInfo.positions"] = { $in: [position] };
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
      if (req.query.includeStats === "true" && formId) {
        // Build stats match from the same filters as the main query
        const statsMatch: Record<string, unknown> = { ...query };
        
        // Ensure formId is an ObjectId for aggregation
        if (statsMatch.formId) {
          statsMatch.formId = new mongoose.Types.ObjectId(statsMatch.formId as string);
        }
        
        positionStats = await RecruitmentModel.aggregate([
          { $match: statsMatch },
          { $unwind: "$generalInfo.positions" },
          ...(domainRestriction && domainRestriction.length > 0
            ? [{ $match: { "generalInfo.positions": { $in: domainRestriction } } }]
            : []),
          { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } },
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
      const { page = 1, limit = 10 } = req.query;
      const q = asString(req.query.q);
      const branch = asString(req.query.branch);
      const year = asString(req.query.year);
      const position = asString(req.query.position);
      const status = asString(req.query.status);
      const query: any = {};

      // Advanced search across multiple fields
      if (q) {
        const searchRegex = new RegExp(escapeRegex(q), "i"); // Case-insensitive
        query.$or = [
          { "generalInfo.fullName": searchRegex },
          { "generalInfo.email": searchRegex },
          { "generalInfo.rollNumber": searchRegex },
        ];
      }

      // Additional filters
      if (branch) query["generalInfo.branch"] = branch;
      if (year) query["generalInfo.branchYear"] = year;
      if (status && position) {
        query.domainStatuses = {
          $elemMatch: {
            domain: position,
            status,
          },
        };
      } else if (status) {
        query.status = status;
      }

      const domainRestriction = req.query.domainRestriction as string[] | undefined;
      if (domainRestriction && domainRestriction.length > 0) {
        if (position) {
          query["generalInfo.positions"] = { $in: [position] };
        } else {
          query["generalInfo.positions"] = { $in: domainRestriction };
        }
      } else if (position) {
        query["generalInfo.positions"] = { $in: [position] };
      }

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
        !isValidStatus(updateData.status)
      ) {
        return next(new ErrorHandler("Invalid status value", 400));
      }

      // Get the existing record to log the change
      const existingRecruitment = await RecruitmentModel.findById(id);
      if (!existingRecruitment) {
        return next(new ErrorHandler("Recruitment record not found", 404));
      }

      const existingPositions = existingRecruitment.generalInfo.positions;
      if (!canAccessAnyDomain(req.user, existingPositions)) {
        return next(new ErrorHandler("Recruitment record not found", 404));
      }

      if (!hasGlobalDomainAccess(req.user)) {
        // The overall status spans every applied domain; per-domain status goes through updateApplicationStatus
        if (updateData.status && !canAccessAllDomains(req.user, existingPositions)) {
          return next(
            new ErrorHandler("Overall status can only be changed when every applied domain is assigned to you", 403)
          );
        }
        const newPositions = updateData.generalInfo?.positions;
        if (newPositions !== undefined) {
          const added = (Array.isArray(newPositions) ? newPositions : []).filter(
            (p) => !existingPositions.includes(p)
          );
          if (!Array.isArray(newPositions) || !added.every((p) => canAccessDomain(req.user, p))) {
            return next(new ErrorHandler("You can only add positions in your assigned domains", 403));
          }
        }
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

      // Log admin activity if status was changed
      if (req.user && updateData.status && updateData.status !== existingRecruitment.status) {
        const actionMap: Record<string, string> = {
          shortlisted: "shortlist",
          rejected: "reject",
          accepted: "accept",
          pending: "update_status",
        };

        await AdminActivityLogModel.create({
          admin: req.user._id,
          action: actionMap[updateData.status] || "update_status",
          candidateId: id,
          candidateName: existingRecruitment.generalInfo.fullName,
          candidateEmail: existingRecruitment.generalInfo.email,
          domain: existingRecruitment.generalInfo.positions.join(", "),
          oldStatus: existingRecruitment.status,
          newStatus: updateData.status,
          description: `Updated application status from "${existingRecruitment.status}" to "${updateData.status}" for ${existingRecruitment.generalInfo.fullName}`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
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
      const search = asString(q);
      if (search) {
        userQuery.name = { $regex: escapeRegex(search), $options: "i" }; // Case-insensitive search
      }
      if (asString(branch)) {
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

// Admin: Get recruitment form with roles and WhatsApp links
export const getRecruitmentForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { formId } = req.params;

      if (!formId) {
        return next(new ErrorHandler("Form ID is required", 400));
      }

      const form = await RecruitmentFormModel.findById(formId);

      if (!form) {
        return next(new ErrorHandler("Recruitment form not found", 404));
      }

      res.status(200).json({
        success: true,
        form,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Admin: Get all recruitment forms with applicant counts
export const getAllRecruitmentForms = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch forms first
      const forms = await RecruitmentFormModel.find().sort({ createdAt: -1 });

      // Map each form to include its application count
      const formsWithCounts = await Promise.all(
        forms.map(async (form) => {
          // Count with multi-format formId match for robustness
          let applicantCount = await RecruitmentModel.countDocuments({
            $or: [
              { formId: (form as any)._id },
              { formId: (form as any)._id.toString() }
            ]
          });

          // Fallback: If this is the active form and count is 0,
          // check if there are any applications submitted WITHOUT a formId (legacy data)
          if (applicantCount === 0 && form.isActive) {
            const legacyCount = await RecruitmentModel.countDocuments({
              $or: [
                { formId: { $exists: false } },
                { formId: null }
              ]
            });

            if (legacyCount > 0) {
              applicantCount = legacyCount;
            }
          }

          return {
            ...form.toObject(),
            applicantCount
          };
        })
      );

      res.status(200).json({
        success: true,
        forms: formsWithCounts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Admin: Update WhatsApp link for a specific role in a form
export const updateRoleWhatsappLink = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { formId, roleId } = req.params;
      const { whatsappLink } = req.body;

      if (!formId || !roleId) {
        return next(new ErrorHandler("Form ID and Role ID are required", 400));
      }

      if (!whatsappLink || typeof whatsappLink !== "string") {
        return next(new ErrorHandler("WhatsApp link must be a non-empty string", 400));
      }

      // Validate WhatsApp link format (basic validation)
      if (!whatsappLink.includes("whatsapp") && !whatsappLink.includes("chat.whatsapp")) {
        return next(new ErrorHandler("Please provide a valid WhatsApp group link", 400));
      }

      const form = await RecruitmentFormModel.findById(formId);

      if (!form) {
        return next(new ErrorHandler("Recruitment form not found", 404));
      }

      // Find and update the role's WhatsApp link
      const roleIndex = form.roles.findIndex((role) => role._id?.toString() === roleId);

      if (roleIndex === -1) {
        return next(new ErrorHandler("Role not found in this form", 404));
      }

      if (!canAccessDomain(req.user, form.roles[roleIndex].roleName)) {
        return next(new ErrorHandler("You do not have access to this role's domain", 403));
      }

      form.roles[roleIndex].whatsappLink = whatsappLink;
      await form.save();

      res.status(200).json({
        success: true,
        message: "WhatsApp link updated successfully",
        form,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Admin: Update WhatsApp link by role name
export const updateRoleWhatsappLinkByName = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { formId } = req.params;
      const { roleName, whatsappLink } = req.body;

      if (!formId || !roleName) {
        return next(new ErrorHandler("Form ID and Role Name are required", 400));
      }

      if (!whatsappLink || typeof whatsappLink !== "string") {
        return next(new ErrorHandler("WhatsApp link must be a non-empty string", 400));
      }

      // Validate WhatsApp link format (basic validation)
      if (!whatsappLink.includes("whatsapp") && !whatsappLink.includes("chat.whatsapp")) {
        return next(new ErrorHandler("Please provide a valid WhatsApp group link", 400));
      }

      const form = await RecruitmentFormModel.findById(formId);

      if (!form) {
        return next(new ErrorHandler("Recruitment form not found", 404));
      }

      // Find and update the role's WhatsApp link by role name
      const roleIndex = form.roles.findIndex((role) => role.roleName === roleName);

      if (roleIndex === -1) {
        return next(new ErrorHandler(`Role "${roleName}" not found in this form`, 404));
      }

      if (!canAccessDomain(req.user, form.roles[roleIndex].roleName)) {
        return next(new ErrorHandler("You do not have access to this role's domain", 403));
      }

      form.roles[roleIndex].whatsappLink = whatsappLink;
      await form.save();

      res.status(200).json({
        success: true,
        message: "WhatsApp link updated successfully",
        form,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
