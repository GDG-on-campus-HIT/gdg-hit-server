import { NextFunction, Request, Response } from "express";
import imagekit from "../utlis/imageKit";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import {
  eventModel,
  eventRegistrationModel,
  eventFAQModel,
} from "../models/events.model";
import EventWhatsapp from "../models/eventWhatsapp.model";
import userModel from "../models/user.model";

// Get list of events
export const getEvents = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await eventModel
        .find()
        .select("-registrations") // Exclude the registrations field
        .populate("faq")
        .sort({ createdAt: -1 }); // Populate the FAQ field

      res.status(200).json({
        success: true,
        events,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get a specific event by ID
export const getEventById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.id;

      // Find the event by ID
      const event = await eventModel
        .findById(eventId)
        .populate("faq") // Optionally populate FAQ references
        .select("-registrations")
        .sort({ createdAt: -1 }); // Optionally populate registration references

      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Send response
      res.status(200).json({
        success: true,
        event,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Add a new event
export const addEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        description,
        category,
        registrationFee,
        details,
        venue,
        eventDate,
        eventTime,
        upiID,
        is_upcoming,
      } = req.body;

      const requiredFields = {
        name: "Please provide a name for the event.",
        description: "Please provide a description for the event.",
        category: "Please specify the category of the event.",
        registrationFee: "Please specify the registration fee for the event.",
        details: "Please provide details for the event.",
        venue: "Please provide venue of the event.",
        eventDate: "Please specify the event date.",
        eventTime: "Please specify the event time.",
        is_upcoming: "Please indicate whether the event is upcoming.",
      };

      for (const [key, message] of Object.entries(requiredFields)) {
        if (!req.body[key]) {
          return next(new ErrorHandler(message, 400));
        }
      }

      let eventBanner = undefined;
      let paymentQR = undefined;

      // Upload event banner to ImageKit
      if (req.body.eventBanner) {
        const uploadedBanner = await imagekit.upload({
          file: req.body.eventBanner,
          fileName: `event_banner_${Date.now()}`,
          folder: "/event_banners",
        });
        eventBanner = {
          public_id: uploadedBanner.fileId,
          url: uploadedBanner.url,
        };
      }

      // Upload payment QR to ImageKit
      if (req.body.paymentQR) {
        const uploadedQR = await imagekit.upload({
          file: req.body.paymentQR,
          fileName: `payment_qr_${Date.now()}`,
          folder: "/payment_qr",
        });
        paymentQR = {
          public_id: uploadedQR.fileId,
          url: uploadedQR.url,
        };
      }

      // Create event
      const newEvent = await eventModel.create({
        name,
        description,
        category,
        registrationFee,
        details,
        venue,
        eventDate,
        eventTime,
        eventBanner,
        paymentQR,
        upiID,
        is_upcoming,
      });

      res.status(201).json({
        success: true,
        new_event: newEvent,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 400)
      );
    }
  }
);

// Update an event
export const updateEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.id;
      const {
        name,
        description,
        category,
        registrationFee,
        details,
        venue,
        eventDate,
        eventTime,
        upiID,
        is_upcoming,
        registration_open,
      } = req.body;

      const event = await eventModel.findById(eventId);
      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Update event banner
      if (req.body.eventBanner) {
        if (event.eventBanner?.public_id) {
          await imagekit.deleteFile(event.eventBanner.public_id);
        }

        const uploadedBanner = await imagekit.upload({
          file: req.body.eventBanner,
          fileName: `event_banner_${Date.now()}`,
          folder: "/event_banners",
        });
        event.eventBanner = {
          public_id: uploadedBanner.fileId,
          url: uploadedBanner.url,
        };
      }

      // Update payment QR
      if (req.body.paymentQR) {
        if (event.paymentQR?.public_id) {
          await imagekit.deleteFile(event.paymentQR.public_id);
        }

        const uploadedQR = await imagekit.upload({
          file: req.body.paymentQR,
          fileName: `payment_qr_${Date.now()}`,
          folder: "/payment_qr",
        });
        event.paymentQR = {
          public_id: uploadedQR.fileId,
          url: uploadedQR.url,
        };
      }

      // Conditionally update other fields
      if (name) event.name = name;
      if (description) event.description = description;
      if (category) event.category = category;
      if (registrationFee) event.registrationFee = registrationFee;
      if (venue) event.venue = venue;
      if (details) event.details = details;
      if (eventDate) event.eventDate = eventDate;
      if (eventTime) event.eventTime = eventTime;
      if (upiID) event.upiID = upiID;
      if (typeof is_upcoming !== "undefined") event.is_upcoming = is_upcoming;
      if (typeof registration_open !== "undefined")
        event.registration_open = registration_open;

      await event.save();

      res.status(200).json({
        success: true,
        updated_event: event,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Delete an event
export const deleteEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.id;

      // Find the event
      const event = await eventModel.findById(eventId);
      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Delete associated FAQs
      if (event.faq && event.faq.length > 0) {
        // Get all FAQ IDs
        const faqIds = event.faq;

        // Delete all FAQs
        await eventFAQModel.deleteMany({ _id: { $in: faqIds } });
      }

      // Delete associated registrations
      if (event.registrations && event.registrations.length > 0) {
        // Get all registration IDs
        const registrationIds = event.registrations;

        // Delete all registrations
        await eventRegistrationModel.deleteMany({
          _id: { $in: registrationIds },
        });

        // Optionally delete payment screenshots from ImageKit
        const registrations = await eventRegistrationModel.find({
          _id: { $in: registrationIds },
        });
        for (const registration of registrations) {
          if (registration.paymentSS?.public_id) {
            await imagekit.deleteFile(registration.paymentSS.public_id);
          }
        }
      }

      // Remove event document
      await eventModel.findByIdAndDelete(eventId);

      res.status(200).json({
        success: true,
        message: "Event and related data deleted successfully.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

export const uploadGalleryForEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.id;
      const { galleryImages } = req.body; // Expecting an array of base64 image data

      const event = await eventModel.findById(eventId);
      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Ensure there are images to upload
      if (!galleryImages || galleryImages.length === 0) {
        return next(new ErrorHandler("No images provided for upload.", 400));
      }

      // Clear existing gallery images from ImageKit if necessary
      if (event.gallery && event.gallery.length > 0) {
        for (const image of event.gallery) {
          await imagekit.deleteFile(image.public_id);
        }
      }

      // Upload new gallery images to ImageKit
      const uploadedGallery = [];
      for (let i = 0; i < galleryImages.length; i++) {
        const imageBase64 = galleryImages[i];
        
        const uploadedImage = await imagekit.upload({
          file: imageBase64,
          fileName: `gallery_${Date.now()}_${i}`,
          folder: "/event_gallery",
        });
        
        uploadedGallery.push({
          public_id: uploadedImage.fileId,
          url: uploadedImage.url,
        });
      }

      // Update the event's gallery field with the new images
      event.gallery = uploadedGallery;
      await event.save();

      res.status(200).json({
        success: true,
        message: "Gallery images uploaded successfully.",
        gallery: event.gallery,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          "Something went wrong while uploading the gallery.",
          500
        )
      );
    }
  }
);

export const updateGalleryForEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.id;
      const { galleryImages, imagesToRemove } = req.body; // Expecting arrays of image data and image IDs to remove

      const event = await eventModel.findById(eventId);
      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Remove specified images from ImageKit and filter them out from the gallery array
      if (imagesToRemove && imagesToRemove.length > 0) {
        for (const imageId of imagesToRemove) {
          await imagekit.deleteFile(imageId);
        }
        // Update gallery in the database by removing the images
        event.gallery = event.gallery.filter(
          (image) => !imagesToRemove.includes(image.public_id)
        );
      }

      // Process new gallery images
      if (galleryImages && galleryImages.length > 0) {
        for (let i = 0; i < galleryImages.length; i++) {
          const imageBase64 = galleryImages[i];
          
          const uploadedImage = await imagekit.upload({
            file: imageBase64,
            fileName: `gallery_update_${Date.now()}_${i}`,
            folder: "/event_gallery",
          });

          // Add new image to the existing gallery array
          event.gallery.push({
            public_id: uploadedImage.fileId,
            url: uploadedImage.url,
          });
        }
      }

      // Save the updated event
      await event.save();

      res.status(200).json({
        success: true,
        message: "Gallery updated successfully.",
        gallery: event.gallery,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler(
          "Something went wrong while updating the gallery.",
          500
        )
      );
    }
  }
);

// Get list of FAQs for a specific event
export const getFAQs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const faqs = await eventFAQModel.find({ event: eventId });

      res.status(200).json({
        success: true,
        faqs,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Add a new FAQ
export const addFAQ = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event, question, answer } = req.body;

      if (!event || !question || !answer) {
        return next(
          new ErrorHandler("Please provide all required fields.", 400)
        );
      }

      // Create the new FAQ
      const newFAQ = await eventFAQModel.create({
        event,
        question,
        answer,
      });

      // Add the FAQ ID to the event
      await eventModel.findByIdAndUpdate(
        event,
        { $push: { faq: newFAQ._id } },
        { new: true }
      );

      res.status(201).json({
        success: true,
        new_faq: newFAQ,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 400)
      );
    }
  }
);

// Update an FAQ
export const updateFAQ = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const faqId = req.params.id;
      const { question, answer } = req.body;

      const faq = await eventFAQModel.findById(faqId);
      if (!faq) {
        return next(new ErrorHandler("FAQ not found.", 404));
      }

      if (question) faq.question = question;
      if (answer) faq.answer = answer;

      await faq.save();

      res.status(200).json({
        success: true,
        updated_faq: faq,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Delete an FAQ
export const deleteFAQ = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const faqId = req.params.id;

      const faq = await eventFAQModel.findById(faqId);
      if (!faq) {
        return next(new ErrorHandler("FAQ not found.", 404));
      }

      const eventId = faq.event;

      await eventFAQModel.findByIdAndDelete(faqId);

      // Remove the FAQ ID from the event
      await eventModel.findByIdAndUpdate(
        eventId,
        { $pull: { faq: faqId } },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "FAQ deleted successfully.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// get all registrations
export const getAllRegistrations = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrations = await eventRegistrationModel
        .find()
        .populate("user", "_id name department whatsappNo email")
        .populate("event", "name")
        .populate("certificate", "_id certificate");

      const transformedRegistrations = registrations.map((reg: any) => {
        const {
          paymentSS,
          _id,
          classRollNo,
          department,
          whatsappNo,
          paymentUTRNo,
          attendance,
          verificationCode,
          createdAt,
          updatedAt,
          __v,
          user,
          event,
          certificate,
        } = reg;

        return {
          paymentSS,
          _id,
          eventId: event?._id || null,
          eventName: event?.name || null,
          userId: user?._id || null,
          userName: user?.name || null,
          userDepartment: user?.department || null,
          userWhatsappNo: user?.whatsappNo || null,
          userEmail: user?.email || null,
          classRollNo,
          department,
          whatsappNo,
          paymentUTRNo,
          attendance,
          verificationCode,
          createdAt,
          updatedAt,
          __v,
          certificateId: certificate?._id || null,
          certificatePublicId: certificate?.certificate?.public_id || null,
          certificateUrl: certificate?.certificate?.url || null,
          verification_code: certificate?.verification_code || null,
        };
      });

      res.status(200).json({
        success: true,
        registrations: transformedRegistrations,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get list of registrations for a specific event
export const getRegistrations = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const registrations = await eventRegistrationModel
        .find({ event: eventId })
        .populate("user");

      res.status(200).json({
        success: true,
        registrations,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get a specific registration by ID
export const getRegistrationById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrationId = req.params.id;

      // Find the registration by ID
      const registration = await eventRegistrationModel
        .findById(registrationId)
        .populate("event") // Optionally populate event reference
        .populate("user"); // Optionally populate user reference

      if (!registration) {
        return next(new ErrorHandler("Registration not found.", 404));
      }

      // Send response
      res.status(200).json({
        success: true,
        registration,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

const generateVerificationCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Add a new registration
export const addRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        event,
        rollNo,
        department,
        whatsappNumber,
        paymentSS,
        paymentUTRNo,
      } = req.body;

      // Ensure required fields are provided
      if (!event || !rollNo || !department || !whatsappNumber) {
        return next(
          new ErrorHandler("Please provide all required fields.", 400)
        );
      }

      const userId = (req.user as { _id: string })._id || "";
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      const eventCheck = await eventModel.findById(event);
      if (!eventCheck) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      if (!eventCheck.registration_open) {
        return next(new ErrorHandler("Registration Closed!", 404));
      }

      // Check if the user is already registered for the event
      const existingRegistration = await eventRegistrationModel.findOne({
        event,
        user: user._id,
      });

      if (existingRegistration) {
        return next(
          new ErrorHandler("You are already registered for this event.", 400)
        );
      }

      let paymentSSImage = undefined;
      let utrNo = undefined;

      // Check if registration fee is not free
      if (eventCheck.registrationFee !== "free") {
        // Upload payment screenshot to ImageKit
        if (paymentSS) {
          const uploadedPaymentSS = await imagekit.upload({
            file: paymentSS,
            fileName: `payment_ss_${Date.now()}`,
            folder: "/payment_screenshots",
          });
          paymentSSImage = {
            public_id: uploadedPaymentSS.fileId,
            url: uploadedPaymentSS.url,
          };
        }

        // Assign UTR number if provided
        utrNo = paymentUTRNo;
      }

      // Generate a unique 5-letter verification code
      let verificationCode;
      let isUnique = false;

      // Ensure uniqueness of the verification code
      while (!isUnique) {
        verificationCode = generateVerificationCode();
        const existingCode = await eventRegistrationModel.findOne({
          verificationCode,
        });
        if (!existingCode) {
          isUnique = true;
        }
      }

      if (
        rollNo != user.classRollNo ||
        department != user.department ||
        whatsappNumber != user.whatsappNo
      ) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              classRollNo: rollNo,
              department,
              whatsappNo: whatsappNumber,
            },
          },
          { new: true }
        );
      }

      // Create the new registration
      const newRegistration = await eventRegistrationModel.create({
        event,
        user: user._id,
        classRollNo:rollNo,
        department,
        whatsappNo:whatsappNumber,
        paymentSS: paymentSSImage,
        paymentUTRNo: utrNo,
        verificationCode, // Add verification code here
      });

      // Add the registration ID to the event
      await eventModel.findByIdAndUpdate(
        event,
        { $push: { registrations: newRegistration._id } },
        { new: true }
      );

      

      res.status(201).json({
        success: true,
        new_registration: newRegistration,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 400)
      );
    }
  }
);

// Update a registration
export const updateRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrationId = req.params.id;
      const {
        rollNo,
        department,
        whatsappNumber,
        paymentSS,
        paymentUTRNo,
        attendance,
      } = req.body;

      const registration = await eventRegistrationModel.findById(
        registrationId
      );
      if (!registration) {
        return next(new ErrorHandler("Registration not found.", 404));
      }

      // Handle payment screenshot update
      if (paymentSS) {
        if (registration.paymentSS?.public_id) {
          await imagekit.deleteFile(registration.paymentSS.public_id);
        }

        const uploadedPaymentSS = await imagekit.upload({
          file: paymentSS,
          fileName: `payment_ss_update_${Date.now()}`,
          folder: "/payment_screenshots",
        });
        registration.paymentSS = {
          public_id: uploadedPaymentSS.fileId,
          url: uploadedPaymentSS.url,
        };
      }

      // Conditionally update other fields
      if (rollNo) registration.classRollNo = rollNo;
      if (department) registration.department = department;
      if (whatsappNumber) registration.whatsappNo = whatsappNumber;
      if (paymentUTRNo) registration.paymentUTRNo = paymentUTRNo;
      if (attendance) registration.attendance = attendance;

      await registration.save();

      res.status(200).json({
        success: true,
        updated_registration: registration,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Delete a registration
export const deleteRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrationId = req.params.id;

      const registration = await eventRegistrationModel.findById(
        registrationId
      );
      if (!registration) {
        return next(new ErrorHandler("Registration not found.", 404));
      }

      const eventId = registration.event;

      if (registration.paymentSS?.public_id) {
        await imagekit.deleteFile(registration.paymentSS.public_id);
      }

      await eventRegistrationModel.findByIdAndDelete(registrationId);

      // Remove the registration ID from the event
      await eventModel.findByIdAndUpdate(
        eventId,
        { $pull: { registrations: registrationId } },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "Registration deleted successfully.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Get list of registrations for a specific event
export const getEventRegistrations = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;

      // Find registrations for the specified event
      const registrations = await eventRegistrationModel
        .find({ event: eventId })
        .populate({ path: "user", select: "_id name email" })
        .populate({ path: "event", select: "_id name" })
        .populate({ path: "certificate" });

      if (!registrations.length) {
        return res.status(404).json({
          success: false,
          message: "No registrations found for this event.",
        });
      }

      res.status(200).json({
        success: true,
        registrations,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

//check if event registered
export const checkIfRegistered = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event } = req.params;

      // Ensure event ID is provided
      if (!event) {
        return next(new ErrorHandler("Event ID is required.", 400));
      }

      const userId = (req.user as { _id: string })._id || "";
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      const eventCheck = await eventModel.findById(event);
      if (!eventCheck) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Check if the user is already registered for the event
      const existingRegistration = await eventRegistrationModel.findOne({
        event,
        user: user._id,
      });

      if (existingRegistration) {
        return res.status(200).json({
          success: true,
          message: "User is already registered for this event.",
        });
      }

      return res.status(200).json({
        success: false,
        message: "User is not registered for this event.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// temporary -------------------->
export const addMultipleRegistration =  CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const newRegistration = await eventRegistrationModel.insertMany([
        { "event": "671d5f48ac2834026446bb67",
    "user": "671d5132ca65d95a1d8ebaf4",
    "classRollNo": "23/IT/189",
    "department": "IT",
    "whatsappNo": 6201560339,
    "verificationCode": "VCTRn"
  }
      ]
      );
  
      // Extract all registration IDs
      const registrationIds = newRegistration.map((reg) => reg._id);
  
      // Add the registration IDs to the event
      await eventModel.findByIdAndUpdate(
        "671d5f48ac2834026446bb67", // Event ID fixed
        { $push: { registrations: { $each: registrationIds } } },
        { new: true }
      );
  
      res.status(201).json({
        success: true,
        new_registration: newRegistration,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Get event poster
export const getEventPoster = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      const event = await eventModel.findById(eventId).select('poster');

      if (!event) {
        return next(new ErrorHandler("Event not found", 404));
      }

      res.status(200).json({
        success: true,
        poster: event.poster
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Upload/Update event poster by event ID
export const uploadEventPoster = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const { poster } = req.body;

      if (!poster) {
        return next(new ErrorHandler("Please provide event poster", 400));
      }

      const event = await eventModel.findById(eventId);

      if (!event) {
        return next(new ErrorHandler("Event not found", 404));
      }

      // Delete existing poster if exists
      if (event.poster?.public_id) {
        await imagekit.deleteFile(event.poster.public_id);
      }

      // Upload new poster to ImageKit
      const uploadedPoster = await imagekit.upload({
        file: poster,
        fileName: `event_poster_${eventId}_${Date.now()}`,
        folder: "/event_posters",
      });

      // Update event with new poster
      event.poster = {
        public_id: uploadedPoster.fileId,
        url: uploadedPoster.url,
      };

      await event.save();

      res.status(200).json({
        success: true,
        message: "Event poster uploaded successfully",
        poster: event.poster
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get event contact information
export const getEventContactInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      const event = await eventModel.findById(eventId).select("contactInfo name");

      if (!event) {
        return next(new ErrorHandler("Event not found", 404));
      }

      res.status(200).json({
        success: true,
        eventId: event._id,
        eventName: event.name,
        contactInfo: event.contactInfo || [],
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Add/Update event contact information
export const updateEventContactInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const { contactInfo } = req.body;

      if (!contactInfo || !Array.isArray(contactInfo)) {
        return next(new ErrorHandler("Please provide valid contact information array", 400));
      }

      // Validate contact info structure
      for (const contact of contactInfo) {
        if (!contact.name || !contact.mobile || !contact.year) {
          return next(new ErrorHandler("Each contact must have name, mobile, and year", 400));
        }
      }

      const event = await eventModel.findById(eventId);

      if (!event) {
        return next(new ErrorHandler("Event not found", 404));
      }

      // Update contact information
      event.contactInfo = contactInfo;
      await event.save();

      res.status(200).json({
        success: true,
        message: "Event contact information updated successfully",
        eventId: event._id,
        eventName: event.name,
        contactInfo: event.contactInfo,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Set or update whatsapp group link for an event (Admin only)
export const setEventWhatsappLink = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params as any;
      const { whatsappLink } = req.body;

      if (!whatsappLink || typeof whatsappLink !== "string") {
        return next(new ErrorHandler("Please provide a valid whatsapp link", 400));
      }

      const event = await eventModel.findById(eventId);
      if (!event) return next(new ErrorHandler("Event not found", 404));

      // Upsert EventWhatsapp document
      const existing = await EventWhatsapp.findOne({ event: event._id });
      if (existing) {
        existing.whatsappLink = whatsappLink;
        await existing.save();
        return res.status(200).json({ success: true, message: "Whatsapp link updated", whatsappLink: existing.whatsappLink });
      }

      const created = await EventWhatsapp.create({ event: event._id, whatsappLink });
      res.status(201).json({ success: true, message: "Whatsapp link saved", whatsappLink: created.whatsappLink });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get whatsapp group link for an event (public)
export const getEventWhatsappLink = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params as any;
      const event = await eventModel.findById(eventId).select("name");
      if (!event) return next(new ErrorHandler("Event not found", 404));

      const linkDoc = await EventWhatsapp.findOne({ event: event._id });
      res.status(200).json({ success: true, eventId: event._id, eventName: event.name, whatsappLink: linkDoc ? linkDoc.whatsappLink : null });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
