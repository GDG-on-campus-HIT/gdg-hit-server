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

// Main Recruitment Interface
export interface IRecruitment extends Document {
  user: mongoose.Schema.Types.ObjectId;
  // Step 1
  generalInfo: IGeneralInfo;
  // Step 3
  roleSpecific: {
    webDeveloper?: IWebDeveloper;
    appDeveloper?: IAppDeveloper;
    machineLearning?: IMachineLearing;
    techMember?: ITechMember;
    publicRelations?: IPublicRelations;
    videoEditor?: IVideoEditor;
    contentWriter?: IContentWriter;
    graphicsDesigner?: IGraphicsDesigner;
    photographer?: IPhotographer;
  };
  // Step 4
  finalInfo: IFinalInfo;
  // Additional fields
  status: "pending" | "shortlisted" | "rejected" | "accepted";
  createdAt: Date;
  updatedAt: Date;
}

const recruitmentSchema = new Schema<IRecruitment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    // Step 3: Role-Specific Information
    roleSpecific: {
      webDeveloper: {
        technologies: String,
        projects: String,
        learning: String,
        featureSuggestion: String,
      },
      appDeveloper: {
        technologies: String,
        projects: String,
        learning: String,
        featureSuggestion: String,
      },
      machineLearning: {
        technologies: String,
        projects: String,
        learning: String,
      },
      techMember: {
        technologies: String,
        learning: String,
      },
      publicRelations: {
        mockPost: String,
        experience: String,
        preferredPlatforms: String,
      },
      videoEditor: {
        tools: String,
        videoLink: String,
        motionGraphics: String,
      },
      contentWriter: {
        hasWrittenBefore: String,
      },
      graphicsDesigner: {
        designTools: String,
        portfolioLink: String,
        socialMediaDesign: String,
        eventPosterConcept: String,
      },
      photographer: {
        photographyType: String,
        eventExperience: String,
        photographyPortfolio: String,
        cameraModel: String,
      },
    },

    // Step 4: Final Information
    finalInfo: {
      linkedIn: String,
      previousClubs: String,
    },

    // Additional fields
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const RecruitmentModel: Model<IRecruitment> = mongoose.model(
  "Recruitment",
  recruitmentSchema
);
