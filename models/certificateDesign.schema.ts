import { Schema } from "mongoose";

// Embedded in Event.certificateTemplate (one design per event, plus an optional
// winners' design). Positions and sizes are fractions of the background so a
// layout survives the designer re-exporting the artwork at another resolution.

export type CertificateFieldAlign = "left" | "center" | "right";
export type CertificateFieldAudience = "all" | "winners" | "participants";

export interface ICertificateField {
  id: string;
  type: "text" | "qr";
  text?: string;
  x: number;
  y: number;
  fontSize?: number;
  font?: string;
  color?: string;
  align?: CertificateFieldAlign;
  maxWidth?: number;
  uppercase?: boolean;
  size?: number;
  showFor?: CertificateFieldAudience;
}

export interface ICertificateFont {
  key: string;
  name: string;
  url: string;
  public_id: string;
}

export interface ICertificateDesign {
  background?: {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  };
  fonts: ICertificateFont[];
  fields: ICertificateField[];
}

export interface ICertificateTemplate {
  participation?: ICertificateDesign;
  winner?: ICertificateDesign;
  updatedAt?: Date;
}

const fieldSchema = new Schema<ICertificateField>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["text", "qr"], default: "text" },
    text: { type: String, default: "" },
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 },
    fontSize: { type: Number, min: 0, max: 1 },
    font: { type: String, default: "Helvetica" },
    color: { type: String, default: "#111111" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },
    maxWidth: { type: Number, min: 0, max: 1, default: 0 },
    uppercase: { type: Boolean, default: false },
    size: { type: Number, min: 0, max: 1 },
    showFor: { type: String, enum: ["all", "winners", "participants"], default: "all" },
  },
  { _id: false }
);

const designSchema = new Schema<ICertificateDesign>(
  {
    background: {
      url: String,
      public_id: String,
      width: Number,
      height: Number,
      format: String,
    },
    fonts: [
      {
        _id: false,
        key: { type: String, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    fields: { type: [fieldSchema], default: [] },
  },
  { _id: false }
);

export const certificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    participation: designSchema,
    winner: designSchema,
    updatedAt: Date,
  },
  { _id: false }
);
