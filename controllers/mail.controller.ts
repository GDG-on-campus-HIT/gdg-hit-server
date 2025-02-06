import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import { eventModel, eventRegistrationModel } from "../models/events.model";
import ErrorHandler from "../utlis/ErrorHandler";
import sendMail from "../utlis/sendMail";
import { certificateModel } from "../models/certificate.model";
import { mailModel } from "../models/mail.model";

export const sendCertificateMail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { registration_id } = req.params;

      // Find the registration details by ID
      const registration = (await eventRegistrationModel
        .findById(registration_id)
        .populate({ path: "user", select: "_id name email" })
        .populate({ path: "event", select: "_id name eventDate" })) as any;

      if (!registration) {
        return next(new ErrorHandler("Registration not found", 404));
      }

      if (!registration.certificate) {
        return next(new ErrorHandler("Certificate not found", 404));
      }

      const name = registration.user?.name;
      const email = registration.user?.email;
      // const email = "deepakjamui26@gmail.com";
      const eventName = registration.event?.name;
      const eventDate = registration.event?.eventDate;

      // Prepare the data to be used in the email template
      const data = {
        participantName: name,
        eventName,
        eventDate,
      };

      // Render the HTML content directly using ejs
      const html = `<!DOCTYPE html>
      <html>
      <head>
          <title>Certificate Available</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
          <style>
              /* Styles as provided in your template */
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
                  color: #333;
              }
              .container {
                  max-width: 700px;
                  margin: 30px auto;
                  background-color: #ffffff;
                  border-radius: 12px;
                  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
                  overflow: hidden;
              }
              .header {
                  padding: 10px;
                  text-align: center;
              }
              .content {
                  padding: 30px;
                  line-height: 1.7;
              }
              .content p {
                  margin: 15px 0;
              }
              .button {
                  display: inline-block;
                  margin: 25px 0;
                  padding: 12px 24px;
                  background-color: #FF6026;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: 500;
              }
              .button:hover {
                  background-color: #df4811;
              }
              .footer {
                  background-color: #f0f0f0;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #555;
              }
              .footer a {
                  color: #1e3a8a;
                  text-decoration: none;
              }
              .footer a:hover {
                  text-decoration: underline;
              }
              .logo {
                width: 100%;
                  display: flex;
                  justify-content: center;
              }
              .logo img {
                  width: 100%;
              }
              .social-links {
                  margin-top: 15px;
              }
              .social-links a {
                  margin: 0 5px;
                  text-decoration: none;
                  color: #555;
                  font-size: 24px;
              }
              .social-links a:hover {
                  color: #FF6026;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">
                      <img src="https://dsch.site/images/dsch-banner.png" alt="DSCH">
                  </div>
              </div>
              <div class="content">
                  <strong>Dear ${data.participantName},</strong>
                  <p>We hope this message finds you well! Thank you for attending <strong>${data.eventName}</strong> held on <strong>${data.eventDate}</strong>. We are excited to let you know that your participation certificate is now available for download.</p>
                  <p>To access your certificate, please follow these simple steps:</p>
                  <ol>
                      <li>Visit our website: <a href="https://dsch.site" style="color: #1e3a8a; text-decoration: underline;">https://dsch.site</a></li>
                      <li>Log in using your registered credentials.</li>
                      <li>Navigate to your profile section to download your certificate.</li>
                  </ol>
                  <a href="https://dsch.site/profile" class="button">Visit Your Profile</a>
                  <p>If you experience any issues or cannot find your certificate, please contact us at <a href="mailto:datascienceclubhit@gmail.com" style="color: #1e3a8a;">datascienceclubhit@gmail.com</a> or reach out through our support team on the website.</p>
                  <p>We appreciate your enthusiasm and active participation in <strong>${data.eventName}</strong>. We look forward to welcoming you to future events!</p>
              </div>
              <div class="footer">
                  <p>Best regards,</p>
                  <p><strong>Data Science Club HIT</strong> <br>Haldia Institute of Technology</p>
                  <p>&copy; 2024 Data Science Club HIT. All rights reserved.</p>
                  <div class="social-links">
                      <a href="https://www.linkedin.com/company/datascienceclubhit/" target="_blank"><i class="fab fa-linkedin"></i></a>
                      <a href="https://www.instagram.com/datascienceclubhit?igsh=MTV6MGY2a3piMXI0ZA%3D%3D" target="_blank"><i class="fab fa-instagram-square"></i></a>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `;

      // Send the email using the sendMail utility
      try {
        await sendMail({
          email,
          subject: `${eventName} Certificate`,
          template: html,
        } as any);

        await certificateModel.findByIdAndUpdate(registration.certificate, {
          mail_sent: true,
        });

        res.status(200).json({
          success: true,
          message: `Certificate email sent successfully to ${email}`,
        });
      } catch (error: any) {
        console.log(error);
        return next(new ErrorHandler("Failed to send certificate email", 500));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const sendBulkCertificateMails = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event } = req.body; // Array of registration IDs
      const eventData = await eventModel.findById(event);
      const registration_ids = eventData?.registrations;

      if (!Array.isArray(registration_ids) || registration_ids.length === 0) {
        return next(new ErrorHandler("No registration IDs provided", 400));
      }

      const statuses = [];

      for (const registration_id of registration_ids) {
        try {
          // Find the registration details by ID
          const registration = (await eventRegistrationModel
            .findById(registration_id)
            .populate({ path: "user", select: "_id name email" })
            .populate({ path: "event", select: "_id name eventDate" })) as any;

          if (!registration) {
            statuses.push({
              id: registration_id,
              status: "Registration not found",
            });
            continue;
          }

          if (!registration.certificate) {
            statuses.push({
              id: registration_id,
              status: "Certificate not found",
            });
            continue;
          }

          // Check if the mail has already been sent
          const mailAlreadySentCheck = await certificateModel.findById(
            registration.certificate
          );
          if (mailAlreadySentCheck?.mail_sent) {
            statuses.push({
              id: registration_id,
              status: "Email already sent",
            });
            continue;
          }

          const name = registration.user?.name;
          const email = registration.user?.email;
          // const email = "deepakjamui26@gmail.com";
          const eventName = registration.event?.name;
          const eventDate = registration.event?.eventDate;

          // Prepare the data for the email template
          const data = {
            participantName: name,
            eventName,
            eventDate,
          };

          // Render the HTML content directly using ejs
          const html = ``;

          // Send the email using the sendMail utility
          await sendMail({
            email,
            subject: `${eventName} Certificate`,
            template: html,
          } as any);

          // Update the certificate status to indicate mail has been sent
          await certificateModel.findByIdAndUpdate(registration.certificate, {
            mail_sent: true,
          });

          statuses.push({
            id: registration_id,
            status: `Email sent successfully to ${email}`,
          });
        } catch (error: any) {
          statuses.push({
            id: registration_id,
            status: `Failed to send email: ${error.message}`,
          });
        }
      }

      res.status(200).json({
        success: true,
        statuses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// send mail
export const sendInviteMail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { registration_id } = req.params;
      const { repeatMail, htmlContent } = req.body;

      // Find the registration details by ID
      const registration = (await eventRegistrationModel
        .findById(registration_id)
        .populate({ path: "user", select: "_id name email" })
        .populate({ path: "event", select: "_id name eventDate" })) as any;

      if (!registration) {
        return next(new ErrorHandler("Registration not found", 404));
      }

      const userId = registration.user?._id;
      const name = registration.user?.name;
      const email = registration.user?.email;
      const eventId = registration.event?._id;
      const eventName = registration.event?.name;
      const eventDate = registration.event?.eventDate;

      // Check if the invite mail has already been sent
      const existingMail = await mailModel.findOne({
        user: userId,
        eventId,
        mailType: "notification",
      });

      if (existingMail && !repeatMail) {
        return res.status(200).json({
          success: true,
          mailStatus: "Already Sent",
          message: `Invite mail already sent to ${email}`,
        });
      }

      // Inject userName and eventName into received HTML content
      const html = htmlContent
        .replace(/\{\{userName\}\}/g, name)
        .replace(/\{\{eventName\}\}/g, eventName);

      // Send the email
      try {
        await sendMail({
          email,
          subject: `📢 Important Update: "${eventName}" Event Rescheduled to 8th February!`,
          template: html,
        } as any);

        // Save email log in the database
        await mailModel.findOneAndUpdate(
          { user: userId, eventId, mailType: "notification" },
          {
            user: userId,
            eventId,
            mailType: "notification",
            subject: `📢 Important Update: "${eventName}" Event Rescheduled to 8th February!`,
            content: html,
            sentAt: new Date(),
          },
          { upsert: true, new: true }
        );

        res.status(200).json({
          success: true,
          mailStatus: "Successs",
          message: `email sent successfully to ${email}`,
        });
      } catch (error: any) {
        console.log(error);
        return next(new ErrorHandler("Failed to send email", 500));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
