import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import { certificateCheckUrl, certificateFileUrl } from "../utlis/certificateRenderer";
import ErrorHandler from "../utlis/ErrorHandler";
import { eventModel, eventRegistrationModel } from "../models/events.model";
import userModel from "../models/user.model";
import cloudinary from "cloudinary";
import { certificateModel } from "../models/certificate.model";
import { Readable } from "stream";
import { ObjectId, Schema } from "mongoose";


export const addCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event, user, registration, verification_code } = req.body;
      const file = req.file; // `file` will contain the uploaded file
      
      // Validate required fields
      if (!event || !user || !registration || !verification_code || !file) {
        return next(
          new ErrorHandler(
            "All fields including certificate PDF are required.",
            400
          )
        );
      }

      const certificate = await certificateModel.findOne({
        verification_code: verification_code,
      });

      if (certificate) {
        return next(
          new ErrorHandler("Certificate verification code already exists.", 400)
        );
      }

      // Check if the event exists
      const existingEvent = await eventModel.findById(event);
      if (!existingEvent) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Check if the user exists
      const existingUser = await userModel.findById(user);
      if (!existingUser) {
        return next(new ErrorHandler("User not found.", 404));
      }

      // Check if the registration exists
      const existingRegistration = await eventRegistrationModel.findById(
        registration
      );
      if (!existingRegistration) {
        return next(new ErrorHandler("Registration not found.", 404));
      }

      // Directly upload the file buffer to Cloudinary
      cloudinary.v2.uploader.upload_stream(
        { resource_type: "auto", folder: "certificates" },
        async (error, result) => {
          if (error) {
            return next(
              new ErrorHandler(
                error.message || "Failed to upload file to Cloudinary.",
                500
              )
            );
          }

          // Create a new certificate record
          const newCertificate = await certificateModel.create({
            event,
            user,
            registration,
            certificate: {
              public_id: result?.public_id,
              url: result?.secure_url,
            },
            verification_code,
          });

          existingRegistration.certificate = newCertificate._id as unknown as Schema.Types.ObjectId;
          await existingRegistration.save();
          
          res.status(201).json({
            success: true,
            certificate: newCertificate,
          });
        }
      ).end(file.buffer); // Directly pass the buffer here
    } catch (error: any) {
      console.log(error)
      return next(
        new ErrorHandler(error.message || "Failed to add certificate.", 500)
      );
    }
  }
);


export const updateCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event, user, registration, verification_code } = req.body;
      const file = req.file; // `file` will contain the uploaded file

      // Validate required fields
      if (!event || !user || !registration || !verification_code) {
        return next(
          new ErrorHandler(
            "All fields including certificate PDF are required.",
            400
          )
        );
      }

      // Check if the event exists
      const existingEvent = await eventModel.findById(event);
      if (!existingEvent) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Check if the user exists
      const existingUser = await userModel.findById(user);
      if (!existingUser) {
        return next(new ErrorHandler("User not found.", 404));
      }

      // Check if the registration exists
      const existingRegistration = await eventRegistrationModel.findById(
        registration
      );
      if (!existingRegistration) {
        return next(new ErrorHandler("Registration not found.", 404));
      }

      // Find the existing certificate using the verification code
      const existingCertificate = await certificateModel.findOne({
        verification_code: verification_code,
      });

      if (!existingCertificate) {
        return next(new ErrorHandler("Certificate not found.", 404));
      }

      // If a file is provided, delete the existing certificate from Cloudinary and upload the new one
      if (file) {
        // Delete the existing file from Cloudinary
        if (existingCertificate.certificate.public_id) {
          await cloudinary.v2.uploader.destroy(
            existingCertificate.certificate.public_id,
            // { resource_type: "raw" },
            (error, result) => {
              if (error) {
                console.log("Error deleting existing certificate:", error);
              }
            }
          );
        }

        // Upload new file to Cloudinary
        cloudinary.v2.uploader.upload_stream(
          { resource_type: "auto", folder: "certificates" },
          async (error, result) => {
            if (error) {
              return next(
                new ErrorHandler(
                  error.message || "Failed to upload file to Cloudinary.",
                  500
                )
              );
            }

            // Update certificate record
            existingCertificate.event = event;
            existingCertificate.user = user;
            existingCertificate.registration = registration;
            existingCertificate.certificate = {
              public_id: result?.public_id as string,
              url: result?.secure_url as string,
            };
            await existingCertificate.save();

            existingRegistration.certificate = existingCertificate._id as unknown as Schema.Types.ObjectId;
            await existingRegistration.save();

            res.status(200).json({
              success: true,
              certificate: existingCertificate,
            });
          }
        ).end(file.buffer); // Directly pass the buffer here
      } else {
        // Update without changing the file
        existingCertificate.event = event;
        existingCertificate.user = user;
        existingCertificate.registration = registration;
        await existingCertificate.save();

        existingRegistration.certificate = existingCertificate._id as unknown as Schema.Types.ObjectId;
        await existingRegistration.save();

        res.status(200).json({
          success: true,
          certificate: existingCertificate,
        });
      }
    } catch (error: any) {
      console.log(error);
      return next(
        new ErrorHandler(error.message || "Failed to update certificate.", 500)
      );
    }
  }
);



export const getCertificateById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificateId = req.params.id;

      const certificate = await certificateModel
        .findById(certificateId)
        .populate("event")
        .populate("user")
        .populate("registration");

      if (!certificate) {
        return next(new ErrorHandler("Certificate not found.", 404));
      }

      res.status(200).json({
        success: true,
        certificate,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "Failed to fetch certificate.", 500)
      );
    }
  }
);

export const deleteCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificateId = req.params.id;

      const certificate = await certificateModel.findById(certificateId);
      if (!certificate) {
        return next(new ErrorHandler("Certificate not found.", 404));
      }

      if (certificate.certificate?.public_id) {
        await cloudinary.v2.uploader
          .destroy(certificate.certificate.public_id)
          .catch((error) => console.log("Error deleting certificate file:", error));
      }

      await eventRegistrationModel.updateOne(
        { _id: certificate.registration, certificate: certificate._id },
        { $unset: { certificate: 1 } }
      );

      await certificateModel.findByIdAndDelete(certificateId);

      res.status(200).json({
        success: true,
        message: "Certificate deleted successfully.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "Failed to delete certificate.", 500)
      );
    }
  }
);

export const getAllCertificates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certificates = await certificateModel
        .find()
        .sort({ createdAt: -1 })
        .populate({ path: "event", select: "_id name eventDate" })
        .populate({ path: "user", select: "_id name email" })
        .populate({ path: "registration", select: "_id classRollNo department" })
        .populate({ path: "participant", select: "_id name email classRollNo department attendance position" })
        .lean();

      res.status(200).json({
        success: true,
        certificates,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "Failed to fetch certificates.", 500)
      );
    }
  }
);

export const getMyCertificates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const certificates: any[] = await certificateModel
      .find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .populate({ path: "event", select: "_id name eventDate" })
      .lean();

    res.status(200).json({
      success: true,
      certificates: certificates.map((c) => {
        const rendered = !!c.participant;
        const viewUrl = rendered ? certificateFileUrl(req, c.verification_code) : c.certificate?.url || null;
        return {
          _id: c._id,
          code: c.verification_code,
          kind: c.kind || "participation",
          position: c.position ?? null,
          issuedAt: c.createdAt,
          event: c.event ? { _id: c.event._id, name: c.event.name, eventDate: c.event.eventDate } : null,
          viewUrl,
          downloadUrl: rendered ? `${viewUrl}?download=1` : viewUrl,
          verifyUrl: certificateCheckUrl(req, c.verification_code),
        };
      }),
    });
  }
);

export const verifyCertificate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const verification_code = req.params.verification_code;

      const certificates = await certificateModel
        .findOne({ verification_code: verification_code })
        .populate({ path: "user", select: "_id name" })
        .populate({ path: "event", select: "_id name" })
        .populate({ path: "registration", select: "_id classRollNo department" });

      // If no certificates are found for this verification code
      if (!certificates) {
        return next(
          new ErrorHandler("No certificates found for this user.", 404)
        );
      }

      // Send response with certificates
      res.status(200).json({
        success: true,
        certificates,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(error.message || "Failed to fetch certificates.", 500)
      );
    }
  }
);



// API to increase the download count of a certificate
export const increaseDownloadCount = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { certificateId } = req.params; // Assuming certificate ID is passed as a URL parameter

      // Find the certificate by ID
      const certificate = await certificateModel.findById(certificateId);

      if(certificate?.user != req.user?._id){
        return next(new ErrorHandler("User not found", 404));
      }

      // If certificate is not found
      if (!certificate) {
        return next(new ErrorHandler("Certificate not found.", 404));
      }

      // Increase the download count
      certificate.download += 1;
      await certificate.save();

      // Send response with certificate details
      res.status(200).json({
        success: true,
        message: "Download count updated successfully.",
        downloadCount: certificate.download,
        certificate,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message || "Failed to update download count.", 500));
    }
  }
);
