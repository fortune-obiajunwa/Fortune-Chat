import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IWorldReport
  extends Document {
  reporterId: mongoose.Types.ObjectId;

  reportedUserId: mongoose.Types.ObjectId;

  messageId?: mongoose.Types.ObjectId;

  countryCode: string;

  targetType: "message" | "user";

  reason:
    | "spam"
    | "harassment"
    | "inappropriate"
    | "scam"
    | "personal_information"
    | "other";

  details?: string;

  status:
    | "pending"
    | "reviewed"
    | "resolved"
    | "dismissed";

  createdAt: Date;
  updatedAt: Date;
}

const worldReportSchema =
  new Schema<IWorldReport>(
    {
      /**
       * =========================================
       * PERSON MAKING THE REPORT
       * =========================================
       */

      reporterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /**
       * =========================================
       * PERSON BEING REPORTED
       * =========================================
       */

      reportedUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /**
       * =========================================
       * REPORTED MESSAGE
       *
       * Optional because a user can report
       * another user without reporting one
       * particular message.
       * =========================================
       */

      messageId: {
        type: Schema.Types.ObjectId,
        ref: "WorldMessage",
        default: null,
      },

      /**
       * =========================================
       * WORLD CHAT COUNTRY
       * =========================================
       */

      countryCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      /**
       * =========================================
       * REPORT TARGET
       * =========================================
       */

      targetType: {
        type: String,
        enum: [
          "message",
          "user",
        ],
        required: true,
      },

      /**
       * =========================================
       * REPORT REASON
       * =========================================
       */

      reason: {
        type: String,
        enum: [
          "spam",
          "harassment",
          "inappropriate",
          "scam",
          "personal_information",
          "other",
        ],
        required: true,
      },

      /**
       * =========================================
       * OPTIONAL DETAILS
       * =========================================
       */

      details: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },

      /**
       * =========================================
       * MODERATION STATUS
       * =========================================
       */

      status: {
        type: String,
        enum: [
          "pending",
          "reviewed",
          "resolved",
          "dismissed",
        ],
        default: "pending",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * =========================================
 * INDEXES
 * =========================================
 */

worldReportSchema.index({
  reportedUserId: 1,
  createdAt: -1,
});

worldReportSchema.index({
  messageId: 1,
  createdAt: -1,
});

worldReportSchema.index({
  countryCode: 1,
  status: 1,
  createdAt: -1,
});

/**
 * Prevent the same user from repeatedly
 * reporting the exact same message.
 */

worldReportSchema.index(
  {
    reporterId: 1,
    messageId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      messageId: {
        $exists: true,
        $ne: null,
      },
    },
  }
);

const WorldReport =
  mongoose.model<IWorldReport>(
    "WorldReport",
    worldReportSchema
  );

export default WorldReport;