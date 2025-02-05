require("dotenv").config();
import mongoose, { Document, Schema, Model, ObjectId } from "mongoose";

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
  upiID: string;
  paymentQR: {
    public_id: string;
    url: string;
  };
  faq: Array<{ faq_id: ObjectId }>;
  is_upcoming: boolean;
  registrations: Array<{ registration_id: ObjectId }>;
  registration_open: boolean;
  gallery: Array<{
    public_id: string;
    url: string;
  }>; //
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
    paymentQR: {
      public_id: String,
      url: String,
    },
    upiID: {
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
  },
  { timestamps: true }
);

interface IEventRegistration extends Document {
  event: ObjectId;
  user: ObjectId;
  classRollNo: string;
  department: string;
  whatsappNo: number;
  paymentSS: {
    public_id: string;
    url: string;
  };
  paymentUTRNo: string;
  attendance: boolean;
  certificate:ObjectId;
  verificationCode:string;
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
      required: true,
    },
    whatsappNo: {
      type: Number,
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
      required:true,
      unique:true
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
