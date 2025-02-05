import { IUser } from "../models/user.model"; // Adjust the import path accordingly

declare global {
    namespace Express {
        interface Request {
            user?: IUser; // Use your defined IUser directly
        }
    }
}
