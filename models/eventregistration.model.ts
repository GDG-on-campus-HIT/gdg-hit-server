import mongoose, { Schema, Document } from 'mongoose';


// Interface for Skill Knowledge
interface ISkillKnowledge {
  skill: string; // e.g., HTML, Python, Django
  proficiency: string[]; // Basic, Intermediate, Advanced
}

// Interface for PriorKnowledge document
interface IPriorKnowledge extends Document {
  event: mongoose.Types.ObjectId;
  skills: ISkillKnowledge[];
  createdAt: Date;
  updatedAt: Date;
}

// PriorKnowledge Schema
const PriorKnowledgeSchema: Schema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    skills: [
      {
        skill: {
          type: String,
          required: true,
          trim: true,
        },
        proficiency: [
          {
            type: String,
            required: true,
          },
        ],
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);






// Interface for Participant document
interface IParticipant extends Document {
  user: mongoose.Types.ObjectId | null;
  event: mongoose.Types.ObjectId;
  name: string;
  walkIn: boolean;
  classRollNo: string;
  department: string;
  phoneNumber: string;
  email: string;
  attendance: boolean;
  position?: number | null;
  checkedInAt?: Date | null;
  sessionCheckIns: Array<{ session: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

// Participant Schema
const ParticipantSchema: Schema = new Schema(
  {
    // Null for walk-ins without an account; linked by email once they sign in
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Added at the venue by a member instead of registering online
    walkIn: {
      type: Boolean,
      default: false,
    },
    classRollNo: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    attendance: {
      type: Boolean,
      default: false,
    },
    // Competition placement (1st/2nd/3rd); null for regular participants
    position: {
      type: Number,
      min: 1,
      max: 3,
      default: null,
    },
    // Set when a member scans the participant's check-in pass at the venue
    checkedInAt: {
      type: Date,
      default: null,
    },
    // One entry per attendance session (Event.attendanceSessions) the participant was scanned into
    sessionCheckIns: {
      type: [{ _id: false, session: { type: String, required: true }, at: { type: Date, required: true } }],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

ParticipantSchema.index({ event: 1 });
ParticipantSchema.index({ email: 1 });


// Create and export the PriorKnowledge model
export const PriorKnowledge = mongoose.model<IPriorKnowledge>('PriorKnowledge', PriorKnowledgeSchema);

// Create and export the Participant model
export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema);