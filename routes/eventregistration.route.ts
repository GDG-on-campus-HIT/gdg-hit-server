import express from 'express';
import { addPriorKnowledge, checkIfRegistered, getParticipant, getPriorKnowledge, markAttendanceFromList, registerParticipant, setParticipantAttendance, setParticipantPosition } from '../controllers/eventregistration.controller';
import { authorizeRoles, isAuthenticate } from '../middleware/auth';
import { addWalkIn, checkInParticipant, checkInPassPage, checkInQrImage, getMyCheckInPass, getMyEvents, sendCheckInPass, setAttendanceSessions } from '../controllers/checkIn.controller';

const eventRegistration = express.Router();

// 
// Register a participant for an event
eventRegistration.post('/register-event',isAuthenticate, registerParticipant);

eventRegistration.get('/events/:eventId/prior-knowledge',isAuthenticate, getPriorKnowledge);

eventRegistration.post('/events/:eventId/prior-knowledge',isAuthenticate, addPriorKnowledge);

eventRegistration.get(
    '/event-participant/sheet/:eventId',
    isAuthenticate,
    authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
    getParticipant
);

eventRegistration.get(
    "/event-id-register/:event",
    isAuthenticate,
    checkIfRegistered
  );

const PARTICIPANT_MANAGERS = ["domain_lead", "super_domain_admin", "super_admin"];

eventRegistration.patch(
    "/events/:eventId/participants/attendance",
    isAuthenticate,
    authorizeRoles(...PARTICIPANT_MANAGERS),
    setParticipantAttendance
);

eventRegistration.patch(
    "/events/:eventId/participants/attendance/from-list",
    isAuthenticate,
    authorizeRoles(...PARTICIPANT_MANAGERS),
    markAttendanceFromList
);

eventRegistration.patch(
    "/events/:eventId/participants/:participantId/position",
    isAuthenticate,
    authorizeRoles(...PARTICIPANT_MANAGERS),
    setParticipantPosition
);

// Check-in passes (QR scanned at the venue)
const CHECK_IN_STAFF = ["domain_lead", "super_domain_admin", "super_admin"];

eventRegistration.post(
    "/events/:eventId/check-in",
    isAuthenticate,
    authorizeRoles(...CHECK_IN_STAFF),
    checkInParticipant
);

eventRegistration.post(
    "/events/:eventId/walk-in",
    isAuthenticate,
    authorizeRoles(...CHECK_IN_STAFF),
    addWalkIn
);

eventRegistration.put(
    "/events/:eventId/attendance-sessions",
    isAuthenticate,
    authorizeRoles(...PARTICIPANT_MANAGERS),
    setAttendanceSessions
);

eventRegistration.post(
    "/events/:eventId/participants/:participantId/send-pass",
    isAuthenticate,
    authorizeRoles(...PARTICIPANT_MANAGERS),
    sendCheckInPass
);

eventRegistration.get("/events/:eventId/my-pass", isAuthenticate, getMyCheckInPass);

eventRegistration.get("/check-in/pass/:token", checkInPassPage);

eventRegistration.get("/check-in/qr/:token", checkInQrImage);

eventRegistration.get("/my-events", isAuthenticate, getMyEvents);

export default eventRegistration;
