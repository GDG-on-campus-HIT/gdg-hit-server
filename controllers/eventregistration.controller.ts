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
    const {  eventId, name, classRollNo, department, phoneNumber, email } = req.body;
  
    // Validate required fields
    if ( !eventId || !name || !classRollNo || !department || !phoneNumber || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    const userId = (req.user as { _id: string })._id || "";
    try {
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid user or event ID' });
      }
  
      // Check if user is already registered for the event
      const existingParticipant = await Participant.findOne({ user: userId, event: eventId });
      if (existingParticipant) {
        return res.status(200).json({
          message: 'User already registered for this event',
          participantId: existingParticipant._id
        });
      }
  
      // Verify event exists
      const event = await eventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
  
      // Create new participant
      const participant = new Participant({
        user: userId,
        event: eventId,
        name,
        classRollNo,
        department,
        phoneNumber,
        email,
      });
  
      await participant.save();
      res.status(201).json({ participantId: participant._id });
    } catch (error) {
      console.error('Error registering participant:', error);
      res.status(500).json({ error: 'Failed to register participant' });
    }
  };


  export const checkIfRegistered = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { event } = req.params;
  
        // Ensure event ID is provided
        if (!event) {
          return next(new ErrorHandler("Event ID is required.", 400));
        }

        const userId = (req.user as { _id: string })._id || "";
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
