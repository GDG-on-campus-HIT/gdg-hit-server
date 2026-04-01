import mongoose from "mongoose";
require('dotenv').config();

// Avoid hung requests when DB is slow or unreachable (must run before any model operation)
mongoose.set("bufferTimeoutMS", 15_000);

const dbUrl:string = process.env.DB_URL || '';

const connectDB = async () =>{
    try{
        await mongoose.connect(dbUrl).then((data:any) => {
            console.log(`databse connected with ${data.connection.host}`)
        })
    } catch (error:any) {
        console.log(error.message);
        setTimeout(connectDB,8080);
    }
}

export default connectDB;