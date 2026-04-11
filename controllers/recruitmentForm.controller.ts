
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { RecruitmentFormModel } from "../models/recruitmentForm.model";
import { IRecruitment, RecruitmentModel } from "../models/recruitment.model";
// Note: Keeping the existing IRecruitment import for type safety in other handlers if needed, 
// though we're mostly working with the dynamic form here.

// -------------------------------------------------------------------------
// RECRUITMENT FORM MANAGEMENT (ADMIN)
// -------------------------------------------------------------------------

// Create a new recruitment form
export const createRecruitmentForm = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { title, roles, generalInstructions } = req.body;

            if (!title || !roles || !Array.isArray(roles) || roles.length === 0) {
                return next(new ErrorHandler("Title and at least one role are required", 400));
            }

            // If this new form is set to active, deactivate all others
            if (req.body.isActive) {
                await RecruitmentFormModel.updateMany({}, { isActive: false });
            }

            const form = await RecruitmentFormModel.create({
                title,
                isActive: req.body.isActive || false,
                roles,
                generalInstructions
            });

            res.status(201).json({
                success: true,
                form
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Get all recruitment forms (for admin list)
export const getAllRecruitmentForms = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("📋 getAllRecruitmentForms called");
            
            // Fetch forms first
            const forms = await RecruitmentFormModel.find().sort({ createdAt: -1 });
            
            // Map each form to include its application count
            const formsWithCounts = await Promise.all(
                forms.map(async (form) => {
                    // Try to count with multi-format formId match for robustness
                    let applicantCount = await RecruitmentModel.countDocuments({ 
                        $or: [
                            { formId: (form as any)._id },
                            { formId: (form as any)._id.toString() }
                        ]
                    });
                    
                    // Fallback: If this is the active form and count is 0, 
                    // check if there are any applications submitted WITHOUT a formId (legacy data)
                    if (applicantCount === 0 && form.isActive) {
                        const legacyCount = await RecruitmentModel.countDocuments({
                            $or: [
                                { formId: { $exists: false } },
                                { formId: null }
                            ]
                        });
                        
                        if (legacyCount > 0) {
                            applicantCount = legacyCount;
                            console.log(`⚠️ Mapping ${legacyCount} legacy applications to active form: ${form.title}`);
                        }
                    }
                    
                    return {
                        ...form.toObject(),
                        applicantCount
                    };
                })
            );

            console.log(`✅ Found ${formsWithCounts.length} forms with counts`);

            res.status(200).json({
                success: true,
                forms: formsWithCounts
            });
        } catch (error: any) {
            console.log("❌ getAllRecruitmentForms error:", error.message);
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

export const getRecruitmentFormById = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const form = await RecruitmentFormModel.findById(id);
            if (!form) {
                return next(new ErrorHandler("Form not found", 404));
            }

            // Get applicant count for this specific form
            let applicantCount = await RecruitmentModel.countDocuments({
                $or: [
                    { formId: (form as any)._id },
                    { formId: (form as any)._id.toString() }
                ]
            });

            // Fallback for legacy data if this is active
            if (applicantCount === 0 && form.isActive) {
                const legacyCount = await RecruitmentModel.countDocuments({
                    $or: [
                        { formId: { $exists: false } },
                        { formId: null }
                    ]
                });
                if (legacyCount > 0) applicantCount = legacyCount;
            }

            res.status(200).json({
                success: true,
                form: {
                    ...form.toObject(),
                    applicantCount
                }
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Get the currently active recruitment form (for frontend rendering)
export const getActiveRecruitmentForm = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const form = await RecruitmentFormModel.findOne({ isActive: true });

            if (!form) {
                return next(new ErrorHandler("No active recruitment form found", 404));
            }

            res.status(200).json({
                success: true,
                form
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Update a recruitment form (e.g., toggle active status)
export const updateRecruitmentForm = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // If setting to active, deactivate others first
            if (updateData.isActive) {
                await RecruitmentFormModel.updateMany({ _id: { $ne: id } }, { isActive: false });
            }

            const form = await RecruitmentFormModel.findByIdAndUpdate(id, updateData, { new: true });

            if (!form) {
                return next(new ErrorHandler("Form not found", 404));
            }

            res.status(200).json({
                success: true,
                form
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Delete a recruitment form
export const deleteRecruitmentForm = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const form = await RecruitmentFormModel.findByIdAndDelete(id);

            if (!form) {
                return next(new ErrorHandler("Form not found", 404));
            }

            res.status(200).json({
                success: true,
                message: "Recruitment form deleted successfully"
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);


// -------------------------------------------------------------------------
// DASHBOARD STATS (ADMIN)
// -------------------------------------------------------------------------

export const getRecruitmentStats = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {


            const totalApplications = await RecruitmentModel.countDocuments();


            const statusCounts = await RecruitmentModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]);


            const branchCounts = await RecruitmentModel.aggregate([
                { $group: { _id: "$generalInfo.branch", count: { $sum: 1 } } }
            ]);


            const positionCounts = await RecruitmentModel.aggregate([
                { $unwind: "$generalInfo.positions" },
                { $group: { _id: "$generalInfo.positions", count: { $sum: 1 } } }
            ]);


            res.status(200).json({
                success: true,
                stats: {
                    totalApplications,
                    statusBreakdown: statusCounts,
                    branchBreakdown: branchCounts,
                    positionBreakdown: positionCounts
                }
            });

        } catch (error: any) {

            return next(new ErrorHandler(error.message, 500));
        }
    }
);
