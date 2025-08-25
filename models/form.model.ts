import mongoose, { Schema, Document } from "mongoose";

export interface IEventForm extends Document {
  event: mongoose.Types.ObjectId; // link to event
  formTitle: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventFormSchema = new Schema<IEventForm>(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    formTitle: {
      type: String,
      required: true,
      default: "Event Registration Form",
    },
    description: {
      type: String,
      default: "Default registration form for event",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const EventForm = mongoose.model<IEventForm>("EventForm", eventFormSchema);
export default EventForm;
