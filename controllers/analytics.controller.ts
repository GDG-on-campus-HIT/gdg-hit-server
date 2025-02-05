import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import userModel from "../models/user.model";
import ErrorHandler from "../utlis/ErrorHandler";
import { eventModel } from "../models/events.model";
import { eventRegistrationModel } from "../models/events.model";
import { certificateModel } from "../models/certificate.model";

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
        {
          $sort: { "_id.year": -1, "_id.month": -1 },
        },
        {
          $limit: 12,
        },
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
        {
          $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 },
        },
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
        {
          $sort: { count: -1 },
        },
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

      // Combine the results
      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          monthlyRegistrations,
          dailyRegistrations,
          departmentWiseRegistrations,
          roleWiseRegistrations,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getEventAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Total number of events
      const totalEvents = await eventModel.countDocuments();

      // 2. Upcoming vs. past events
      const upcomingPastEvents = await eventModel.aggregate([
        {
          $group: {
            _id: "$is_upcoming",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            status: {
              $cond: {
                if: { $eq: ["$_id", true] },
                then: "Upcoming",
                else: "Past",
              },
            },
            count: 1,
          },
        },
      ]);

      // 3. Event categories breakdown
      const eventCategories = await eventModel.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // 4. Total number of registrations
      const totalRegistrations = await eventRegistrationModel.countDocuments();

      // 5. Monthly registration trends for the last 12 months
      const monthlyRegistrationTrends = await eventRegistrationModel.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.year": -1, "_id.month": -1 },
        },
        {
          $limit: 12,
        },
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

      // 6. Top events by number of registrations
      const topEventsByRegistrations = await eventRegistrationModel.aggregate([
        {
          $group: {
            _id: "$event",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        {
          $unwind: "$eventDetails",
        },
        {
          $project: {
            eventName: "$eventDetails.name",
            count: 1,
          },
        },
      ]);

      // 7. Daily registrations for the last month
      const dailyRegistrationsLastMonth =
        await eventRegistrationModel.aggregate([
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
                day: { $dayOfMonth: "$createdAt" },
                month: { $month: "$createdAt" },
                year: { $year: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
              "_id.day": 1,
            },
          },
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
                  "-",
                  { $toString: "$_id.year" },
                ],
              },
              count: 1,
            },
          },
        ]);

      // 8. Department-wise registration distribution
      const departmentWiseDistribution = await eventRegistrationModel.aggregate(
        [
          {
            $group: {
              _id: "$department",
              count: { $sum: 1 },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]
      );

      // 9. Attendance analytics (percentage of users who attended)
      const attendanceAnalytics = await eventRegistrationModel.aggregate([
        {
          $group: {
            _id: "$attendance",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            status: {
              $cond: {
                if: { $eq: ["$_id", true] },
                then: "Attended",
                else: "Not Attended",
              },
            },
            count: 1,
          },
        },
      ]);

      // 10. Revenue analytics (sum of registration fees, if monetary)
      const revenueAnalytics = await eventModel.aggregate([
        {
          $lookup: {
            from: "eventregistrations",
            localField: "_id",
            foreignField: "event",
            as: "registrations",
          },
        },
        {
          $unwind: "$registrations",
        },
        {
          $project: {
            eventName: "$name",
            registrationFee: {
              $cond: {
                if: { $ne: ["$registrationFee", "Free"] }, // Check if the fee is not "Free"
                then: {
                  $convert: {
                    input: "$registrationFee",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                else: 0, // Default to 0 for "Free"
              },
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            totalRevenue: { $sum: "$registrationFee" },
            eventName: { $first: "$eventName" },
          },
        },
        {
          $sort: { totalRevenue: -1 },
        },
      ]);

      // 11. Registration status (issued certificates)
      const certificateStatusAnalytics = await eventRegistrationModel.aggregate(
        [
          {
            $project: {
              certificateIssued: {
                $cond: {
                  if: { $ifNull: ["$certificate", false] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $group: {
              _id: {
                certificateIssued: "$certificateIssued",
              },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              certificateIssued: "$_id.certificateIssued",
              count: 1,
              status: {
                $cond: {
                  if: { $eq: ["$certificateIssued", true] },
                  then: "Certificate Issued",
                  else: "Certificate Not Issued",
                },
              },
            },
          },
        ]
      );

      // 12. Event by certificate issued
      const eventWiseCertificateStatusAnalytics =
        await eventRegistrationModel.aggregate([
          {
            $lookup: {
              from: "events", // Replace with the actual collection name if different
              localField: "event",
              foreignField: "_id",
              as: "eventDetails",
            },
          },
          {
            $unwind: "$eventDetails",
          },
          {
            $project: {
              eventName: "$eventDetails.name",
              certificateIssued: {
                $cond: {
                  if: { $ifNull: ["$certificate", false] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $group: {
              _id: {
                eventName: "$eventName",
                certificateIssued: "$certificateIssued",
              },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: "$_id.eventName",
              certificateIssuedData: {
                $push: {
                  certificateIssued: "$_id.certificateIssued",
                  count: "$count",
                  status: {
                    $cond: {
                      if: { $eq: ["$_id.certificateIssued", true] },
                      then: "Certificate Issued",
                      else: "Certificate Not Issued",
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              eventName: "$_id",
              certificateIssuedData: 1,
            },
          },
        ]);

      // Respond with all analytics data
      res.status(200).json({
        totalEvents,
        upcomingPastEvents,
        eventCategories,
        totalRegistrations,
        monthlyRegistrationTrends,
        topEventsByRegistrations,
        dailyRegistrationsLastMonth,
        departmentWiseDistribution,
        attendanceAnalytics,
        revenueAnalytics,
        certificateStatusAnalytics,
        eventWiseCertificateStatusAnalytics,
      });
    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const certificateAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Overall Certificate Issuance Analytics

      // Total Certificates Issued
      const totalCertificatesIssued = await certificateModel.countDocuments();

      // Total Unique Events with Certificates Issued
      const distinctEvents = await certificateModel.distinct("event");
      const totalUniqueEventsWithCertificates = distinctEvents.length;

      // Percentage of Events with Issued Certificates
      const totalEvents = await eventModel.countDocuments();
      const percentageEventsWithCertificates =
        (totalUniqueEventsWithCertificates / totalEvents) * 100;

      // Certificates Issued Over Time (Last 12 Months)
      const certificatesIssuedOverTime = await certificateModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Daily Certificate Issuance (Last 30 Days)
      const dailyCertificateIssuance = await certificateModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // 2. Event-Wise Certificate Analytics

      // Event-Wise Certificate Issuance
      const eventWiseCertificateIssuance = await certificateModel.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        { $unwind: "$eventDetails" },
        {
          $group: {
            _id: "$eventDetails.name",
            totalCertificates: { $sum: 1 },
          },
        },
      ]);

      // Event-Wise Certificate Download Count
      const eventWiseDownloadCount = await certificateModel.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        { $unwind: "$eventDetails" },
        {
          $group: {
            _id: "$eventDetails.name",
            totalDownloads: { $sum: "$download" },
          },
        },
      ]);

      // Event-Wise Mail Sent Status
      const eventMailSentStatus = await certificateModel.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        { $unwind: "$eventDetails" },
        {
          $group: {
            _id: "$eventDetails.name",
            mailSentTrue: {
              $sum: { $cond: [{ $eq: ["$mail_sent", true] }, 1, 0] },
            },
            mailSentFalse: {
              $sum: { $cond: [{ $eq: ["$mail_sent", false] }, 1, 0] },
            },
          },
        },
      ]);

      // 3. User-Specific Certificate Analytics

      // Top Users by Certificates Downloaded
      const topUsersByDownloads = await certificateModel.aggregate([
        {
          $group: {
            _id: "$user",
            totalDownloads: { $sum: "$download" },
          },
        },
        { $sort: { totalDownloads: -1 } },
        { $limit: 5 }, // Top 5 users
      ]);

      // User Demographics for Certificate Holders
      const userDemographics = await certificateModel.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $group: {
            _id: "$userDetails.department",
            totalCertificates: { $sum: 1 },
          },
        },
      ]);

      // User Registration vs. Certificate Issuance
      const userRegistrationVsCertificate = await certificateModel.aggregate([
        {
          $lookup: {
            from: "eventregistrations",
            localField: "registration",
            foreignField: "_id",
            as: "registrationDetails",
          },
        },
        { $unwind: "$registrationDetails" },
        {
          $group: {
            _id: "$registrationDetails.event",
            registeredCount: { $sum: 1 },
            certificateIssuedCount: {
              $sum: { $cond: [{ $ne: ["$certificate.url", null] }, 1, 0] },
            },
          },
        },
      ]);

      // 4. Mail Sent Status

      // Overall Mail Sent Status
      const overallMailSentStatus = await certificateModel.aggregate([
        {
          $group: {
            _id: "$mail_sent",
            count: { $sum: 1 },
          },
        },
      ]);

      // Event-Based Mail Sent Status
      const eventBasedMailSentStatus = await certificateModel.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        { $unwind: "$eventDetails" },
        {
          $group: {
            _id: "$eventDetails.name",
            mailSentTrue: {
              $sum: { $cond: [{ $eq: ["$mail_sent", true] }, 1, 0] },
            },
            mailSentFalse: {
              $sum: { $cond: [{ $eq: ["$mail_sent", false] }, 1, 0] },
            },
          },
        },
      ]);

      // Certificates Pending Email
      const certificatesPendingEmail = await certificateModel.countDocuments({
        mail_sent: false,
      });

      // 5. Certificate Download Statistics

      // Total Certificate Downloads
      const totalCertificateDownloads = await certificateModel.aggregate([
        {
          $group: {
            _id: null,
            totalDownloads: { $sum: "$download" },
          },
        },
      ]);

      // Average Downloads per Certificate
      const avgDownloadsPerCertificate = await certificateModel.aggregate([
        {
          $group: {
            _id: null,
            avgDownloads: { $avg: "$download" },
          },
        },
      ]);

      // Most Downloaded Certificates
      const mostDownloadedCertificates = await certificateModel.aggregate([
        {
          $sort: { download: -1 },
        },
        { $limit: 5 },
      ]);

      // Download Trends Over Time (Last 6 Months)
      const downloadTrendsOverTime = await certificateModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            totalDownloads: { $sum: "$download" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const downloadTrendsDaily = await certificateModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalDownloads: { $sum: "$download" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      

      // 8. Failure/Error Reports

      // Certificates with Missing Information
      const certificatesWithMissingInfo = await certificateModel.countDocuments(
        {
          $or: [
            { certificate: { $exists: false } },
            { "certificate.url": { $exists: false } },
          ],
        }
      );

      // Email Send Failures (optional: integration with logs or failure tracking)
      const emailSendFailures = await certificateModel.countDocuments({
        mail_sent: false,
      });

    

      // Returning aggregated analytics
      res.status(200).json({
        totalCertificatesIssued,
        totalUniqueEventsWithCertificates,
        percentageEventsWithCertificates,
        certificatesIssuedOverTime,
        dailyCertificateIssuance,
        eventWiseCertificateIssuance,
        eventWiseDownloadCount,
        eventMailSentStatus,
        topUsersByDownloads,
        userDemographics,
        userRegistrationVsCertificate,
        overallMailSentStatus,
        eventBasedMailSentStatus,
        certificatesPendingEmail,
        totalCertificateDownloads,
        avgDownloadsPerCertificate,
        mostDownloadedCertificates,
        downloadTrendsOverTime,
        downloadTrendsDaily,
        certificatesWithMissingInfo,
        emailSendFailures,
      });
    } catch (error:any) {
        return next(new ErrorHandler(error.message, 500));
    }
  }
);
