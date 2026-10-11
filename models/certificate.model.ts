import mongoose, { Document, Model, ObjectId, Schema } from "mongoose";

interface ICertificate extends Document {
  event: ObjectId;
  user: ObjectId;
  registration?: ObjectId;
  participant?: ObjectId;
  kind: "participation" | "winner";
  position?: number | null;
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
    // Legacy certificates point at EventRegistration; new ones at Participant
    registration: {
      type: Schema.Types.ObjectId,
      ref: "EventRegistration",
    },
    participant: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
    },
    kind: {
      type: String,
      enum: ["participation", "winner"],
      default: "participation",
    },
    position: {
      type: Number,
      min: 1,
      max: 3,
      default: null,
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

certificateSchema.index(
  { event: 1, participant: 1 },
  { unique: true, partialFilterExpression: { participant: { $type: "objectId" } } }
);

const certificateModel: Model<ICertificate> = mongoose.model(
  "Certificate",
  certificateSchema
);

export { certificateModel };
