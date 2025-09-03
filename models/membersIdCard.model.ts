require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface IMembersIdCard extends Document {
  memberId: mongoose.Types.ObjectId;
  cardNumber: string; // GDG2202
  memberName: string; // DEEPAK KUMAR
  designation: string; // WEB DEVELOPMENT LEAD
  rollNo: string; // 22/CSE-DS/021
  phoneNumber: string; // 8092968262
  profileImage: {
    public_id: string;
    url: string;
  };
  qrCode: {
    public_id: string;
    url: string;
  };
  issuedDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  authoritySignature?: {
    name: string; // Prof. Rajib Kumar Dubey
    designation: string; // Dean (Rl)
  };
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
      unique: true, // e.g., GDG2202
    },
    memberName: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true, // e.g., WEB DEVELOPMENT LEAD
    },
    rollNo: {
      type: String,
      required: true, // e.g., 22/CSE-DS/021
    },
    phoneNumber: {
      type: String,
      required: true, // e.g., 8092968262
    },
    profileImage: {
      public_id: String,
      url: String,
    },
    qrCode: {
      public_id: String,
      url: String,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    authoritySignature: {
      name: {
        type: String,
        default: "Prof. Rajib Kumar Dubey",
      },
      designation: {
        type: String,
        default: "Dean,SWC",
      },
    },
  },
  { timestamps: true }
);

// Index for better query performance
membersIdCardSchema.index({ memberId: 1 });
membersIdCardSchema.index({ cardNumber: 1 });
membersIdCardSchema.index({ rollNo: 1 });
membersIdCardSchema.index({ phoneNumber: 1 });

const membersIdCardModel: Model<IMembersIdCard> = mongoose.model("MembersIdCard", membersIdCardSchema);

export default membersIdCardModel;
export { IMembersIdCard };
