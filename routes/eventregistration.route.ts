import express from 'express';
import { addPriorKnowledge, checkIfRegistered, getParticipant, getPriorKnowledge, registerParticipant } from '../controllers/eventregistration.controller';
import { isAuthenticate } from '../middleware/auth';

const eventRegistration = express.Router();


// Register a participant for an event
eventRegistration.post('/register-event',isAuthenticate, registerParticipant);

eventRegistration.get('/events/:eventId/prior-knowledge',isAuthenticate, getPriorKnowledge);

eventRegistration.post('/events/:eventId/prior-knowledge',isAuthenticate, addPriorKnowledge);

eventRegistration.get('/event-participant/sheet/:eventId', getParticipant);

eventRegistration.get(
    "/event-id-register/:event",
    isAuthenticate,
    checkIfRegistered
  );


export default eventRegistration;
