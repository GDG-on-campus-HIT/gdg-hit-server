import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import { testimonialModel } from "../models/testimonial.model";
import ErrorHandler from "../utlis/ErrorHandler";

// Add a new testimonial
export const addTestimonial = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, department, message } = req.body;
  
        // Validate required fields
        const requiredFields = {
          name: "Please provide a name for the testimonial.",
          department: "Please provide a department.",
          message: "Please provide a message for the testimonial.",
        };
  
        for (const [key, message] of Object.entries(requiredFields)) {
          if (!req.body[key]) {
            return next(new ErrorHandler(message, 400));
          }
        }
  
        // Create testimonial
        const newTestimonial = await testimonialModel.create({
          name,
          department,
          message,
        });
  
        res.status(201).json({
          success: true,
          new_testimonial: newTestimonial,
        });
      } catch (error: any) {
        return next(
          new ErrorHandler("Something went wrong. Please try again.", 400)
        );
      }
    }
  );
  
  // Update a testimonial
  export const updateTestimonial = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const testimonialId = req.params.id;
        const { name, department, message } = req.body;
  
        // Find testimonial by ID
        const testimonial = await testimonialModel.findById(testimonialId);
        if (!testimonial) {
          return next(new ErrorHandler("Testimonial not found.", 404));
        }
  
        // Conditionally update fields
        if (name) testimonial.name = name;
        if (department) testimonial.department = department;
        if (message) testimonial.message = message;
  
        await testimonial.save();
  
        res.status(200).json({
          success: true,
          updated_testimonial: testimonial,
        });
      } catch (error: any) {
        return next(
          new ErrorHandler("Something went wrong. Please try again.", 500)
        );
      }
    }
  );
  
  // Delete a testimonial
  export const deleteTestimonial = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const testimonialId = req.params.id;
  
        // Find and delete testimonial
        const testimonial = await testimonialModel.findByIdAndDelete(testimonialId);
        if (!testimonial) {
          return next(new ErrorHandler("Testimonial not found.", 404));
        }
  
        res.status(200).json({
          success: true,
          message: "Testimonial deleted successfully.",
        });
      } catch (error: any) {
        return next(
          new ErrorHandler("Something went wrong. Please try again.", 500)
        );
      }
    }
  );
  

  // Get all testimonials
export const getTestimonials = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const testimonials = await testimonialModel.find(); // Fetch all testimonials
  
        res.status(200).json({
          success: true,
          testimonials,
        });
      } catch (error: any) {
        return next(
          new ErrorHandler("Something went wrong. Please try again.", 500)
        );
      }
    }
  );
  
  // Get a single testimonial by ID
  export const getTestimonialById = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const testimonialId = req.params.id;
        const testimonial = await testimonialModel.findById(testimonialId);
  
        if (!testimonial) {
          return next(new ErrorHandler("Testimonial not found.", 404));
        }
  
        res.status(200).json({
          success: true,
          testimonial,
        });
      } catch (error: any) {
        return next(
          new ErrorHandler("Something went wrong. Please try again.", 500)
        );
      }
    }
  );
  