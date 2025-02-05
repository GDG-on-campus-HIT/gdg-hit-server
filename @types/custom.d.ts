import { IUser } from "../models/user.model"; // Adjust the import path accordingly

declare global {
    namespace Express {
        // Extend the User interface with your custom IUser interface
        interface User extends IUser {}

        // Extend the Request interface
        interface Request {
            user?: User; // Now using your custom User interface
        }
    }
}