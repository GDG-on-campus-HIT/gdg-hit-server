import express from "express";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import {
  addReview,
  deleteReview,
  getAllReviews,
  getReviewsByEvent,
  updateReview,
} from "../controllers/review.controller";

const reviewRouter = express.Router();

reviewRouter.post("/add-review", isAuthenticate, addReview);

reviewRouter.get("/get-reviews/:eventId", getReviewsByEvent);

reviewRouter.put("/update-review/:reviewId", isAuthenticate, updateReview);

reviewRouter.delete("/delete-review/:reviewId", isAuthenticate, deleteReview);

reviewRouter.get(
  "/get-all-reviews",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllReviews
);

export default reviewRouter;
