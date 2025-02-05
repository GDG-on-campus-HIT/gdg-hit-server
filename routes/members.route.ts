import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import express from 'express';
import { addMember,deleteMember,getMembers, updateMember } from '../controllers/members.controller';


const memberRouter = express.Router();

memberRouter.get('/members', getMembers);

memberRouter.post('/members',isAuthenticate, authorizeRoles("admin"), addMember);

memberRouter.put('/members/:id',isAuthenticate, authorizeRoles("admin"), updateMember);


memberRouter.delete('/members/:id',isAuthenticate, authorizeRoles("admin"), deleteMember);


export default memberRouter;