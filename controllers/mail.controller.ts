import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import { eventModel, eventRegistrationModel } from "../models/events.model";
import ErrorHandler from "../utlis/ErrorHandler";
import sendMail from "../utlis/sendMail";
import { certificateModel } from "../models/certificate.model";
import { mailModel } from "../models/mail.model";
import { siteHost, siteUrl } from "../utlis/site";

const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const OFFICIAL_EMAIL = "gdgoncampushit@gmail.com";

const certificateMailTemplate = ({
  participantName,
  eventName,
  eventDate,
}: {
  participantName: string;
  eventName: string;
  eventDate?: string;
}): string => {
  const name = escapeHtml(participantName || "there");
  const event = escapeHtml(eventName || "our event");
  const heldOn = eventDate ? ` held on <strong>${escapeHtml(eventDate)}</strong>` : "";

  return `<!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Your certificate is ready</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
              color: #333;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background-color: #ffffff;
              border-radius: 12px;
              box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
              overflow: hidden;
          }
          .accent {
              height: 4px;
              background: linear-gradient(to right, #4285F4 0 25%, #EA4335 25% 50%, #FBBC05 50% 75%, #34A853 75% 100%);
          }
          .logo img {
              width: 55%;
              max-width: 280px;
              height: auto;
              display: block;
              margin: 28px auto 8px;
          }
          .content {
              padding: 10px 30px 30px;
              line-height: 1.7;
          }
          .content p {
              margin: 15px 0;
          }
          .button {
              display: inline-block;
              margin: 20px 0;
              padding: 12px 32px;
              border-radius: 9999px;
              background: linear-gradient(to bottom left, #2563eb, #1e3a8a);
              color: #ffffff !important;
              text-decoration: none;
              font-weight: 500;
          }
          .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #555;
          }
          .footer a,
          .content a.link {
              color: #1e3a8a;
              text-decoration: none;
          }
          .footer a:hover,
          .content a.link:hover {
              text-decoration: underline;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="accent"></div>
          <div class="logo">
              <img src="${siteUrl}/assets/logo-gdg.png" alt="GDG on Campus HIT">
          </div>
          <div class="content">
              <p><strong>Dear ${name},</strong></p>
              <p>Thank you for attending <strong>${event}</strong>${heldOn}. Your participation certificate is now ready to download.</p>
              <p>To get your certificate:</p>
              <ol>
                  <li>Visit <a class="link" href="${siteUrl}">${siteHost}</a> and log in with your registered account.</li>
                  <li>Open your dashboard and find the certificate under <strong>Certificates</strong>.</li>
              </ol>
              <center>
                  <a href="${siteUrl}/dashboard" class="button">Go to your dashboard</a>
              </center>
              <p>If you can't find your certificate or run into any issues, write to us at <a class="link" href="mailto:${OFFICIAL_EMAIL}">${OFFICIAL_EMAIL}</a>.</p>
              <p>We loved having you at <strong>${event}</strong> and look forward to seeing you at our next event!</p>
          </div>
          <div class="footer">
              <p>Best regards,</p>
              <p><strong>GDG on Campus HIT</strong><br>Haldia Institute of Technology</p>
              <p>
                  <a href="https://www.linkedin.com/company/gdgoncampushit/" target="_blank">LinkedIn</a>
                  &nbsp;&middot;&nbsp;
                  <a href="https://www.instagram.com/gdg_hit/" target="_blank">Instagram</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${siteUrl}" target="_blank">${siteHost}</a>
              </p>
              <p>&copy; ${new Date().getFullYear()} GDG on Campus HIT. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>`;
};

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

      const html = certificateMailTemplate({
        participantName: name,
        eventName,
        eventDate,
      });

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

          const html = certificateMailTemplate({
            participantName: name,
            eventName,
            eventDate,
          });

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
export const sendPromotionMail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dataList } = req.body; // Expecting an array of objects with name and email
      const EMAIL_DELAY_MS = 10000; // 2 seconds delay between emails - adjust as needed
      
      if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
        return next(new ErrorHandler("Please provide a valid list of recipients", 400));
      }

      // Function to add delay
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Function to send single email
      const sendSingleEmail = async ({ name, email }: { name: string; email: string }, index: number) => {
        if (!name || !email) {
          return {
            index,
            name,
            email,
            status: 'failed',
            message: 'Missing name or email'
          };
        }

        const html = `
        <html>
        <head>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: #f4f4f4;
                    padding: 10px;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 10px;
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
                }
                
                .content {
                    padding: 5px;
                }
                
                .footer {
                    text-align: center;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 0 0 8px 8px;
                    font-size: 12px;
                    color: #555;
                }
                
                .button {
                    display: inline-block;
                    padding: 12px 32px;
                    border-radius: 9999px;
                    background: linear-gradient(to bottom left, #2563eb, #1e3a8a);
                    color: white !important;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                    margin-top: 20px;
                }
        
                .button:hover {
                    background: #1e3a8a;
                }
        
                .button:visited {
                    color: white !important;
                }
        
                .logo img {
                    width: 60%;
                    height: auto;
                    display: block;
                    margin: 20px auto;
                }
        
                .image-content img {
                    width: 100%;
                    height: auto;
                    display: block;
                    margin-top: 20px;
                    border-radius: 8px;
                }
        
                .mandatory {
                    font-size: 11px;
                    color: #777;
                    margin-top: 10px;
                }
                .unsubscribe {
                    font-size: 12px;
                    color: #888;
                    margin-top: 15px;
                }
        
                .unsubscribe a {
                    color: #888;
                    text-decoration: none;
                }
        
                .unsubscribe a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="logo">
                    <img src="${siteUrl}/assets/logo-gdg.png" alt="GDG HIT">
                </div>
        
                <div class="content">
                    <h3>Hello ${escapeHtml(name)} 👋,</h3>
                    
                    <p style="margin-top: 20px; margin-bottom: 20px;">
                    Ready to be part of something BIGGER? The wait is over - <strong>GDG on campus HIT</strong> is opening its doors for brilliant minds and passionate talents to join our powerhouse team! If you live and breathe tech, creativity, or community building, this is YOUR MOMENT to shine! 
                    </p>
                    <center>
                        <a href="${siteUrl}" class="button">Apply Now</a>
                    </center>
                </div>
        
                <div class="image-content">
                    <img src="${siteUrl}/img/recruitment-og-image.jpeg" alt="GDG HIT Recruitment">
                </div>
        
                <div class="footer">
                    <p>Best regards,</p>
                    <p><strong>GDG on campus - HIT</strong></p>
                    <p>© 2025 GDG on campus HIT. All rights reserved.</p>
                    <p>For more details, visit <a href="${siteUrl}" class="website-link">${siteHost}</a>.</p>
                    <p class="unsubscribe">No longer interested? <a href="${siteUrl}/contact-us">Unsubscribe here</a>.</p>
                    <p class="mandatory">You have received this mandatory email announcement to update you about important information related to GDG HIT.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        try {
          await sendMail({
            email,
            subject: "GDG on Campus HIT: Notification 📢",
            template: html,
          } as any);
          
          return {
            index,
            name,
            email,
            status: 'success',
            message: `Email sent successfully to ${email}`
          };
        } catch (error: any) {
          console.error(`Error sending email to ${email}:`, error);
          return {
            index,
            name,
            email,
            status: 'failed',
            message: `Failed to send email to ${email}: ${error.message}`
          };
        }
      };

      try {
        const results: any[] = [];
        
        // Process emails sequentially with delay
        for (let i = 0; i < dataList.length; i++) {
          const result = await sendSingleEmail(dataList[i], i);
          results.push(result);
          
          // Add delay between emails (except for the last one)
          if (i < dataList.length - 1) {
            await delay(EMAIL_DELAY_MS);
          }
        }
        
        const successCount = results.filter(result => result.status === 'success').length;
        const failedCount = results.length - successCount;

        res.status(200).json({
          success: true,
          message: `Email sending completed. ${successCount} emails sent successfully, ${failedCount} failed`,
          totalProcessed: results.length,
          statusList: results
        });
      } catch (error: any) {
        console.error(error);
        return next(new ErrorHandler("Error processing email batch", 500));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);




// --------------------------------->
// Define interfaces explicitly for clarity
interface Recipient {
  name: string;
  email: string;
  position: string;
}

interface EmailStatus {
  index: number;
  name: string;
  email: string;
  position: string;
  status: "success" | "failed";
  message: string;
}

export const sendRecruitmentEmails = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipients, template, subject, whatsappLink } = req.body;
      const EMAIL_DELAY_MS = 10000;

      // Validation
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return next(new ErrorHandler("Please provide a valid list of recipients", 400));
      }
      if (!template || typeof template !== "string") {
        return next(new ErrorHandler("Please provide a valid HTML template", 400));
      }
      if (!subject || typeof subject !== "string") {
        return next(new ErrorHandler("Please provide a valid subject", 400));
      }
      if (!whatsappLink || typeof whatsappLink !== "string") {
        return next(new ErrorHandler("Please provide a valid WhatsApp link", 400));
      }

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const sendSingleEmail = async ({ name, email, position }: Recipient, index: number): Promise<EmailStatus> => {
        if (!name || !email || !position) {
          return {
            index,
            name,
            email,
            position,
            status: "failed",
            message: "Missing name, email, or position",
          };
        }

        // Replace dynamic placeholders in the template
        let html = template
          .replace(/\${name}/g, name)
          .replace(/\${position}/g, position)
          .replace(/\${whatsappLink}/g, whatsappLink); // Use whatsappLink from request body

        try {
          await sendMail({
            email, // Use the recipient's email, not hardcoded
            subject,
            template: html,
          } as any);

          return {
            index,
            name,
            email,
            position,
            status: "success",
            message: `Email sent successfully to ${email}`,
          };
        } catch (error: any) {
          console.error(`Error sending email to ${email}:`, error);
          return {
            index,
            name,
            email,
            position,
            status: "failed",
            message: `Failed to send email to ${email}: ${error.message}`,
          };
        }
      };

      const results: EmailStatus[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const result = await sendSingleEmail(recipients[i], i);
        results.push(result);
        if (i < recipients.length - 1) {
          await delay(EMAIL_DELAY_MS);
        }
      }

      const successCount = results.filter((result) => result.status === "success").length;
      const failedCount = results.length - successCount;

      res.status(200).json({
        success: true,
        message: `Email sending completed. ${successCount} emails sent successfully, ${failedCount} failed`,
        totalProcessed: results.length,
        statusList: results,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);