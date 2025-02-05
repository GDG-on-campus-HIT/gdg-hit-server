// import "@types/express";
import { app } from "./app";
require("dotenv").config();
import connectDB from "./utlis/db";
import { v2 as cloudinary } from "cloudinary";

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});
// create server
app.listen(8080, () => {
  console.log(`server is connected with port ${process.env.PORT}`);
  connectDB();
});
