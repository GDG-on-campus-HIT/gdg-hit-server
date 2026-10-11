import { Request, Response, NextFunction } from 'express';
import { contactModel } from '../models/contact.model';
import ErrorHandler from '../utlis/ErrorHandler';
import { CatchAsyncError } from '../middleware/CatchAsyncError';


// Add a new contact message
export const addContact = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, mobile_number, message } = req.body;

      // Validate required fields
      const requiredFields = {
        name: "Please provide a name.",
        email: "Please provide an email address.",
        mobile_number: "Please provide a mobile number.",
        message: "Please provide a message.",
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!req.body[key]) {
          return next(new ErrorHandler(value, 400));
        }
      }

      // Create new contact entry
      const newContact = await contactModel.create({
        name,
        email,
        mobile_number,
        message,
      });

      res.status(201).json({
        success: true,
        contact: newContact,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to create contact entry. Please try again.", 500));
    }
  }
);

// Get all contact messages
export const getContacts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contacts = await contactModel.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        contacts,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to retrieve contact entries. Please try again.", 500));
    }
  }
);

// Get a single contact message by ID
export const getContactById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = req.params.id;
      const contact = await contactModel.findById(contactId);

      if (!contact) {
        return next(new ErrorHandler("Contact entry not found.", 404));
      }

      res.status(200).json({
        success: true,
        contact,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to retrieve contact entry. Please try again.", 500));
    }
  }
);

// Update a contact message
export const updateContact = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = req.params.id;
      const { name, email, mobile_number, message, isRead } = req.body;

      const contact = await contactModel.findById(contactId);
      if (!contact) {
        return next(new ErrorHandler("Contact entry not found.", 404));
      }

      // Conditionally update fields
      if (name) contact.name = name;
      if (email) contact.email = email;
      if (mobile_number) contact.mobile_number = mobile_number;
      if (message) contact.message = message;
      if (typeof isRead === "boolean") contact.isRead = isRead;

      await contact.save();

      res.status(200).json({
        success: true,
        updated_contact: contact,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to update contact entry. Please try again.", 500));
    }
  }
);

// Delete a contact message
export const deleteContact = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contactId = req.params.id;
      const contact = await contactModel.findByIdAndDelete(contactId);

      if (!contact) {
        return next(new ErrorHandler("Contact entry not found.", 404));
      }

      res.status(200).json({
        success: true,
        message: "Contact entry deleted successfully.",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Failed to delete contact entry. Please try again.", 500));
    }
  }
);
