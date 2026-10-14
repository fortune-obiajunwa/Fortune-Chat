import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IWorldMessage
  extends Document {
  countryCode: string;
  countryName: string;

  senderId: mongoose.Types.ObjectId;

  type:
    | "text"
    | "image"
    | "sticker";

  text: string;

  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;

  /**
   * Public identity information
   *
   * The sender's country is stored separately
   * from the room they are visiting.
   *
   * Example:
   *
   * Room: Ghana 🇬🇭
   * Sender: Nigeria 🇳🇬
   */
  senderCountryCode: string;
  senderCountryName: string;
  senderCountryFlag: string;

  /**
   * Moderation
   */
  moderationStatus:
    | "visible"
    | "hidden"
    | "removed";

  moderationReason?: string;

  /**
   * Number of reports received by this message.
   */
  reportCount: number;

  /**
   * Spam protection
   */
  isSpam: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const worldMessageSchema =
  new Schema<IWorldMessage>(
    {
      /**
       * =========================================
       * WORLD CHAT ROOM
       * =========================================
       */

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

      /**
       * =========================================
       * SENDER
       * =========================================
       */

      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /**
       * =========================================
       * MESSAGE TYPE
       * =========================================
       */

      type: {
        type: String,
        enum: [
          "text",
          "image",
          "sticker",
        ],
        default: "text",
        required: true,
      },

      /**
       * =========================================
       * MESSAGE TEXT
       * =========================================
       */

      text: {
        type: String,
        trim: true,
        default: "",
      },

      /**
       * =========================================
       * MEDIA
       * =========================================
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

      /**
       * =========================================
       * SENDER COUNTRY
       *
       * This is NOT the room country.
       *
       * Example:
       *
       * Ghana room:
       * countryCode = GH
       *
       * Nigerian sender:
       * senderCountryCode = NG
       * senderCountryFlag = 🇳🇬
       * =========================================
       */

      senderCountryCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      senderCountryName: {
        type: String,
        required: true,
        trim: true,
      },

      senderCountryFlag: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * =========================================
       * MODERATION
       * =========================================
       */

      moderationStatus: {
        type: String,
        enum: [
          "visible",
          "hidden",
          "removed",
        ],
        default: "visible",
        required: true,
      },

      moderationReason: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * =========================================
       * REPORT COUNT
       * =========================================
       */

      reportCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * =========================================
       * SPAM PROTECTION
       * =========================================
       */

      isSpam: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * Useful indexes for World Chat.
 *
 * This allows MongoDB to quickly retrieve
 * messages belonging to a country room.
 */

worldMessageSchema.index({
  countryCode: 1,
  createdAt: -1,
});

worldMessageSchema.index({
  senderId: 1,
  createdAt: -1,
});

const WorldMessage =
  mongoose.model<IWorldMessage>(
    "WorldMessage",
    worldMessageSchema
  );

export default WorldMessage;