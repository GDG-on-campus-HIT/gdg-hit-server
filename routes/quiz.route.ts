import express from 'express';
import { checkUserQuizStatus, generateQuiz, getQuizData, getUserQuiz, submitQuiz } from '../controllers/quiz.controller';
import { authorizeRoles, isAuthenticate } from '../middleware/auth';

const quizRoute = express.Router();


// Generate a quiz with user-submitted proficiency levels
quizRoute.post('/quiz/:eventId',isAuthenticate, generateQuiz);

// check if a quiz is completed
quizRoute.get('/events/:eventId/users/:userId/quiz-status',isAuthenticate,checkUserQuizStatus)


//  get user quiz
quizRoute.get('/events/:eventId/users/:userId/quiz',isAuthenticate, getUserQuiz);

quizRoute.get(
    '/quiz/sheet/:eventId',
    isAuthenticate,
    authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
    getQuizData
);

// Submit quiz answers and get feedback/prerequisites
quizRoute.post('/quiz/:quizId/submit',isAuthenticate, submitQuiz);

export default quizRoute;
