import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "./CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { AdminActivityLogModel } from "../models/adminActivityLog.model";

/**
 * Role-Based Access Control (RBAC) System for Recruitment Management
 */

// 1. Defined Roles in the system
export const ROLES = {
  USER: "user",
  DOMAIN_LEAD: "domain_lead",
  SUPER_DOMAIN_ADMIN: "super_domain_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// 2. Role Permissions (Highest to Lowest)
const ROLE_HIERARCHY: Record<RoleType, number> = {
  super_admin: 100,
  super_domain_admin: 80,
  domain_lead: 60,
  user: 20,
};

const normalizeDomain = (domain: string): string => domain.trim().toLowerCase();

export const hasGlobalDomainAccess = (user: any): boolean =>
  user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.SUPER_DOMAIN_ADMIN;

export const canAccessDomain = (user: any, domain: unknown): boolean => {
  if (hasGlobalDomainAccess(user)) return true;
  if (user?.role !== ROLES.DOMAIN_LEAD || typeof domain !== "string") return false;
  const assigned: string[] = user.assignedDomains || [];
  return assigned.some((d) => normalizeDomain(d) === normalizeDomain(domain));
};

export const canAccessAnyDomain = (user: any, domains: string[] = []): boolean =>
  hasGlobalDomainAccess(user) || domains.some((d) => canAccessDomain(user, d));

export const canAccessAllDomains = (user: any, domains: string[] = []): boolean =>
  hasGlobalDomainAccess(user) ||
  (domains.length > 0 && domains.every((d) => canAccessDomain(user, d)));

/**
 * Role-based Authorization Guard
 * Ensures the user has one of the required roles to access the resource.
 */
export const authorizeRoles = (...roles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as RoleType;

    if (!roles.includes(userRole)) {
      return next(
        new ErrorHandler(
          `Access denied: Your role (${userRole}) is not authorized to access this resource.`,
          403
        )
      );
    }
    next();
  };
};

/**
 * Domain-Based Access Control Middleware (MOST IMPORTANT)
 * 
 * Logic:
 * - Super Admin and Global Admin: Access to all domains.
 * - Evaluator and Domain Lead: ONLY access assigned domains.
 * - Checks 'domain' or 'position' in query, body, or params.
 */
export const domainGuard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new ErrorHandler("User not found in request context", 401));
    }

    // Only this middleware may set domainRestriction; never trust it from the client
    delete (req.query as any).domainRestriction;

    // Super Admin and Super Domain Admin have full visibility across all domains
    if (hasGlobalDomainAccess(user)) {
      return next();
    }

    // Role-based domain restrictions for Domain Leads
    if (user.role === ROLES.DOMAIN_LEAD) {
      const assignedDomains: string[] = (user as any).assignedDomains || [];

      // No domains assigned: cannot access recruitment data scoped by domain
      if (assignedDomains.length === 0) {
        return next(
          new ErrorHandler(
            "No domains are assigned to your account. Ask a super admin to assign at least one domain.",
            403
          )
        );
      }

      // Every domain-like value anywhere in the request must be assigned, because
      // controllers read different fields than the first one present
      const requestedDomains = [
        req.query.domain,
        req.query.position,
        req.query.positions,
        req.body?.domain,
        req.body?.position,
        req.body?.roleName,
        req.params.domain,
      ].flatMap((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]));

      const denied = requestedDomains.find((d) => !canAccessDomain(user, d));
      if (denied !== undefined) {
        return next(
          new ErrorHandler(
            `Unauthorized: You do not have access to the "${String(denied)}" domain.`,
            403
          )
        );
      }

      if (req.method === "GET") {
        req.query.domainRestriction = assignedDomains as any;
        return next();
      }

      // Single-resource routes are checked against the resource's own domains in the controller
      if (requestedDomains.length === 0 && !Object.keys(req.params).length) {
        return next(new ErrorHandler("Domain specification is required for your role.", 403));
      }

      return next();
    }

    // If a regular user tries to access admin-level domain data
    return next(new ErrorHandler("Unauthorized access to domain restricted resources.", 403));
  }
);

/**
 * Lightweight Activity Logging Middleware
 * Logs critical admin actions to the database.
 */
export const activityLogger = (action: string, descriptionTemplate?: string) => {
  return CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    // We only log if the action is successful
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const description = descriptionTemplate 
            ? `${descriptionTemplate} by ${req.user?.name}`
            : `${req.method} ${req.originalUrl} performed by ${req.user?.name}`;

          await AdminActivityLogModel.create({
            admin: req.user?._id,
            action: action as any,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            description,
            timestamp: new Date(),
            // Optionally capture candidate details if available in params/body
            candidateId: req.params.id || req.body.candidateId,
          });
        } catch (error) {
          console.error("Activity logging failed:", error);
        }
      }
    });
    next();
  });
};

/**
 * Ownership Middleware
 * Ensures regular users can only access their own data.
 */
export const ensureOwnership = (resourceIdPath: string = "params.id") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new ErrorHandler("Unauthorized", 401));

    // Admins bypass ownership check
    if ([ROLES.SUPER_ADMIN, ROLES.SUPER_DOMAIN_ADMIN, ROLES.DOMAIN_LEAD].includes(user.role as any)) {
      return next();
    }

    // Check if the resource belongs to the user
    // We dynamically get the ID from the request path provided
    const pathParts = resourceIdPath.split(".");
    let targetUserId = req as any;
    for (const part of pathParts) {
      targetUserId = targetUserId[part];
    }

    if (targetUserId && targetUserId.toString() !== (user as any)._id.toString()) {
      return next(new ErrorHandler("Access denied: You can only access your own data.", 403));
    }

    next();
  };
};
