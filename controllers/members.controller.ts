import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { membersModel } from "../models/members.model";
import cloudinary from "cloudinary";
import { redis } from "../utlis/redis";

// get members list
export const getMembers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await membersModel.find();

      // Custom sorting order for leaders
      const leaderOrder = [
        'President',
        'Vice-President',
        'Secretary',
        'Treasurer',
        'Technical Head',
        'Event Head',
        'Media Head'
      ];

      // Custom sorting order for other designations within batches
      const designationOrder = [
        'Technical member',
        'PR',
        'Photographer',
        'Graphic Designer',
        'Content Writer',
        'Video Editor'
      ];

      // Sorting function
      members.sort((a:any, b:any) => {
        // Sort leaders based on the leaderOrder array
        if (a.isLeader && b.isLeader) {
          return leaderOrder.indexOf(a.designation) - leaderOrder.indexOf(b.designation);
        }
        if (a.isLeader && !b.isLeader) return -1;
        if (!a.isLeader && b.isLeader) return 1;

        // Sort by batch order (2021-25, 2022-26, 2023-27)
        const batchOrder = ['2021-25', '2022-26', '2023-27'];
        const batchComparison = batchOrder.indexOf(a.batch) - batchOrder.indexOf(b.batch);
        if (batchComparison !== 0) return batchComparison;

        // Sort by designation within the same batch
        return designationOrder.indexOf(a.designation) - designationOrder.indexOf(b.designation);
      });

      res.status(200).json({
        success: true,
        members,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || 'An error occurred', 400));
    }
  }
);

interface IMembers {
  name: string;
  profile_image: any;
  department: string;
  designation: string;
  email_id: string;
  batch: string;
  bio: string;
  github_url: string;
  linkedin_url: string;
  leader: boolean;
}

export const addMember = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          name,
          profile_image,
          department,
          designation,
          email_id,
          batch,
          bio,
          github_url,
          linkedin_url,
          leader,
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
          leader: "Please indicate whether the person is a leader.",
          profile_image: "Please upload a profile image.",
        };
  
        for (const [key, message] of Object.entries(requiredFields)) {
          if (!req.body[key]) {
            return next(new ErrorHandler(message, 400));
          }
        }
  
        // Upload profile image
        const myCloud = await cloudinary.v2.uploader.upload(profile_image, {
          folder: "avatars",
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
          leader,
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
          profile_image,
          department,
          designation,
          email_id,
          batch,
          bio,
          github_url,
          linkedin_url,
          leader,
        } = req.body as Partial<IMembers>; // Use Partial to allow optional fields
  
        // Validate member existence
        const member = await membersModel.findById(memberId);
        if (!member) {
          return next(new ErrorHandler("Member not found.", 404));
        }
  
        // Handle profile image update
        if (profile_image) {
          // Delete the old image from Cloudinary first
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
  
        // Conditionally update other fields
        if (name) member.name = name;
        if (department) member.department = department;
        if (designation) member.designation = designation;
        if (email_id) member.email_id = email_id;
        if (batch) member.batch = batch;
        if (bio) member.bio = bio;
        if (github_url) member.github_url = github_url;
        if (linkedin_url) member.linkedin_url = linkedin_url;
        if (typeof leader !== 'undefined') member.leader = leader;
  
        // Save the updated member
        await member.save();
  
        // Send the response
        res.status(200).json({
          success: true,
          updated_member: member,
        });
      } catch (error: any) {
        // Generic error handling
        return next(new ErrorHandler("Something went wrong. Please try again.", 500));
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
  
        // Delete the profile image from Cloudinary if it exists
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
        // Generic error handling
        return next(new ErrorHandler("Something went wrong. Please try again.", 500));
      }
    }
  );
  