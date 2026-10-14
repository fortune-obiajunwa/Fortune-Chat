import mongoose, {
  Document,
  Schema,
} from "mongoose";


export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  password: string;
  fortuneId: string;
  profilePicture?: string;

  countryCode: string;
  countryName: string;
  countryFlag: string;

  isOnline: boolean;
  lastSeen?: Date;
}


const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },


    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },


    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },


    password: {
      type: String,
      required: true,
    },


    fortuneId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },


    profilePicture: {
      type: String,
      default: "",
    },


    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },


    countryName: {
      type: String,
      required: true,
      trim: true,
    },


    countryFlag: {
      type: String,
      required: true,
      trim: true,
    },


    isOnline: {
      type: Boolean,
      default: false,
    },


    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


const User = mongoose.model<IUser>(
  "User",
  userSchema
);


export default User;