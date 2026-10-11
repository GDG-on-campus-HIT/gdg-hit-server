require("dotenv").config();
import mongoose, { Document, Schema, Model, ObjectId } from "mongoose";
import { certificateTemplateSchema, ICertificateTemplate } from "./certificateDesign.schema";

interface IContactInfo {
  name: string;
  mobile: string;
  year: string;
}

interface IEvent extends Document {
  name: string;
  description: string;
  category: string;
  registrationFee: string;
  details: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  eventBanner: {
    public_id: string;
    url: string;
  };
  poster: {
    public_id: string;
    url: string;
  };
  upiID: string;
  paymentQR: {
    public_id: string;
    url: string;
  };
  whatsappLink: string;
  // whatsappLink is stored in a separate model (EventWhatsapp) - Legacy note, now moving to main model
  faq: Array<{ faq_id: ObjectId }>;
  is_upcoming: boolean;
  registrations: Array<{ registration_id: ObjectId }>;
  registration_open: boolean;
  gallery: Array<{
    public_id: string;
    url: string;
  }>;
  contactInfo: Array<{
    name: string;
    mobile: string;
    year: string;
  }>;
  certificateTemplate?: ICertificateTemplate;
}

const eventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
    },
    eventBanner: {
      public_id: String,
      url: String,
    },
    poster: {
      public_id: String,
      url: String,
    },
    paymentQR: {
      public_id: String,
      url: String,
    },
    upiID: {
      type: String,
    },
    whatsappLink: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    registrationFee: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    eventDate: {
      type: String,
      required: true,
    },
    eventTime: {
      type: String,
      required: true,
    },
    is_upcoming: {
      type: Boolean,
      required: true,
    },
    registration_open: {
      type: Boolean,
      required: true,
      default: true,
    },
    registrations: [
      {
        type: Schema.Types.ObjectId,
        ref: "EventRegistration",
      },
    ],
    faq: [
      {
        type: Schema.Types.ObjectId,
        ref: "EventFAQ",
      },
    ],
    gallery: [
      {
        public_id: { type: String },
        url: { type: String },
      },
    ],
    contactInfo: [
      {
        name: { type: String, required: true },
        mobile: { type: String, required: true },
        year: { type: String, required: true },
      },
    ],
    // Only loaded where needed (.select("+certificateTemplate")) to keep public event payloads small
    certificateTemplate: { type: certificateTemplateSchema, select: false },
  },
  { timestamps: true }
);

interface IEventRegistration extends Document {
  event: ObjectId;
  user: ObjectId;
  classRollNo: string;
  department: string;
  batch: '1st' | '2nd' | '3rd' | '4th';
  session: string;
  year: '1st' | '2nd' | '3rd' | '4th';
  whatsappNo: number;
  email: string;
  paymentSS: {
    public_id: string;
    url: string;
  };
  paymentUTRNo: string;
  attendance: boolean;
  certificate: ObjectId;
  verificationCode: string;
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentSS: {
      public_id: String,
      url: String,
    },
    classRollNo: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      enum: [
        'Chemical Engineering',
        'Civil Engineering',
        'Mechanical Engineering',
        'Electrical Engineering',
        'Electronics & Communication Engineering',
        'Applied Electronics & Instrumentation Engineering',
        'Computer Science & Engineering',
        'Information Technology',
        'Computer Science & Engineering - Artificial Intelligence and Machine Learning',
        'Computer Science & Engineering - Data Science',
        'Computer Science & Engineering - Cyber Security',
        'Biotechnology',
        'Food Technology'
      ],
      required: true,
    },
    batch: {
      type: String,
      enum: ['Batch 1', 'Batch 2', 'Batch 1', 'Batch 4'],
      required: true,
    },
    session: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      enum: ['1st', '2nd', '3rd', '4th'],
      required: true,
    },
    whatsappNo: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    paymentUTRNo: {
      type: String,
    },
    attendance: {
      type: Boolean,
      default: false,
    },
    certificate: {
      type: Schema.Types.ObjectId,
      ref: "Certificate",
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true
    },
  },
  { timestamps: true }
);

interface IEventFAQ extends Document {
  event: ObjectId;
  question: string;
  answer: string;
}

const eventFAQSchema = new Schema<IEventFAQ>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const eventModel: Model<IEvent> = mongoose.model("Event", eventSchema);

const eventRegistrationModel: Model<IEventRegistration> = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);

const eventFAQModel: Model<IEventFAQ> = mongoose.model(
  "EventFAQ",
  eventFAQSchema
);

export { eventModel, eventRegistrationModel, eventFAQModel };
