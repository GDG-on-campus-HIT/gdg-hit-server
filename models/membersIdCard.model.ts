require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface IMembersIdCard extends Document {
  memberId: mongoose.Types.ObjectId;
  cardNumber: string;
  issuedDate: Date;
  expiryDate: Date;
  isActive: boolean;
  qrCode: {
    public_id: string;
    url: string;
  };
  cardImage: {
    public_id: string;
    url: string;
  };
  additionalInfo?: string;
}

const membersIdCardSchema = new Schema<IMembersIdCard>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Members",
      required: true,
      unique: true, // One ID card per member
    },
    cardNumber: {
      type: String,
      required: true,
      unique: true,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    qrCode: {
      public_id: String,
      url: String,
    },
    cardImage: {
      public_id: String,
      url: String,
    },
    additionalInfo: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for better query performance
membersIdCardSchema.index({ memberId: 1 });
membersIdCardSchema.index({ cardNumber: 1 });

const membersIdCardModel: Model<IMembersIdCard> = mongoose.model("MembersIdCard", membersIdCardSchema);

export default membersIdCardModel;
export { IMembersIdCard };
