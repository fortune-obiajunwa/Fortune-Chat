import mongoose, {
  Document,
  Schema,
} from "mongoose";


export interface IConversation
  extends Document {
  participants: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}


const conversationSchema =
  new Schema<IConversation>(
    {
      participants: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
    },
    {
      timestamps: true,
    }
  );


const Conversation =
  mongoose.model<IConversation>(
    "Conversation",
    conversationSchema
  );


export default Conversation;