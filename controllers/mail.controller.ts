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
                    <img src="https://gdghit.site/assets/logo-gdg.png" alt="GDG HIT">
                </div>
        
                <div class="content">
                    <h3>Hello ${name} 👋,</h3>
                    
                    <p style="margin-top: 20px; margin-bottom: 20px;">
                    Ready to be part of something BIGGER? The wait is over - <strong>GDG on campus HIT</strong> is opening its doors for brilliant minds and passionate talents to join our powerhouse team! If you live and breathe tech, creativity, or community building, this is YOUR MOMENT to shine! 
                    </p>
                    <center>
                        <a href="https://gdghit.site" class="button">Apply Now</a>
                    </center>
                </div>
        
                <div class="image-content">
                    <img src="https://gdghit.site/img/recruitment-og-image.jpeg" alt="GDG HIT Recruitment">
                </div>
        
                <div class="footer">
                    <p>Best regards,</p>
                    <p><strong>GDG on campus - HIT</strong></p>
                    <p>© 2025 GDG on campus HIT. All rights reserved.</p>
                    <p>For more details, visit <a href="https://gdghit.site" class="website-link">gdghit.site</a>.</p>
                    <p class="unsubscribe">No longer interested? <a href="https://gdghit.site/contact-us">Unsubscribe here</a>.</p>
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