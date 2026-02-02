import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { membersModel } from "../models/members.model";
import cloudinary from "../utlis/cloudinary";

// Get single member by ID (Public route)
export const getMemberById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.id;

      const member = await membersModel.findOne({
        _id: memberId,
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });

      if (!member) {
        return next(new ErrorHandler("Member not found", 404));
      }

      res.status(200).json({
        success: true,
        member,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

// Get single member by ID (Admin only - includes inactive)
export const getMemberByIdAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.id;

      const member = await membersModel.findById(memberId);

      if (!member) {
        return next(new ErrorHandler("Member not found", 404));
      }

      res.status(200).json({
        success: true,
        member,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

export const getMembers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Include members where isActive is true OR undefined (for existing members)
      const members = await membersModel.find({
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });

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
        "Video Editor",
        "Graphic Designer",
        "Content Writer",
        "Photographer",
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
          webDeveloper: members.filter((member) =>
            ["Web Development Lead", "Web Developer"].includes(member.designation)
          ),
          appDeveloper: members.filter((member) =>
            ["App Development Lead", "App Developer"].includes(member.designation)
          ),
          machineLearning: members.filter((member) =>
            ["Machine Learning Lead", "Machine Learning"].includes(member.designation)
          ),
          techMember: members.filter((member) => member.designation === "Technical Member"),
        },
        mediaTeam: {
          videoEditor: members.filter((member) =>
            ["Video Editor Lead", "Video Editor"].includes(member.designation)
          ),
          graphicDesigner: members.filter((member) =>
            ["Graphic Designer Lead", "Graphic Designer"].includes(member.designation)
          ),
          contentWriter: members.filter((member) =>
            ["Content Writer Lead", "Content Writer"].includes(member.designation)
          ),
          photographer: members.filter((member) => member.designation === "Photographer"),
        },
        prTeam: members.filter((member) =>
          ["PR and Mangement Lead", "PR"].includes(member.designation)
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
      const myCloud = await cloudinary.uploader.upload(profile_image, {
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
        isActive: true,
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
        try {
          // Delete the old image from Cloudinary
          if (member.profile_image?.public_id) {
            await cloudinary.uploader.destroy(member.profile_image.public_id);
          }

          // Upload the new image
          const myCloud = await cloudinary.uploader.upload(profile_image, {
            folder: "members",
          });

          member.profile_image = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } catch (imageError: any) {
          console.error("Image upload error:", imageError);
          return next(new ErrorHandler("Failed to upload profile image: " + imageError.message, 400));
        }
      }

      // Update fields if provided
      if (name !== undefined) member.name = name;
      if (department !== undefined) member.department = department;
      if (designation !== undefined) member.designation = designation;
      if (email_id !== undefined) member.email_id = email_id;
      if (batch !== undefined) member.batch = batch;
      if (bio !== undefined) member.bio = bio;
      if (github_url !== undefined) member.github_url = github_url;
      if (linkedin_url !== undefined) member.linkedin_url = linkedin_url;

      // Save the updated member
      await member.save();

      // Send the response
      res.status(200).json({
        success: true,
        updated_member: member,
      });
    } catch (error: any) {
      console.error("Update member error:", error);
      return next(new ErrorHandler(error.message || "Failed to update member", 500));
    }
  }
);

// Soft delete - Toggle member active status (Admin only)
export const toggleMemberStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.id;

      // Validate member existence
      const member = await membersModel.findById(memberId);
      if (!member) {
        return next(new ErrorHandler("Member not found.", 404));
      }

      // Toggle the isActive status
      member.isActive = !member.isActive;
      await member.save();

      // Send the response
      res.status(200).json({
        success: true,
        message: `Member ${member.isActive ? 'activated' : 'deactivated'} successfully.`,
        member: {
          _id: member._id,
          name: member.name,
          isActive: member.isActive,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get all members including inactive (Admin only)
export const getAllMembersAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await membersModel.find({});

      res.status(200).json({
        success: true,
        totalMembers: members.length,
        activeMembers: members.filter(m => m.isActive).length,
        inactiveMembers: members.filter(m => !m.isActive).length,
        members,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Hard delete member (Admin only) - Use with caution
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
        await cloudinary.uploader.destroy(member.profile_image.public_id);
      }

      // Delete the member from the database
      await membersModel.findByIdAndDelete(memberId);

      // Send the response
      res.status(200).json({
        success: true,
        message: "Member deleted permanently.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
