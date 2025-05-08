import mongoose, { Schema, Document } from 'mongoose';

interface IPriorKnowledge {
    skill: string;
    proficiency: string;
}

// Interface for Quiz Question
interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

// Interface for Quiz Response
interface IQuizResponse {
  questionIndex: number;
  selectedAnswer: string;
}

// Interface for Quiz Result
interface IQuizResult {
  score: number;
  totalQuestions: number;
  feedback: string;
  prerequisites: string[];
}

// Interface for Quiz document
interface IQuiz extends Document {
  user: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  priorKnowledge: IPriorKnowledge[];
  questions: IQuizQuestion[];
  responses: IQuizResponse[];
  result: IQuizResult;
  createdAt: Date;
  updatedAt: Date;
}

// Quiz Schema
const QuizSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    participant: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    priorKnowledge: [
        {
            skill: {
                type: String,
                required: true,
                trim: true,
            },
            proficiency: [
                {
                type: String,
                required: true,
                },
            ],
        }
    ],
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            required: true,
          },
        ],
        correctAnswer: {
          type: String,
          required: true,
        },
      },
    ],
    responses: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },
        selectedAnswer: {
          type: String,
          required: true,
        },
      },
    ],
    result: {
      score: {
        type: Number,
      },
      totalQuestions: {
        type: Number,
      },
      feedback: {
        type: String,
      },
      prerequisites: [
        {
          type: String,
        },
      ],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Create and export the Quiz model
export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);