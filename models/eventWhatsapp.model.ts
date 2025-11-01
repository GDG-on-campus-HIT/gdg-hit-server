import mongoose, { Document, Schema, Model, Types } from "mongoose";

export interface IEventWhatsapp extends Document {
  event: Types.ObjectId;
  whatsappLink: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventWhatsappSchema = new Schema<IEventWhatsapp>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    whatsappLink: { type: String, required: true },
  },
  { timestamps: true }
);

const EventWhatsapp: Model<IEventWhatsapp> = mongoose.model(
  "EventWhatsapp",
  eventWhatsappSchema
);
export default EventWhatsapp;
