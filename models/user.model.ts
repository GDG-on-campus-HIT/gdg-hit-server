require("dotenv").config();
import bcrypt from "bcryptjs";
import mongoose, { Document, ObjectId, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import { Model } from "mongoose";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  classRollNo: string;
  department: string;
  whatsappNo: number;
  isVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword: (password: string) => Promise<boolean>;
  SignAcessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "please enter your name"],
    },
    email: {
      type: String,
      required: [true, "please enter your email"],
      validate: {
        validator: function (value: string) {
          return emailRegexPattern.test(value);
        },
        message: "please enter a valid email",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "please enter your email"],
      minlength: [6, "password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      default: "user",
    },
    classRollNo: {
      type: String,
    },
    department: {
      type: String,
    },
    whatsappNo: {
      type: Number,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

//Hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// signin acess and refresh token
userSchema.methods.SignAcessToken = function () {
  return jwt.sign({ id: this._id, role:this.role }, process.env.ACCESS_TOKEN || "", {
    expiresIn: "5m",
  });
};

userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || "", {
    expiresIn: "3d",
  });
};

//compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model("User", userSchema);

export default userModel;
