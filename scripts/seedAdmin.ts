
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userModel from '../models/user.model';

dotenv.config();

const seedAdmin = async () => {
    try {
        const dbUrl = process.env.DB_URL;
        if (!dbUrl) {
            throw new Error('DB_URL is not defined in .env');
        }
        console.log(`Debug: DB_URL found (starts with: ${dbUrl.substring(0, 15)}...)`);

        console.log('Connecting to MongoDB...');
        await mongoose.connect(dbUrl);
        console.log('Connected to MongoDB');

        const adminEmail = 'sanuadmin@gdg.com';
        const adminPassword = 'sanusaha123'; // Change this as needed

        const existingAdmin = await userModel.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin already exists');
            // Update password just in case?
            // existingAdmin.password = adminPassword; // userModel pre-save hook handles hashing
            // await existingAdmin.save();
            // console.log('Admin password updated');
        } else {
            const newAdmin = new userModel({
                name: 'Admin User',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                isVerified: true,
                department: 'Administration',
                classRollNo: '000000',
                whatsappNo: 1234567890
            });

            await newAdmin.save();
            console.log(`Admin created successfully.\nEmail: ${adminEmail}\nPassword: ${adminPassword}`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
