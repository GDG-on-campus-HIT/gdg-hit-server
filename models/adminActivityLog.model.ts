import mongoose, { Document, Model, Schema } from "mongoose";

// Admin Activity Log Interface
export interface IAdminActivityLog extends Document {
  admin: mongoose.Schema.Types.ObjectId; // Reference to admin user
  action: "shortlist" | "reject" | "accept" | "add_admin" | "remove_admin" | "update_status" | "other";
  candidateId?: mongoose.Schema.Types.ObjectId; // Reference to candidate (for recruitment actions)
  candidateName?: string;
  candidateEmail?: string;
  domain?: string; // Domain/position for shortlisting/rejection
  oldStatus?: string;
  newStatus?: string;
  targetAdminId?: mongoose.Schema.Types.ObjectId; // Reference to admin being added/removed
  targetAdminEmail?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const adminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin ID is required"],
    },
    action: {
      type: String,
      enum: ["shortlist", "reject", "accept", "add_admin", "remove_admin", "update_status", "other"],
      required: [true, "Action type is required"],
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Recruitment",
    },
    candidateName: String,
    candidateEmail: String,
    domain: String, // Position/domain being evaluated
    oldStatus: String,
    newStatus: String,
    targetAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    targetAdminEmail: String,
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create index for faster queries
adminActivityLogSchema.index({ admin: 1, timestamp: -1 });
adminActivityLogSchema.index({ action: 1 });
adminActivityLogSchema.index({ candidateId: 1 });

export const AdminActivityLogModel: Model<IAdminActivityLog> = mongoose.model(
  "AdminActivityLog",
  adminActivityLogSchema
);
