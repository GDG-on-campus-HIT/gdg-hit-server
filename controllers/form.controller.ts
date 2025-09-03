import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import EventForm, { IEventForm, IFormField } from "../models/form.model";
import { eventModel } from "../models/events.model";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";

/** Form Field Definitions */
const DEPARTMENT_OPTIONS = [
  "Chemical Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics & Communication Engineering",
  "Applied Electronics & Instrumentation Engineering",
  "Computer Science & Engineering",
  "Information Technology",
  "Computer Science & Engineering - Artificial Intelligence and Machine Learning",
  "Computer Science & Engineering - Data Science",
  "Computer Science & Engineering - Cyber Security",
  "Biotechnology",
  "Food Technology",
];

const BATCH_OPTIONS = ["1st", "2nd", "3rd", "4th"];
const YEAR_OPTIONS = ["1st", "2nd", "3rd", "4th"];

const BASE_FIELDS: IFormField[] = [
  {
    name: "Name",
    type: "text",
    required: true,
    label: "Name",
    placeholder: "Enter your Name"
  },
  {
    name: "classRollNo",
    type: "text",
    required: true,
    label: "Class Roll Number",
    placeholder: "Enter your class roll number"
  },
  {
    name: "department",
    type: "select",
    required: true,
    label: "Department",
    options: DEPARTMENT_OPTIONS
  },
  {
    name: "batch",
    type: "select",
    required: true,
    label: "Batch",
    options: BATCH_OPTIONS
  },
  {
    name: "year",
    type: "select",
    required: true,
    label: "Current Year",
    options: YEAR_OPTIONS
  },
  {
    name: "whatsappNo",
    type: "text",
    required: true,
    label: "WhatsApp Number",
    placeholder: "Enter your WhatsApp number"
  },
  {
    name: "Email",
    type: "text",
    required: true,
    label: "Email Address",
    placeholder: "Enter your Email Address"
  },
];

const PAYMENT_FIELDS: IFormField[] = [
  {
    name: "paymentUTRNo",
    type: "text",
    required: false,
    label: "Payment UTR Number",
    placeholder: "Enter UTR number from payment"
  },
  {
    name: "paymentSS",
    type: "file",
    required: false,
    label: "Payment Screenshot",
    accept: "image/*"
  }
];


const generateFormFields = (includePayment: boolean = false): IFormField[] => {
  const fields: IFormField[] = [...BASE_FIELDS];
  
  if (includePayment) {
    fields.push(...PAYMENT_FIELDS);
  }
  
  return fields;
};

export const createForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { 
      eventId, 
      formTitle, 
      description, 
      includePayment = false // Default to false
    } = req.body;

    // Validate required fields
    if (!eventId || !formTitle) {
      return next(new ErrorHandler("Event ID and form title are required", 400));
    }

    // Validate event ID format
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return next(new ErrorHandler("Invalid event ID format", 400));
    }

    // Check if event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return next(new ErrorHandler("Event not found", 404));
    }

    // Check for duplicate forms - prevent multiple forms per event
    const existingForm = await EventForm.findOne({ event: eventId });
    if (existingForm) {
      return next(new ErrorHandler("A registration form already exists for this event", 400));
    }

    // Generate form fields
    const formFields = generateFormFields(includePayment);

    // Create new form in database
    const form = await EventForm.create({
      event: eventId,
      formTitle: formTitle.trim(),
      description: description?.trim() || "",
      fields: formFields, 
      isActive: true,
    });

    // Populate event details
    const populatedForm = await form.populate("event", "name eventDate");

    // Return response with fields for frontend mapping
    res.status(201).json({
      success: true,
      message: "Event registration form created successfully",
      data: {
        form: populatedForm,
        fields: formFields, 
        includePayment
      }
    });
  }
);


export const getFormById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid form ID format", 400));
    }

    const form = await EventForm.findById(id).populate("event", "name eventDate");
    
    if (!form) {
      return next(new ErrorHandler("Form not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        form,
        fields: form.fields 
      }
    });
  }
);


export const getAllForms = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const forms = await EventForm.find().populate("event", "name eventDate");
    
    res.status(200).json({
      success: true,
      data: forms.map(form => ({
        form,
        fields: form.fields
      }))
    });
  }
);


export const updateForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { formTitle, description, includePayment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid form ID format", 400));
    }

    // Generate updated fields if payment option changed
    const updatedFields: IFormField[] | undefined = includePayment !== undefined 
      ? generateFormFields(includePayment) 
      : undefined;

    const updateData: Partial<IEventForm> = {};
    if (formTitle) updateData.formTitle = formTitle.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (updatedFields) updateData.fields = updatedFields;

    const form = await EventForm.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("event", "name eventDate");

    if (!form) {
      return next(new ErrorHandler("Form not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      data: {
        form,
        fields: form.fields
      }
    });
  }
);


export const deleteForm = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid form ID format", 400));
    }

    const form = await EventForm.findByIdAndDelete(id);
    
    if (!form) {
      return next(new ErrorHandler("Form not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Form deleted successfully"
    });
  }
);


export const toggleFormActive = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid form ID format", 400));
    }

    const form = await EventForm.findById(id);
    if (!form) {
      return next(new ErrorHandler("Form not found", 404));
    }

    form.isActive = !form.isActive;
    await form.save();

    res.status(200).json({
      success: true,
      message: `Form is now ${form.isActive ? "active" : "inactive"}`,
      data: form
    });
  }
);