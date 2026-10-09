import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import mongoose from "mongoose";
import { eventModel } from "../models/events.model";
import { Participant, PriorKnowledge } from "../models/eventregistration.model";
import { Quiz } from "../models/quiz.model";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ErrorHandler from "../utlis/ErrorHandler";

// Interfaces for type safety
interface ProficiencyInput {
  [skill: string]: string; // e.g., { "HTML": "Basic", "CSS": "Intermediate" }
}

interface SkillKnowledgeInput {
  skill: string;
  proficiency: string[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // Store exact answer text
}

interface QuizResponse {
  answers: string[]; // Text-based answers
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  feedback: string;
  prerequisites: string[];
}

const toPublicQuestions = (questions: QuizQuestion[]) =>
  questions.map(({ question, options }) => ({ question, options }));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "YOUR_API_KEY"
);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Utility function to clean Gemini AI response
const cleanJsonResponse = (text: string): string => {
  // Remove markdown code fences and any leading/trailing whitespace
  return (
    text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/^\s+|\s+$/g, "")
      // Remove any other unexpected characters (optional, customize as needed)
      .replace(/[\r\n]+/g, "")
  );
};

// Add or update prior knowledge for an event
export const addPriorKnowledge = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const { skills }: { skills: SkillKnowledgeInput[] } = req.body;

    // Validate required fields
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Valid event ID is required" });
    }

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res
        .status(400)
        .json({ error: "Non-empty skills array is required" });
    }

    // Validate skills format
    const validProficiencies = ["Basic", "Intermediate", "Advanced"];
    for (const skill of skills) {
      if (
        !skill.skill ||
        !skill.proficiency ||
        !Array.isArray(skill.proficiency) ||
        skill.proficiency.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Each skill must have a name and non-empty proficiency array",
          });
      }
      for (const proficiency of skill.proficiency) {
        if (!validProficiencies.includes(proficiency)) {
          return res
            .status(400)
            .json({ error: `Invalid proficiency level: ${proficiency}` });
        }
      }
    }

    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
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
  }
);

export const generateQuiz = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const proficiencies: ProficiencyInput = req.body;

  const userId = req.user?._id?.toString() || ""; // Assuming user ID is available in the request object
  try {
    // Verify participant exists

    const participant = await Participant.findOne({
      user: userId,
      event: eventId,
    });

    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const participantId = participant._id;

    // Verify event exists
    const event = await eventModel.findById(participant.event);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if a quiz already exists for this participant and event
    const existingQuiz = await Quiz.findOne({
      participant: participantId,
      event: participant.event,
    });
    if (existingQuiz) {
      return res
        .status(200)
        .json({ quizId: existingQuiz._id, questions: toPublicQuestions(existingQuiz.questions) });
    }

    // Get prior knowledge skills for the event
    const priorKnowledge = await PriorKnowledge.findOne({
      event: participant.event,
    });
    if (!priorKnowledge) {
      return res
        .status(404)
        .json({ error: "Prior knowledge skills not defined for this event" });
    }

    // Validate proficiencies
    const validProficiencies = ["Basic", "Intermediate", "Advanced"];
    const requiredSkills = priorKnowledge.skills.map((s) => s.skill);
    const submittedSkills = Object.keys(proficiencies);

    if (
      submittedSkills.length !== requiredSkills.length ||
      !requiredSkills.every((skill: string) => submittedSkills.includes(skill))
    ) {
      return res
        .status(400)
        .json({
          error: "Proficiencies must be provided for all required skills",
        });
    }

    const quizPriorKnowledge: { skill: string; proficiency: string[] }[] = [];
    for (const skill of requiredSkills) {
      const proficiency = proficiencies[skill];
      if (!validProficiencies.includes(proficiency)) {
        return res
          .status(400)
          .json({ error: `Invalid proficiency level for ${skill}` });
      }
      quizPriorKnowledge.push({ skill, proficiency: [proficiency] });
    }

    // Create quiz document
    const quiz = new Quiz({
      user: participant.user,
      event: participant.event,
      participant: participantId,
      priorKnowledge: quizPriorKnowledge,
      questions: [],
      responses: [],
      result: {},
    });

    // Determine difficulty based on proficiencies
    const proficiencyLevels = Object.values(proficiencies);
    const difficulty = proficiencyLevels.includes("Advanced")
      ? "Advanced"
      : proficiencyLevels.includes("Intermediate")
      ? "Intermediate"
      : "Basic";

    // Format skills for prompt
    const skillsSummary = quizPriorKnowledge
      .map((skill) => `${skill.skill} (${skill.proficiency[0]})`)
      .join(", ");

    // Generate quiz questions using Gemini AI based on prior knowledge skills
    const prompt = `
      Generate 5 multiple-choice questions to test the participant's prior knowledge skills: ${skillsSummary}.
      The questions should be tailored for a ${difficulty} level and focus only on these skills, not on any specific event or workshop topic.
      Ensure all answers are 100% accurate and verifiable for the given skills and proficiency levels.
      Each question should have 4 options with one correct answer.
      Return the response in JSON format with the following structure:
      [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string" // The exact text of the correct option
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanedText = cleanJsonResponse(response.text());
    let questions: QuizQuestion[];
    try {
      questions = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response:",
        cleanedText,
        parseError
      );
      return res
        .status(500)
        .json({ error: "Invalid response format from AI service" });
    }

    // Validate questions format
    if (!Array.isArray(questions) || questions.length === 0) {
      return res
        .status(500)
        .json({ error: "No questions generated by AI service" });
    }
    for (const q of questions) {
      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.correctAnswer ||
        !q.options.includes(q.correctAnswer)
      ) {
        return res
          .status(500)
          .json({ error: "Invalid question format from AI service" });
      }
    }

    // Update quiz with questions
    quiz.questions = questions;
    await quiz.save();

    res.status(200).json({ quizId: quiz._id, questions: toPublicQuestions(questions) });
  } catch (error) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
};

export const getUserQuiz = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const userId = req.user?._id?.toString() || ""; // Assuming user ID is available in the request object
  // Validate parameters
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: "Valid event ID is required" });
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Valid user ID is required" });
  }

  try {
    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Verify participant exists for the user and event
    const participant = await Participant.findOne({
      user: userId,
      event: eventId,
    }).select("_id");
    if (!participant) {
      return res
        .status(404)
        .json({ error: "Participant not found for this user and event" });
    }

    // Check if a quiz exists for the participant and event
    const quiz = await Quiz.findOne({
      participant: participant._id,
      event: eventId,
    }).select("_id questions priorKnowledge responses result");

    if (!quiz) {
      return res.status(200).json({
        eventId,
        userId,
        quizGenerated: false,
        message: "No quiz generated for this user and event",
      });
    }

    // Check if the quiz has been answered (responses exist)
    const isAnswered = quiz.responses && quiz.responses.length > 0;

    if (isAnswered) {
      return res.status(200).json({
        eventId,
        userId,
        quizGenerated: true,
        quizId: quiz._id,
        quizAnswered: true,
        result: quiz.result,
        message: "Quiz has already been answered",
      });
    }

    // Quiz exists but not answered, return quiz data
    return res.status(200).json({
      eventId,
      userId,
      quizGenerated: true,
      quizId: quiz._id,
      questions: toPublicQuestions(quiz.questions),
      priorKnowledge: quiz.priorKnowledge,
      message: "Quiz generated but not yet answered",
    });
  } catch (error) {
    console.error("Error retrieving user quiz:", error);
    res.status(500).json({ error: "Failed to retrieve quiz data" });
  }
};

interface QuizResponse {
  answers: string[];
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  feedback: string;
  prerequisites: string[];
}

export const submitQuiz = async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const { answers }: QuizResponse = req.body;

  try {
    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz || quiz.user?.toString() !== req.user?._id?.toString()) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Get event details
    const event = await eventModel.findById(quiz.event);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if quiz has already been submitted
    if (quiz.responses.length > 0 || quiz.result.score !== undefined) {
      return res.status(400).json({
        error: "Quiz already submitted for this event",
        quizResult: {
          score: quiz.result.score || 0,
          totalQuestions: quiz.result.totalQuestions || quiz.questions.length,
          feedback: quiz.result.feedback || "",
          prerequisites: quiz.result.prerequisites || [],
        },
      });
    }

    // Validate answers
    if (!answers || answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: "Invalid answers provided" });
    }

    // Store responses
    quiz.responses = answers.map((answer, index) => ({
      questionIndex: index,
      selectedAnswer: answer,
    }));

    // Calculate score
    let score = 0;
    quiz.questions.forEach((question, index) => {
      if (question.correctAnswer === answers[index]) {
        score++;
      }
    });

    // Format skills for prompt
    const skillsSummary = quiz.priorKnowledge
      .map((skill) => `${skill.skill} (${skill.proficiency[0]})`)
      .join(", ");

    // Derive event topics from priorKnowledge
    const eventTopics =
      quiz.priorKnowledge.length > 0
        ? quiz.priorKnowledge.map((skill) => skill.skill).join(", ")
        : event.name;

    // Generate feedback and prerequisites using Gemini AI
    const prompt = `
    A participant scored ${score} out of ${quiz.questions.length} in a test taken during registration for the ${event.name} workshop, which focuses on ${eventTopics}.
    The participant's prior knowledge is: ${skillsSummary}.
    Provide:
    1. Feedback (encouraging and motivating tone):
       - For a score of 0 or 1, motivate them to join the ${event.name} workshop to build skills in ${eventTopics} through hands-on practice in a supportive environment. Emphasize that preparing with the listed prerequisites will set them up for success. Avoid assuming prior knowledge.
       - For scores 2–3, acknowledge their partial understanding of ${eventTopics} and motivate them to join the workshop to deepen their skills and gain practical experience in ${eventTopics}.
       - For scores 4–5, praise their strong performance in ${eventTopics} and encourage them to join the workshop to further enhance their expertise with advanced concepts and hands-on practice.
       - Do not mention that the quiz is a tool to gauge knowledge, as this is implied. Highlight that the workshop focuses on ${eventTopics} (e.g., React for React Buzz), not the prerequisite skills (e.g., HTML, CSS, JavaScript), which are needed to prepare for the workshop.
    2. Prerequisites to prepare before the workshop:
       - For low scores (0–1), recommend foundational topics related to ${eventTopics} to prepare for the workshop (e.g., for React, JavaScript: JavaScript basics, React fundamentals; for Python, Data Science: Python syntax, data structures).
       - For mid scores (2–3), suggest intermediate topics related to ${eventTopics} (e.g., for React: component-based architecture, state management; for Python: object-oriented programming, libraries).
       - For high scores (4–5), recommend advanced topics or optional enhancements related to ${eventTopics} (e.g., for React: advanced React patterns, hooks; for Python: advanced data analysis, frameworks).
       - Ensure prerequisites are specific to ${eventTopics}, actionable, and prepare the participant for the workshop's focus.
    Return the response in JSON format:
    {
      "feedback": "string",
      "prerequisites": ["string", "string", ...]
    }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanedText = cleanJsonResponse(response.text());
    let feedbackData: { feedback: string; prerequisites: string[] };
    try {
      feedbackData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini feedback response:",
        cleanedText,
        parseError
      );
      return res
        .status(500)
        .json({ error: "Invalid feedback format from AI service" });
    }

    // Validate feedback format
    if (!feedbackData.feedback || !Array.isArray(feedbackData.prerequisites)) {
      return res
        .status(500)
        .json({ error: "Invalid feedback format from AI service" });
    }

    // Store result
    quiz.result = {
      score,
      totalQuestions: quiz.questions.length,
      feedback: feedbackData.feedback,
      prerequisites: feedbackData.prerequisites,
    };

    await quiz.save();

    const quizResult: QuizResult = {
      score,
      totalQuestions: quiz.questions.length,
      feedback: feedbackData.feedback,
      prerequisites: feedbackData.prerequisites,
    };

    res.status(200).json(quizResult);
  } catch (error) {
    console.error("Error processing quiz submission:", error);
    res.status(500).json({ error: "Failed to process quiz results" });
  }
};

export const checkUserQuizStatus = async (req: Request, res: Response) => {
  const { eventId, userId } = req.params;

  // Validate parameters
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: "Valid event ID is required" });
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Valid user ID is required" });
  }

  const isSelf = userId === req.user?._id?.toString();
  const isAdmin = ["domain_lead", "super_domain_admin", "super_admin"].includes(req.user?.role || "");
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: "You can only view your own quiz status" });
  }

  try {
    // Verify event exists
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Verify participant exists for the user and event
    const participant = await Participant.findOne({
      user: userId,
      event: eventId,
    }).select("_id");
    if (!participant) {
      return res
        .status(404)
        .json({ error: "Participant not found for this user and event" });
    }

    // Check if a quiz exists for the participant and event
    const quiz = await Quiz.findOne({
      participant: participant._id,
      event: eventId,
    }).select("_id questions responses result");

    if (!quiz) {
      return res.status(200).json({
        eventId,
        userId,
        quizGenerated: false,
        message: "No quiz generated for this user and event",
      });
    }

    // Check if the quiz has been answered (responses exist)
    const isAnswered = quiz.responses && quiz.responses.length > 0;

    if (!isAnswered) {
      return res.status(200).json({
        eventId,
        userId,
        quizGenerated: true,
        quizId: quiz._id,
        quizAnswered: false,
        result: null,
        message: "Quiz generated but not yet answered",
      });
    }

    // Quiz has been answered, include result
    return res.status(200).json({
      eventId,
      userId,
      quizGenerated: true,
      quizId: quiz._id,
      quizAnswered: true,
      result: quiz.result,
      message: "Quiz generated and answered",
    });
  } catch (error) {
    console.error("Error checking user quiz status:", error);
    res.status(500).json({ error: "Failed to check quiz status" });
  }
};



export const getQuizData = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const data = await Quiz
        .find({ event: eventId }).populate("participant");

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

