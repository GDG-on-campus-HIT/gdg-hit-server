import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { eventModel, eventRegistrationModel } from "../models/events.model";
import { Participant, PriorKnowledge } from "../models/eventregistration.model";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import userModel from "../models/user.model";

interface SkillKnowledgeInput {
  skill: string;
  proficiency: string[];
}

export const addPriorKnowledge = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { skills }: { skills: SkillKnowledgeInput[] } = req.body;

  // Validate required fields
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }

  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: 'Non-empty skills array is required' });
  }

  // Validate skills format
  const validProficiencies = ['Basic', 'Intermediate', 'Advanced'];
  for (const skill of skills) {
    if (!skill.skill || !skill.proficiency || !Array.isArray(skill.proficiency) || skill.proficiency.length === 0) {
      return res.status(400).json({ error: 'Each skill must have a name and non-empty proficiency array' });
    }
    for (const proficiency of skill.proficiency) {
      if (!validProficiencies.includes(proficiency)) {
        return res.status(400).json({ error: `Invalid proficiency level: ${proficiency}` });
      }
    }
  }

  try {
    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if prior knowledge already exists for the event
    let priorKnowledge = await PriorKnowledge.findOne({ event: eventId });

    if (priorKnowledge) {
      // Update existing prior knowledge
      priorKnowledge.skills = skills;
      await priorKnowledge.save();
    } else {
      // Create new prior knowledge
      priorKnowledge = new PriorKnowledge({
        event: eventId,
        skills,
      });
      await priorKnowledge.save();
    }

    res.status(201).json({ priorKnowledgeId: priorKnowledge._id });
  } catch (error) {
    console.error('Error adding prior knowledge:', error);
    res.status(500).json({ error: 'Failed to add prior knowledge' });
  }
};


export const getPriorKnowledge = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  // Validate eventId
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }

  try {
    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Fetch prior knowledge for the event
    const priorKnowledge = await PriorKnowledge.findOne({ event: eventId });
    if (!priorKnowledge) {
      return res.status(404).json({ error: 'No prior knowledge defined for this event' });
    }

    // Return the skills and their proficiencies
    res.status(200).json({
      eventId,
      skills: priorKnowledge.skills,
    });
  } catch (error) {
    console.error('Error fetching prior knowledge:', error);
    res.status(500).json({ error: 'Failed to fetch prior knowledge' });
  }
};


export const registerParticipant = async (req: Request, res: Response) => {
  const {
    eventId,
    name,
    classRollNo,
    department,
    batch,
    session,
    year,
    email,
    whatsappNo,
    paymentUTRNo
  } = req.body;

  // Validate required fields
  if (!eventId || !name || !classRollNo || !department || !batch || !session || !year || !whatsappNo || !email) {
    return res.status(400).json({ error: 'All required fields must be provided: eventId, name, classRollNo, department, batch, session, year, whatsappNo, email' });
  }

  // Validate enum values
  const validBatches = ['1st', '2nd', '3rd', '4th', '5th'];
  const validYears = ['1st', '2nd', '3rd', '4th'];
  const validDepartments = [
    'Chemical Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Electronics & Communication Engineering',
    'Applied Electronics & Instrumentation Engineering',
    'Computer Science & Engineering',
    'Information Technology',
    'Computer Science & Engineering - Artificial Intelligence and Machine Learning',
    'Computer Science & Engineering - Data Science',
    'Computer Science & Engineering - Cyber Security',
    'Biotechnology',
    'Food Technology'
  ];

  if (!validBatches.includes(batch)) {
    return res.status(400).json({ error: 'Invalid batch. Must be one of: 1st, 2nd, 3rd, 4th,  5th' });
  }

  if (!validYears.includes(year)) {
    return res.status(400).json({ error: 'Invalid year. Must be one of: 1st, 2nd, 3rd, 4th' });
  }

  if (!validDepartments.includes(department)) {
    return res.status(400).json({ error: 'Invalid department. Please select a valid department from the list' });
  }

  const userId = req.user?._id?.toString() || "1";

  try {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'Invalid user or event ID' });
    }

    // Check if user is already registered for the event
    const existingRegistration = await Participant.findOne({
      event: eventId,
      $or: [{ user: userId }, { user: null, email: String(email).trim().toLowerCase() }],
    });
    if (existingRegistration) {
      if (!existingRegistration.user) {
        existingRegistration.user = new mongoose.Types.ObjectId(userId);
        await existingRegistration.save();
      }
      return res.status(200).json({
        message: 'User already registered for this event',
        registrationId: existingRegistration._id
      });
    }

    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create new participant registration
    const participant = new Participant({
      user: userId,
      event: eventId,
      name,
      classRollNo,
      department,
      phoneNumber: whatsappNo.toString(),
      email
    });

    await participant.save();

    res.status(201).json({
      registrationId: participant._id,
      message: 'Successfully registered for the event'
    });

  } catch (error) {
    console.error('Error registering participant:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
};

export const getParticipant = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const participants = await Participant
        .find({ event: eventId })

      const totalParticipants = participants.length;

      res.status(200).json({
        success: true,
        totalParticipants,
        participants,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const checkIfRegistered = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event } = req.params;

      // Ensure event ID is provided
      if (!event) {
        return next(new ErrorHandler("Event ID is required.", 400));
      }

      const userId = req.user?._id?.toString() || "";
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      const eventCheck = await eventModel.findById(event);
      if (!eventCheck) {
        return next(new ErrorHandler("Event not found.", 404));
      }

      // Check if the user is already registered for the event
      const existingRegistration = await Participant.findOne({
        event,
        user: user._id,
      });

      if (existingRegistration) {
        return res.status(200).json({
          success: true,
          message: "User is already registered for this event.",
        });
      }

      return res.status(200).json({
        success: false,
        message: "User is not registered for this event.",
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Something went wrong. Please try again.", 500)
      );
    }
  }
);

// Mark participants present/absent (bulk)
export const setParticipantAttendance = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const { participantIds, attendance } = req.body as { participantIds?: unknown; attendance?: unknown };

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return next(new ErrorHandler("Invalid event ID.", 400));
    }
    if (!Array.isArray(participantIds) || typeof attendance !== "boolean") {
      return next(new ErrorHandler("participantIds (array) and attendance (boolean) are required.", 400));
    }

    const ids = participantIds.filter((id): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id));
    const update = attendance ? { attendance } : { attendance, checkedInAt: null, sessionCheckIns: [] };
    const result = await Participant.updateMany({ event: eventId, _id: { $in: ids } }, { $set: update });

    res.status(200).json({ success: true, updated: result.modifiedCount });
  }
);

// Mark participants present from a pasted list of emails or roll numbers
export const markAttendanceFromList = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const { identifiers } = req.body as { identifiers?: unknown };

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return next(new ErrorHandler("Invalid event ID.", 400));
    }
    if (!Array.isArray(identifiers)) {
      return next(new ErrorHandler("identifiers must be an array.", 400));
    }

    const wanted = new Map<string, string>();
    for (const raw of identifiers) {
      const value = String(raw ?? "").trim();
      if (value) wanted.set(value.toLowerCase(), value);
    }

    const participants = await Participant.find({ event: eventId }).select("email classRollNo attendance");
    const matchedIds: string[] = [];
    const matchedKeys = new Set<string>();

    for (const p of participants) {
      const keys = [p.email?.toLowerCase(), p.classRollNo?.trim().toLowerCase()].filter(Boolean) as string[];
      const hit = keys.find((k) => wanted.has(k));
      if (hit) {
        matchedIds.push(String(p._id));
        keys.forEach((k) => wanted.has(k) && matchedKeys.add(k));
      }
    }

    const result = matchedIds.length
      ? await Participant.updateMany({ _id: { $in: matchedIds } }, { $set: { attendance: true } })
      : { modifiedCount: 0 };

    res.status(200).json({
      success: true,
      matched: matchedIds.length,
      updated: result.modifiedCount,
      unmatched: [...wanted.entries()].filter(([k]) => !matchedKeys.has(k)).map(([, v]) => v),
    });
  }
);

// Set or clear a participant's competition position (1st/2nd/3rd)
export const setParticipantPosition = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { eventId, participantId } = req.params;
    const { position } = req.body as { position?: unknown };

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      return next(new ErrorHandler("Invalid ID.", 400));
    }
    if (position !== null && ![1, 2, 3].includes(Number(position))) {
      return next(new ErrorHandler("Position must be 1, 2, 3 or null.", 400));
    }

    const update = position === null ? { position: null } : { position: Number(position), attendance: true };
    const participant = await Participant.findOneAndUpdate(
      { _id: participantId, event: eventId },
      { $set: update },
      { new: true }
    );

    if (!participant) {
      return next(new ErrorHandler("Participant not found for this event.", 404));
    }

    res.status(200).json({ success: true, participant });
  }
);
