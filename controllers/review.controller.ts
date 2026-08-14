import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import reviewModel from "../models/review.model";
import { eventModel } from "../models/events.model";

// Add Review
export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId, rating, comment } = req.body;
      const user = req.user as any;

      if (!user) {
        return next(new ErrorHandler("Please login to access this resource.", 401));
      }

      if (!eventId || !comment) {
        return next(new ErrorHandler("Please provide event ID and comment.", 400));
      }

      const event = await eventModel.findById(eventId);
      if (!event) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Check if user already reviewed this event
      const existingReview = await reviewModel.findOne({ event: eventId, user: user._id });
      if (existingReview) {
        return next(new ErrorHandler("You have already reviewed this event.", 400));
      }

      const review = await reviewModel.create({
        event: eventId,
        user: user._id,
        rating: rating || 0,
        comment,
      });

      res.status(201).json({
        success: true,
        review,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get Reviews by Event
export const getReviewsByEvent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      const reviews = await reviewModel
        .find({ event: eventId })
        .populate("user", "name email role")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Update Review
export const updateReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;
      const user = req.user as any;

      if (!user) {
        return next(new ErrorHandler("Please login to access this resource.", 401));
      }

      const review = await reviewModel.findById(reviewId);
      if (!review) {
        return next(new ErrorHandler("Review not found.", 404));
      }

      // Only the author can update their review
      if (review.user.toString() !== user._id.toString()) {
        return next(new ErrorHandler("You are not authorized to update this review.", 403));
      }

      if (rating !== undefined) review.rating = rating;
      if (comment) review.comment = comment;

      await review.save();

      res.status(200).json({
        success: true,
        review,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Delete Review (Owner or Admin)
export const deleteReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const user = req.user as any;

      if (!user) {
        return next(new ErrorHandler("Please login to access this resource.", 401));
      }

      const review = await reviewModel.findById(reviewId);
      if (!review) {
        return next(new ErrorHandler("Review not found.", 404));
      }

      // Owner or Admin/Superadmin can delete
      const isAdmin = ["admin", "super_admin"].includes(user.role || "");
      const isOwner = review.user.toString() === user._id.toString();

      if (!isAdmin && !isOwner) {
        return next(new ErrorHandler("You are not authorized to delete this review.", 403));
      }

      await reviewModel.findByIdAndDelete(reviewId);

      res.status(200).json({
        success: true,
        message: "Review deleted successfully.",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get All Reviews (Admin only)
export const getAllReviews = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviews = await reviewModel
        .find()
        .populate("user", "name email")
        .populate("event", "name")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
