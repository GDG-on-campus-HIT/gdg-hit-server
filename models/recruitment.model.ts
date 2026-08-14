import mongoose, { Document, Model, Schema } from "mongoose";

// Step 1: General Information Interface
interface IGeneralInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  rollNumber: string;
  branch: string;
  branchYear: string;
  positions: string[];
}

// Step 3: Role-Specific Interfaces
interface IWebDeveloper {
  technologies?: string;
  projects?: string;
  learning?: string;
  featureSuggestion?: string;
}

interface IAppDeveloper {
  technologies?: string;
  projects?: string;
  learning?: string;
  featureSuggestion?: string;
}

interface IMachineLearing {
  technologies?: string;
  projects?: string;
  learning?: string;
}

interface ITechMember {
  technologies?: string;
  learning?: string;
}

interface IPublicRelations {
  mockPost?: string;
  experience?: string;
  preferredPlatforms?: string;
}

interface IVideoEditor {
  tools?: string;
  videoLink?: string;
  motionGraphics?: string;
}

interface IContentWriter {
  hasWrittenBefore?: string;
}

interface IGraphicsDesigner {
  designTools?: string;
  portfolioLink?: string;
  socialMediaDesign?: string;
  eventPosterConcept?: string;
}

interface IPhotographer {
  photographyType?: string;
  eventExperience?: string;
  photographyPortfolio?: string;
  cameraModel?: string;
}

// Step 4: Final Information Interface
interface IFinalInfo {
  linkedIn?: string;
  portfolio?: string;
  previousClubs?: string;
}

export type RecruitmentStatus = "pending" | "shortlisted" | "rejected" | "accepted";

export interface IDomainStatus {
  domain: string;
  status: RecruitmentStatus;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt?: Date;
  remarks?: string;
}

// Main Recruitment Interface
export interface IRecruitment extends Document {
  user: mongoose.Schema.Types.ObjectId;
  formId?: mongoose.Schema.Types.ObjectId; // Link to the specific form definition
  // Step 1
  generalInfo: IGeneralInfo;
  // Step 3
  // Step 3
  roleSpecific: Record<string, any>; // Flexible structure to support dynamic forms
  // Step 4
  finalInfo: IFinalInfo;
  // WhatsApp Group Links for selected domains
  whatsappGroupLinks?: Record<string, string>; // Maps domain/position to WhatsApp group link
  // Additional fields
  status: RecruitmentStatus;
  domainStatuses: IDomainStatus[];
  createdAt: Date;
  updatedAt: Date;
}

const recruitmentSchema = new Schema<IRecruitment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    formId: {
      type: Schema.Types.ObjectId,
      ref: "RecruitmentForm"
    },
    // Step 1: General Information
    generalInfo: {
      fullName: {
        type: String,
        required: [true, "Please enter your full name"],
      },
      email: {
        type: String,
        required: [true, "Please enter your email"],
        unique: true,
      },
      phoneNumber: {
        type: String,
        required: [true, "Please enter your phone number"],
      },
      rollNumber: {
        type: String,
        required: [true, "Please enter your roll number"],
      },
      branch: {
        type: String,
        required: [true, "Please select your branch"],
      },
      branchYear: {
        type: String,
        required: [true, "Please select your year"],
      },
      positions: {
        type: [String],
        required: [true, "Please select the position(s) you are applying for"],
      },
    },
    // Step 3: Role-Specific Information (Flexible/Dynamic)
    roleSpecific: {
      type: Schema.Types.Mixed,
      default: {}
    },

    // Step 4: Final Information
    finalInfo: {
      linkedIn: String,
      previousClubs: String,
    },

    // WhatsApp Group Links for selected domains/positions
    whatsappGroupLinks: {
      type: Schema.Types.Mixed,
      default: {}
    },

    // Additional fields
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "accepted"],
      default: "pending",
    },
    domainStatuses: [
      {
        domain: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "shortlisted", "rejected", "accepted"],
          default: "pending",
        },
        updatedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        remarks: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const RecruitmentModel: Model<IRecruitment> = mongoose.model(
  "Recruitment",
  recruitmentSchema
);
