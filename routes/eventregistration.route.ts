import express from 'express';
import { addPriorKnowledge, getPriorKnowledge, registerParticipant } from '../controllers/eventregistration.controller';
import { isAuthenticate } from '../middleware/auth';

const eventRegistration = express.Router();


// Register a participant for an event
eventRegistration.post('/register-event',isAuthenticate, registerParticipant);

eventRegistration.get('/events/:eventId/prior-knowledge',isAuthenticate, getPriorKnowledge);

eventRegistration.post('/events/:eventId/prior-knowledge',isAuthenticate, addPriorKnowledge);


export default eventRegistration;
