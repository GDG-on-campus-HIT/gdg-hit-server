import mongoose, { Schema, Document } from "mongoose";

// Interface for individual form fields
export interface IFormField {
  name: string;
  type: string;
  required: boolean;
  label: string;
  placeholder?: string;
  options?: string[];
  accept?: string; // for file inputs
}

// Updated EventForm interface with fields
export interface IEventForm extends Document {
  event: mongoose.Types.ObjectId; // link to event
  formTitle: string;
  description?: string;
  fields: IFormField[]; // Array of form fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for individual form fields
const FormFieldSchema = new Schema<IFormField>({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'select', 'file', 'email', 'tel']
  },
  required: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    required: true
  },
  placeholder: {
    type: String
  },
  options: [{
    type: String
  }],
  accept: {
    type: String // for file input types like "image/*"
  }
}, { _id: false }); // Don't create _id for subdocuments

// Updated EventForm schema with fields
const eventFormSchema = new Schema<IEventForm>(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true // Prevents duplicate forms per event
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
    fields: {
      type: [FormFieldSchema],
      required: true,
      validate: {
        validator: function(fields: IFormField[]) {
          return fields && fields.length > 0;
        },
        message: "At least one form field is required"
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Add indexes for better performance
eventFormSchema.index({ event: 1 });
eventFormSchema.index({ isActive: 1 });

const EventForm = mongoose.model<IEventForm>("EventForm", eventFormSchema);
export default EventForm;