import mongoose, { Document, Model, ObjectId, Schema } from "mongoose";

interface ICertificate extends Document {
  event: ObjectId;
  user: ObjectId;
  registration: ObjectId;
  certificate: {
    public_id: string;
    url: string;
  };
  download: number;
  mail_sent: boolean;
  verification_code:string;
}

const certificateSchema = new Schema<ICertificate>(
  {
    event: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    user: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    registration: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: "EventRegistration",
    },
    certificate: {
      public_id: String,
      url: String,
    },
    download: {
      required: true,
      type: Number,
      default: 0,
    },
    mail_sent: {
      required: true,
      type: Boolean,
      default: false,
    },
    verification_code: {
      required:true,
      unique:true,
      type: String,
    }
  },
  { timestamps: true }
);

const certificateModel: Model<ICertificate> = mongoose.model(
  "Certificate",
  certificateSchema
);

export { certificateModel };
