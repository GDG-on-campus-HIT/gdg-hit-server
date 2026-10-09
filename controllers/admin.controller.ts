import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import userModel from "../models/user.model";
import { membersModel } from "../models/members.model";
import { eventModel } from "../models/events.model";
import { Participant } from "../models/eventregistration.model";
import { RecruitmentFormModel } from "../models/recruitmentForm.model";
import { RecruitmentModel } from "../models/recruitment.model";
import { contactModel } from "../models/contact.model";
import ErrorHandler from "../utlis/ErrorHandler";


export const getAllUsers = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const users = await userModel
          .find()
          .sort({ createdAt: -1 }); 
  
        res.status(200).json({
          success: true,
          users,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );

type ActivityItem = { kind: string; id: string; title: string; date: Date };

// Everything the admin dashboard needs in one request
export const getDashboard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        verifiedUsers,
        newUsersThisMonth,
        totalMembers,
        activeMembers,
        membersByDepartment,
        totalEvents,
        upcomingEventsCount,
        registrationOpenCount,
        upcomingEvents,
        totalRegistrations,
        forms,
        applicationsByStatus,
        applicationsByForm,
        totalMessages,
        recentUsers,
        recentMembers,
        recentEvents,
        recentApplications,
      ] = await Promise.all([
        userModel.countDocuments(),
        userModel.countDocuments({ isVerified: true }),
        userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
        membersModel.countDocuments(),
        membersModel.countDocuments({ isActive: { $ne: false } }),
        membersModel.aggregate([
          { $group: { _id: { $ifNull: ["$department", "Unspecified"] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ]),
        eventModel.countDocuments(),
        eventModel.countDocuments({ is_upcoming: true }),
        eventModel.countDocuments({ registration_open: true }),
        eventModel
          .find({ is_upcoming: true })
          .sort({ eventDate: 1 })
          .limit(5)
          .select("name eventDate eventTime venue category registration_open eventBanner registrationFee")
          .lean(),
        Participant.countDocuments(),
        RecruitmentFormModel.find()
          .sort({ isActive: -1, createdAt: -1 })
          .select("title isActive roles.roleName createdAt")
          .lean(),
        RecruitmentModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        RecruitmentModel.aggregate([{ $group: { _id: "$formId", count: { $sum: 1 } } }]),
        contactModel.countDocuments(),
        userModel.find().sort({ createdAt: -1 }).limit(5).select("name createdAt").lean(),
        membersModel.find().sort({ createdAt: -1 }).limit(5).select("name designation createdAt").lean(),
        eventModel.find().sort({ createdAt: -1 }).limit(5).select("name createdAt").lean(),
        RecruitmentModel.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("generalInfo.fullName generalInfo.positions createdAt")
          .lean(),
      ]);

      const upcomingIds = upcomingEvents.map((e: any) => e._id);
      const registrationCounts = upcomingIds.length
        ? await Participant.aggregate([
            { $match: { event: { $in: upcomingIds } } },
            { $group: { _id: "$event", count: { $sum: 1 } } },
          ])
        : [];
      const registrationsByEvent = new Map(
        registrationCounts.map((r: any) => [String(r._id), r.count as number])
      );

      const applicationStatusCounts: Record<string, number> = {
        pending: 0,
        shortlisted: 0,
        accepted: 0,
        rejected: 0,
      };
      let totalApplications = 0;
      for (const row of applicationsByStatus as Array<{ _id: string | null; count: number }>) {
        const key = row._id || "pending";
        applicationStatusCounts[key] = (applicationStatusCounts[key] || 0) + row.count;
        totalApplications += row.count;
      }
      const applicationsPerForm = new Map(
        (applicationsByForm as Array<{ _id: unknown; count: number }>).map((r) => [String(r._id), r.count])
      );

      const activity: ActivityItem[] = [
        ...recentUsers.map((u: any) => ({
          kind: "user",
          id: String(u._id),
          title: `${u.name} signed up`,
          date: u.createdAt,
        })),
        ...recentMembers.map((m: any) => ({
          kind: "member",
          id: String(m._id),
          title: `${m.name} joined as ${m.designation || "member"}`,
          date: m.createdAt,
        })),
        ...recentEvents.map((e: any) => ({
          kind: "event",
          id: String(e._id),
          title: `Event created: ${e.name}`,
          date: e.createdAt,
        })),
        ...recentApplications.map((a: any) => ({
          kind: "application",
          id: String(a._id),
          title: `${a.generalInfo?.fullName || "Someone"} applied${
            a.generalInfo?.positions?.length ? ` for ${a.generalInfo.positions.join(", ")}` : ""
          }`,
          date: a.createdAt,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            verified: verifiedUsers,
            newThisMonth: newUsersThisMonth,
          },
          members: {
            total: totalMembers,
            active: activeMembers,
            inactive: totalMembers - activeMembers,
            byDepartment: membersByDepartment.map((d: any) => ({ name: d._id || "Unspecified", count: d.count })),
          },
          events: {
            total: totalEvents,
            upcoming: upcomingEventsCount,
            registrationOpen: registrationOpenCount,
            totalRegistrations,
            upcomingList: upcomingEvents.map((e: any) => ({
              ...e,
              registrationCount: registrationsByEvent.get(String(e._id)) || 0,
            })),
          },
          recruitment: {
            totalForms: forms.length,
            activeForms: forms.filter((f: any) => f.isActive).length,
            applications: { total: totalApplications, ...applicationStatusCounts },
            forms: forms.slice(0, 5).map((f: any) => ({
              _id: f._id,
              title: f.title,
              isActive: f.isActive,
              rolesCount: f.roles?.length || 0,
              applicationCount: applicationsPerForm.get(String(f._id)) || 0,
            })),
          },
          messages: { total: totalMessages },
          recentActivity: activity,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
