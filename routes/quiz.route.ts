import express from 'express';
import { checkUserQuizStatus, generateQuiz, getUserQuiz, submitQuiz } from '../controllers/quiz.controller';
import { isAuthenticate } from '../middleware/auth';

const quizRoute = express.Router();


// Generate a quiz with user-submitted proficiency levels
quizRoute.post('/quiz/:participantId',isAuthenticate, generateQuiz);

// check if a quiz is completed
quizRoute.get('/events/:eventId/users/:userId/quiz-status',isAuthenticate,checkUserQuizStatus)


//  get user quiz
quizRoute.get('/events/:eventId/users/:userId/quiz',isAuthenticate, getUserQuiz);


// Submit quiz answers and get feedback/prerequisites
quizRoute.post('/quiz/:quizId/submit',isAuthenticate, submitQuiz);

export default quizRoute;
