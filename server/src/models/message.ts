import mongoose, {
  Document,
  Schema,
} from "mongoose";


export interface IMessage
  extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;

  type:
    | "text"
    | "image"
    | "file"
    | "sticker"
    | "voice";

  text: string;

  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;

  isRead: boolean;
  readAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}


const messageSchema =
  new Schema<IMessage>(
    {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
      },


      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },


      receiverId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },


      /*
      =========================================
      MESSAGE TYPE
      =========================================
      */

      type: {
        type: String,
        enum: [
          "text",
          "image",
          "file",
          "sticker",
          "voice",
        ],
        default: "text",
        required: true,
      },


      /*
      =========================================
      MESSAGE TEXT
      =========================================
      */

      text: {
        type: String,
        trim: true,
        default: "",
      },


      /*
      =========================================
      MEDIA INFORMATION
      =========================================
      */

      mediaUrl: {
        type: String,
        default: "",
      },


      fileName: {
        type: String,
        default: "",
      },


      mimeType: {
        type: String,
        default: "",
      },


      fileSize: {
        type: Number,
        default: 0,
      },


      /*
      =========================================
      READ STATUS
      =========================================
      */

      isRead: {
        type: Boolean,
        default: false,
      },


      readAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );


const Message =
  mongoose.model<IMessage>(
    "Message",
    messageSchema
  );


export default Message;