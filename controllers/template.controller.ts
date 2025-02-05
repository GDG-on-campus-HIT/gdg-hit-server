import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import cloudinary from "cloudinary";
import { templateModel } from "../models/template.model"; 

// Add a new template
export const addTemplate = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, certificateSettings, backgroundImage } = req.body;
  
        // Ensure required fields are provided
        if (!name || !certificateSettings) {
          return next(new ErrorHandler("All fields are required.", 400));
        }
  
        let backgroundImageData = { url: "", public_id: "" };
  
        // Check if background image is provided
        if (backgroundImage) {
          // Upload background image to Cloudinary
          const uploadedImage = await cloudinary.v2.uploader.upload(
            backgroundImage, // base64 image string
            {
              folder: "certificate_backgrounds",
              resource_type: "image",
            }
          );
          backgroundImageData = {
            public_id: uploadedImage.public_id,
            url: uploadedImage.secure_url,
          };
        }
  
        // Create a new template
        const newTemplate = await templateModel.create({
          name,
          certificateSettings: {
            ...certificateSettings,
            backgroundImage: backgroundImageData,
          },
        });
  
        res.status(201).json({
          success: true,
          template: newTemplate,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message || "Failed to add template.", 500));
      }
    }
  );

// Update Template
export const updateTemplate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templateId = req.params.id;
      const { name, certificateSettings } = req.body;

      const existingTemplate = await templateModel.findById(templateId);

      if (!existingTemplate) {
        return next(new ErrorHandler("Template not found.", 404));
      }

      // Update name, or certificateSettings if provided
      if (name) existingTemplate.name = name;
      if (certificateSettings) existingTemplate.certificateSettings = certificateSettings;

      await existingTemplate.save();

      res.status(200).json({
        success: true,
        updatedTemplate: existingTemplate,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message || "Failed to update template.", 500));
    }
  }
);

// Get Template by ID
export const getTemplateById = CatchAsyncError(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const templateId = req.params.id;

      const template = await templateModel
        .findById(templateId)

      if (!template) {
        return next(new ErrorHandler("Template not found.", 404));
      }

      res.status(200).json({
        success: true,
        template,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message || "Failed to fetch template.", 500));
    }
  }
);

// Delete Template by ID
export const deleteTemplateById = CatchAsyncError(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const templateId = req.params.id;

      const template = await templateModel.findById(templateId);
      if (!template) {
        return next(new ErrorHandler("Template not found.", 404));
      }

      await templateModel.findByIdAndDelete(templateId);

      res.status(200).json({
        success: true,
        message: "Template deleted successfully.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message || "Failed to delete template.", 500));
    }
  }
);

// Get All Templates
export const getAllTemplates = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await templateModel
        .find()

      res.status(200).json({
        success: true,
        templates,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message || "Failed to fetch templates.", 500));
    }
  }
);
