import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { membersModel } from "../models/members.model";
import cloudinary from "cloudinary";

export const getMembers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await membersModel.find();

      // Custom sorting order for designations
      const designationOrder = [
        "Organizer",
        "PR and Mangement Lead",
        "Web Development Lead",
        "App Development Lead",
        "Machine Learning Lead",
        "Content Writer Lead",
        "Video Editor Lead",
        "Graphic Designer Lead",
        "Technical Member",
        "Web Developer",
        "App Developer",
        "Machine Learning",
        "PR",
        "Photographer",
        "Graphic Designer",
        "Content Writer",
        "Video Editor",
      ];

      // Sorting function
      members.sort((a, b) => {
        // Sort by batch (ascending order)
        const batchComparison = parseInt(a.batch) - parseInt(b.batch);
        if (batchComparison !== 0) return batchComparison;

        // Sort by designation within the same batch
        return (
          designationOrder.indexOf(a.designation) -
          designationOrder.indexOf(b.designation)
        );
      });

      // Categorize members into Core Team, Media Team, PR Team, and Tech Team
      const categorizedMembers = {
        coreTeam: members.filter((member) =>
          [
            "Organizer",
            "PR and Mangement Lead",
            "Web Development Lead",
            "App Development Lead",
            "Machine Learning Lead",
            "Content Writer Lead",
            "Video Editor Lead",
            "Graphic Designer Lead",
          ].includes(member.designation)
        ),
        techTeam: {
          webDeveloper: members.filter(
            (member) =>
              member.designation === ("Web Development Lead" || "Web Developer")
          ),
          appDeveloper: members.filter(
            (member) =>
              member.designation === ("App Development Lead" || "App Developer")
          ),
          machineLearning: members.filter(
            (member) =>
              member.designation ===
              ("Machine Learning Lead" || "Machine Learning")
          ),
          techMember: members.filter(
            (member) => member.designation === "Technical Member"
          ),
        },
        mediaTeam: {
          graphicDesigner: members.filter(
            (member) =>
              member.designation ===
              ("Graphic Designer Lead" || "Graphic Designer")
          ),
          contentWriter: members.filter(
            (member) =>
              member.designation === ("Content Writer Lead" || "Content Writer")
          ),
          videoEditor: members.filter(
            (member) =>
              member.designation === ("Video Editor Lead" || "Video Editor")
          ),
          photographer: members.filter(
            (member) => member.designation === "Photographer"
          ),
        },
        prTeam: members.filter(
          (member) => member.designation === ("PR and Mangement Lead" || "PR")
        ),
      };

      res.status(200).json({
        success: true,
        members: categorizedMembers,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

interface IMembers {
  name: string;
  profile_image: string; // Input: base64 or URL
  department: string;
  designation: string;
  email_id: string;
  batch: string;
  bio: string;
  github_url: string;
  linkedin_url: string;
}

export const addMember = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // console.log(req.user?._id);
    try {
      const {
        name,
        profile_image, // This should be a string (base64 or URL)
        department,
        designation,
        email_id,
        batch,
        bio,
        github_url,
        linkedin_url,
      } = req.body as IMembers;

      // Required fields validation
      const requiredFields = {
        name: "Please provide a name.",
        department: "Please specify the department.",
        designation: "Please specify the designation.",
        email_id: "Please provide email id.",
        batch: "Please provide the batch.",
        bio: "Please add a bio.",
        github_url: "Please provide a GitHub URL.",
        linkedin_url: "Please provide a LinkedIn URL.",
        profile_image: "Please upload a profile image.",
      };

      for (const [key, message] of Object.entries(requiredFields)) {
        if (!req.body[key]) {
          return next(new ErrorHandler(message, 400));
        }
      }

      // Upload profile image to Cloudinary
      const myCloud = await cloudinary.v2.uploader.upload(profile_image, {
        folder: "members",
      });

      // Create member
      const newMember = await membersModel.create({
        name,
        department,
        designation,
        batch,
        email_id,
        bio,
        github_url,
        linkedin_url,
        profile_image: {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        },
      });

      // Send response
      res.status(201).json({
        success: true,
        new_member: newMember,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateMember = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.id;
      const {
        name,
        profile_image, // This should be a string (base64 or URL)
        department,
        designation,
        email_id,
        batch,
        bio,
        github_url,
        linkedin_url,
      } = req.body as Partial<IMembers>;

      // Validate member existence
      const member = await membersModel.findById(memberId);
      if (!member) {
        return next(new ErrorHandler("Member not found.", 404));
      }

      // Handle profile image update
      if (profile_image) {
        // Delete the old image from Cloudinary
        if (member.profile_image?.public_id) {
          await cloudinary.v2.uploader.destroy(member.profile_image.public_id);
        }

        // Upload the new image
        const myCloud = await cloudinary.v2.uploader.upload(profile_image, {
          folder: "avatars",
        });

        member.profile_image = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      // Update fields if provided
      const fieldsToUpdate = {
        name,
        department,
        designation,
        email_id,
        batch,
        bio,
        github_url,
        linkedin_url,
      };

      Object.assign(member, fieldsToUpdate);

      // Save the updated member
      await member.save();

      // Send the response
      res.status(200).json({
        success: true,
        updated_member: member,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteMember = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.id;

      // Validate member existence
      const member = await membersModel.findById(memberId);
      if (!member) {
        return next(new ErrorHandler("Member not found.", 404));
      }

      // Delete the profile image from Cloudinary
      if (member.profile_image?.public_id) {
        await cloudinary.v2.uploader.destroy(member.profile_image.public_id);
      }

      // Delete the member from the database
      await membersModel.findByIdAndDelete(memberId);

      // Send the response
      res.status(200).json({
        success: true,
        message: "Member deleted successfully.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
