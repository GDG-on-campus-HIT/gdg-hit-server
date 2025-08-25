import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import  EventForm  from "../models/form.model";
import { eventModel } from "../models/events.model";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";

/** Helpers */
const toDate = (v?: any): Date | undefined => (v ? new Date(v) : undefined);

// Create event form
export const createEventForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { event, formTitle, formDescription, startDate, endDate } =
        req.body as { event: string; formTitle: string; formDescription?: string; startDate?: Date; endDate?: Date };

      //  Validate event exists
      const existingEvent = await eventModel.findById(event).lean();
      if (!existingEvent) {
        return next(new ErrorHandler("Event not found", 404));
      }

      //  Create form with fixed required fields
      const form = await EventForm.create({
        event,
        formTitle,
        formDescription,
        fields: [
          { name: "name", type: "text", required: true },
          { name: "classRollNo", type: "text", required: true },
          { name: "department", type: "text", required: true },
          { name: "phoneNumber", type: "text", required: true },
          { name: "email", type: "email", required: true },
        ],
        startDate: toDate(startDate),
        endDate: toDate(endDate),
      });

      const populated = await form.populate("event", "name eventDate");

      res.status(201).json({
        success: true,
        message: "Event form created successfully",
        data: populated,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message || "Failed to create event form", 500));
    }
  }
);

//  GET EVENT FORM BY ID

export const getEventFormById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandler("Invalid form ID", 400));
      }

      const form = await EventForm.findById(id).populate("event", "name eventDate");
      if (!form) {
        return next(new ErrorHandler("Form not found", 404));
      }

      res.status(200).json({ success: true, data: form });
    } catch (err: any) {
      return next(new ErrorHandler(err.message || "Failed to fetch event form", 500));
    }
  }
);

// UPDATE EVENT FORM (title & description only)
 
export const updateEventForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { formTitle, formDescription, startDate, endDate } = req.body;

      const form = await EventForm.findByIdAndUpdate(
        id,
        {
          formTitle,
          formDescription,
          startDate: toDate(startDate),
          endDate: toDate(endDate),
        },
        { new: true }
      ).populate("event", "name eventDate");

      if (!form) {
        return next(new ErrorHandler("Form not found", 404));
      }

      res.status(200).json({
        success: true,
        message: "Event form updated successfully",
        data: form,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message || "Failed to update event form", 500));
    }
  }
);


//   DELETE EVENT FORM
 
export const deleteEventForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const form = await EventForm.findByIdAndDelete(id);
      if (!form) {
        return next(new ErrorHandler("Form not found", 404));
      }

      res.status(200).json({
        success: true,
        message: "Event form deleted successfully",
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message || "Failed to delete event form", 500));
    }
  }
);

//  TOGGLE FORM STATUS (active/inactive)
 
export const toggleFormStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const form = await EventForm.findById(id);
      if (!form) {
        return next(new ErrorHandler("Form not found", 404));
      }

      form.isActive = !form.isActive;
      await form.save();

      res.status(200).json({
        success: true,
        message: `Form status toggled to ${form.isActive ? "active" : "inactive"}`,
        data: form,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message || "Failed to toggle form status", 500));
    }
  }
);
