import { CatchAsyncError } from "../middleware/CatchAsyncError";
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utlis/ErrorHandler";
import membersIdCardModel from "../models/membersIdCard.model";
import { membersModel } from "../models/members.model";

// Get member ID card by member ID (Public route)
export const getMemberIdCard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;

      const idCard = await membersIdCardModel
        .findOne({ memberId })
        .populate("memberId", "name email_id department designation profile_image");

      if (!idCard) {
        return next(new ErrorHandler("ID card not found for this member", 404));
      }

      res.status(200).json({
        success: true,
        idCard,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));    
    }
  }
);

// Get all member ID cards (Public route)
export const getAllMemberIdCards = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idCards = await membersIdCardModel
        .find({ isActive: true })
        .populate("memberId", "name email_id department designation profile_image")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: idCards.length,
        idCards,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Auto-generate card number helper function
const generateCardNumber = async (rollNo: string): Promise<string> => {
  // Extract first 2 digits from roll number (e.g., "22/CSE-DS/021" -> "22")
  const yearPrefix = rollNo.substring(0, 2);
  
  // Find the highest serial number for this year prefix
  const lastCard = await membersIdCardModel
    .findOne({ 
      cardNumber: { $regex: `^GDG${yearPrefix}` } 
    })
    .sort({ cardNumber: -1 });

  let serialNumber = 1;
  if (lastCard) {
    // Extract serial number from last card (e.g., "GDG2205" -> 5)
    const lastSerial = parseInt(lastCard.cardNumber.substring(5));
    serialNumber = lastSerial + 1;
  }

  return `GDG${yearPrefix}${serialNumber.toString().padStart(3, '0')}`;
};

// Create member ID card (Admin only)
export const createMemberIdCard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        memberId, 
        cardNumber, // Optional - if provided, use it; otherwise auto-generate
        memberName,
        designation,
        rollNo,
        phoneNumber,
        profileImage,
        qrCode,
        expiryDate,
        authoritySignature
      } = req.body;

      // Check if member exists
      const member = await membersModel.findById(memberId);
      if (!member) {
        return next(new ErrorHandler("Member not found", 404));
      }

      // Check if ID card already exists for this member
      const existingCard = await membersIdCardModel.findOne({ memberId });
      if (existingCard) {
        return next(new ErrorHandler("ID card already exists for this member", 400));
      }

      // Generate or validate card number
      let finalCardNumber = cardNumber;
      if (!cardNumber) {
        // Auto-generate card number if not provided
        if (!rollNo) {
          return next(new ErrorHandler("Roll number is required for card number generation", 400));
        }
        finalCardNumber = await generateCardNumber(rollNo);
      } else {
        // Check if provided card number is unique
        const existingCardNumber = await membersIdCardModel.findOne({ cardNumber });
        if (existingCardNumber) {
          return next(new ErrorHandler("Card number already exists", 400));
        }
      }

      const idCard = await membersIdCardModel.create({
        memberId,
        cardNumber: finalCardNumber,
        memberName: memberName || member.name,
        designation: designation || member.designation,
        rollNo,
        phoneNumber,
        profileImage,
        qrCode,
        expiryDate,
        authoritySignature,
      });

      const populatedCard = await membersIdCardModel
        .findById(idCard._id)
        .populate("memberId", "name email_id department designation profile_image");

      res.status(201).json({
        success: true,
        message: "Member ID card created successfully",
        idCard: populatedCard,
        generatedCardNumber: finalCardNumber,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Update member ID card (Admin only)
export const updateMemberIdCard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // If cardNumber is being updated, check if it's unique
      if (updateData.cardNumber) {
        const existingCardNumber = await membersIdCardModel.findOne({
          cardNumber: updateData.cardNumber,
          _id: { $ne: id },
        });
        if (existingCardNumber) {
          return next(new ErrorHandler("Card number already exists", 400));
        }
      }

      // If rollNo is being updated and no cardNumber provided, regenerate card number
      if (updateData.rollNo && !updateData.cardNumber) {
        const newCardNumber = await generateCardNumber(updateData.rollNo);
        updateData.cardNumber = newCardNumber;
      }

      const idCard = await membersIdCardModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate("memberId", "name email_id department designation profile_image");

      if (!idCard) {
        return next(new ErrorHandler("ID card not found", 404));
      }

      res.status(200).json({
        success: true,
        message: "Member ID card updated successfully",
        idCard,
        updatedCardNumber: idCard.cardNumber,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Delete member ID card (Admin only)
export const deleteMemberIdCard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const idCard = await membersIdCardModel.findByIdAndDelete(id);

      if (!idCard) {
        return next(new ErrorHandler("ID card not found", 404));
      }

      res.status(200).json({
        success: true,
        message: "Member ID card deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Toggle ID card status (Admin only)
export const toggleIdCardStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const idCard = await membersIdCardModel.findById(id);

      if (!idCard) {
        return next(new ErrorHandler("ID card not found", 404));
      }

      idCard.isActive = !idCard.isActive;
      await idCard.save();

      const populatedCard = await membersIdCardModel
        .findById(idCard._id)
        .populate("memberId", "name email_id department designation profile_image");

      res.status(200).json({
        success: true,
        message: `ID card ${idCard.isActive ? "activated" : "deactivated"} successfully`,
        idCard: populatedCard,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
