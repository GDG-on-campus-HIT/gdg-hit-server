import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import userModel from '../models/user.model';
import  ErrorHandler from '../utlis/ErrorHandler';
import { redis } from '../utlis/redis';


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID as string ,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  callbackURL: "/auth/google/callback"
},
async (accessToken: string, refreshToken: string, profile: any, cb: Function) => {
  try {
    let user = await userModel.findOne({ email: profile._json.email });

    if (!user) {
      const lastSixDigitsID = profile.id.substring(profile.id.length - 6);
      const lastTwoDigitsName = profile._json.name.substring(profile._json.name.length - 2);
      const newPass = lastTwoDigitsName + lastSixDigitsID;

      user = await userModel.create({
        name: profile._json.name,
        email: profile._json.email,
        isVerfied: true,
        password: newPass,
      });
    }
    redis.set(user._id as any,JSON.stringify(user) as any);

    const accessToken = user.SignAcessToken();
    const refreshToken = user.SignRefreshToken();

    return cb(null, {user,accessToken,refreshToken})

  } catch (error:any) {
    return cb(new ErrorHandler(error.message, error.code));
  }
}));
