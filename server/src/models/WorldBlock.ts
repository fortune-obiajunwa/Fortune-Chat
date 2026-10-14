import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IWorldBlock
  extends Document {
  userId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;

  type: "mute" | "block";

  countryCode: string;

  createdAt: Date;
  updatedAt: Date;
}

const worldBlockSchema =
  new Schema<IWorldBlock>(
    {
      /**
       * =========================================
       * USER PERFORMING THE ACTION
       * =========================================
       */

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /**
       * =========================================
       * USER BEING MUTED / BLOCKED
       * =========================================
       */

      targetUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /**
       * =========================================
       * ACTION TYPE
       * =========================================
       */

      type: {
        type: String,
        enum: [
          "mute",
          "block",
        ],
        required: true,
      },

      /**
       * =========================================
       * WORLD CHAT COUNTRY
       *
       * This keeps the action associated with
       * World Chat rather than private messaging.
       * =========================================
       */

      countryCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
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

/**
 * Prevent duplicate mute/block records.
 *
 * The same user cannot create the same
 * action against the same person repeatedly.
 */

worldBlockSchema.index(
  {
    userId: 1,
    targetUserId: 1,
    type: 1,
  },
  {
    unique: true,
  }
);

/**
 * Makes checking whether a user has muted
 * or blocked someone fast.
 */

worldBlockSchema.index({
  userId: 1,
  type: 1,
});

/**
 * Makes checking whether a particular
 * person is blocked/muted fast.
 */

worldBlockSchema.index({
  targetUserId: 1,
  type: 1,
});

const WorldBlock =
  mongoose.model<IWorldBlock>(
    "WorldBlock",
    worldBlockSchema
  );

export default WorldBlock;