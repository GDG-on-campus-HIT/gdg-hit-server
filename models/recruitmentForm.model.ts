
import mongoose, { Schema, Document } from "mongoose";

// Interface for individual form fields - reusing the logic from form.model.ts
export interface IFormField {
    name: string;      // key for the data e.g., "github_link"
    type: string;      // "text", "file", "textarea", "number", "select", "email"
    required: boolean;
    label: string;     // "Please provide your GitHub Link"
    options?: string[]; // for select/radio
    placeholder?: string;
}

export interface IRoleDefinition {
    roleName: string;       // e.g., "Web Developer"
    description?: string;
    fields: IFormField[];   // Fields specific to this role
}

export interface IRecruitmentForm extends Document {
    title: string;          // e.g., "Winter Recruitment 2025"
    isActive: boolean;      // Only one active at a time?
    roles: IRoleDefinition[]; // List of roles and their dynamic questions
    generalInstructions?: string;
    createdAt: Date;
    updatedAt: Date;
}

const recruitmentFormSchema = new Schema<IRecruitmentForm>({
    title: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    roles: [{
        roleName: { type: String, required: true },
        description: String,
        fields: [
            {
                name: { type: String, required: true },
                type: { type: String, required: true, enum: ['text', 'textarea', 'number', 'select', 'file', 'email', 'tel', 'url'] },
                required: { type: Boolean, default: false },
                label: { type: String, required: true },
                options: [String],
                placeholder: String
            }
        ]
    }],
    generalInstructions: String
}, { timestamps: true });

// Ensure only one active form at a time? We can handle this in controller
export const RecruitmentFormModel = mongoose.model<IRecruitmentForm>("RecruitmentForm", recruitmentFormSchema);
