import mongoose, { Document, Model, Schema } from "mongoose";

// Step 1: General Information Interface
interface IGeneralInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  rollNumber: number;
  branch: string;
  branchYear: string;
  positions: string[];
}

// Step 2: GDG Perspective Interface
interface IGDGPerspective {
  gdgPerspective: string;
  eventIdeas: string;
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

interface IPublicRelations {
  mockPost?: string;
  experience?: string;
  preferredPlatforms?: string;
}

interface IVideoEditor {
  tools?: string;
  videoLink?: string;
  motionGraphics?: boolean;
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
  timeCommitment: string;
  reasonToJoin: string;
}

// Main Recruitment Interface
export interface IRecruitment extends Document {
  // Step 1
  generalInfo: IGeneralInfo;
  // Step 2
  gdgPerspective: IGDGPerspective;
  // Step 3
  roleSpecific: {
    webDeveloper?: IWebDeveloper;
    appDeveloper?: IAppDeveloper;
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
        type: Number,
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

    // Step 2: GDG Perspective
    gdgPerspective: {
      gdgPerspective: {
        type: String,
        required: [true, "This field is required"],
      },
      eventIdeas: {
        type: String,
        required: [true, "This field is required"],
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
      publicRelations: {
        mockPost: {
          type: String,
          maxLength: 150,
        },
        experience: String,
        preferredPlatforms: String,
      },
      videoEditor: {
        tools: String,
        videoLink: String,
        motionGraphics: Boolean,
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
      portfolio: String,
      previousClubs: String,
      timeCommitment: {
        type: String,
        required: [true, "Please specify your weekly commitment"],
      },
      reasonToJoin: {
        type: String,
        required: [true, "Please provide a reason for joining GDG HIT"],
        maxLength: 200,
      },
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