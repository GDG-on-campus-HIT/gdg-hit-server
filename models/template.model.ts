import mongoose, { Document, Model, ObjectId, Schema } from "mongoose";

interface ICertificateSettings {
  name: {
    text: string;
    position: {
      x: number;
      y: number;
    };
    font: {
      size: number;
      color: string;
      family: string;
      weight: string;
    };
  };
  course: {
    text: string;
    position: {
      x: number;
      y: number;
    };
    font: {
      size: number;
      color: string;
      family: string;
      weight: string;
    };
  };
  date: {
    text: string;
    position: {
      x: number;
      y: number;
    };
    font: {
      size: number;
      color: string;
      family: string;
      weight: string;
    };
    show: boolean;
  };
  qrCode: {
    value: string;
    position: {
      x: number;
      y: number;
    };
    size: number;
    show: boolean;
  };
  pdfSettings: {
    width: number;
    height: number;
    quality: number;
  };
  backgroundImage: {
    url: string;
    public_id: string;
  };
}

export interface ITemplate extends Document {
  name: string;
  certificateSettings: ICertificateSettings;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
    },
    certificateSettings: {
      name: {
        text: { type: String, required: true },
        position: {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
        font: {
          size: { type: Number, required: true },
          color: { type: String, required: true },
          family: { type: String, required: true },
          weight: { type: String, required: true },
        },
      },
      course: {
        text: { type: String, required: true },
        position: {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
        font: {
          size: { type: Number, required: true },
          color: { type: String, required: true },
          family: { type: String, required: true },
          weight: { type: String, required: true },
        },
        
      },
      date: {
        text: { type: String, required: true },
        position: {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
        font: {
          size: { type: Number, required: true },
          color: { type: String, required: true },
          family: { type: String, required: true },
          weight: { type: String, required: true },
        },
        show: { type: Boolean, required: true },
      },
      qrCode: {
        value: { type: String, required: true },
        position: {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
        size: { type: Number, required: true },
        show: { type: Boolean, required: true },
      },
      pdfSettings: {
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        quality: { type: Number, required: true },
      },
      backgroundImage: {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

const templateModel: Model<ITemplate> = mongoose.model(
  "Template",
  templateSchema
);

export { templateModel };
