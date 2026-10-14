import dns from "node:dns";
import path from "node:path";

import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";

import connectDB from "./config/db.js";

import User from "./models/user.js";
import Conversation from "./models/conversation.js";
import Message from "./models/message.js";

import WorldMessage from "./models/WorldMessage.js";
import WorldReport from "./models/WorldReport.js";
import WorldBlock from "./models/WorldBlock.js";

import generateToken from "./utils/generateToken.js";
import generateFortuneId from "./utils/generateFortuneId.js";

/*
=========================================
DNS CONFIGURATION
=========================================
*/

dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

dotenv.config();

const app = express();

const PORT = 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://192.168.0.168:5173",
      "http://192.168.0.168:5174",
    ],
    credentials: true,
  })
);

/*
=========================================
WORLD CHAT COUNTRIES
=========================================
*/

interface WorldCountry {
  code: string;
  name: string;
  flag: string;
}

const WORLD_COUNTRIES: WorldCountry[] = [
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
  },
  {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "🇲🇽",
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
  },
];

const getWorldCountry = (
  countryCode: string
): WorldCountry | null => {
  const normalizedCode =
    countryCode.trim().toUpperCase();

  return (
    WORLD_COUNTRIES.find(
      (country) =>
        country.code === normalizedCode
    ) || null
  );
};

/*
=========================================
UPLOAD STORAGE
=========================================
*/

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(
      null,
      path.join(
        process.cwd(),
        "uploads"
      )
    );
  },

  filename: (_req, file, cb) => {
    const extension =
      path.extname(
        file.originalname
      );

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(
      null,
      uniqueName
    );
  },
});

/*
=========================================
IMAGE UPLOAD
=========================================
*/

const imageUpload = multer({
  storage,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },

  fileFilter: (
    _req,
    file,
    cb
  ) => {
    if (
      file.mimetype.startsWith(
        "image/"
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files are allowed."
        )
      );
    }
  },
});

/*
=========================================
GENERAL FILE UPLOAD
=========================================
*/

const fileUpload = multer({
  storage,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },

  fileFilter: (
    _req,
    file,
    cb
  ) => {
    const allowedMimeTypes = [
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/octet-stream",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
    ];

    const isImage =
      file.mimetype.startsWith(
        "image/"
      );

    const isAllowed =
      allowedMimeTypes.includes(
        file.mimetype
      );

    if (
      isAllowed &&
      !isImage
    ) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "This file type is not supported."
      )
    );
  },
});

/*
=========================================
MIDDLEWARE
=========================================
*/



app.use(
  express.json({
    limit: "2mb",
  })
);

/*
=========================================
SERVE UPLOADED FILES
=========================================
*/

app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    )
  )
);

/*
=========================================
JWT AUTHENTICATION
=========================================
*/

interface AuthenticatedRequest
  extends Request {
  authenticatedUser?: {
    id: string;
    user: any;
  };
}

const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        message:
          "Authentication is required.",
      });
    }

    const token =
      authorization.substring(7);

    const secret =
      process.env.JWT_SECRET;

    if (!secret) {
      console.error(
        "JWT_SECRET is not defined."
      );

      return res.status(500).json({
        message:
          "Server authentication is not configured.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        secret
      ) as {
        userId?: string;
      };

    if (!decoded.userId) {
      return res.status(401).json({
        message:
          "Invalid authentication token.",
      });
    }

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(401).json({
        message:
          "The account associated with this token could not be found.",
      });
    }

    req.authenticatedUser = {
      id: user._id.toString(),
      user,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      message:
        "Your session is invalid or has expired. Please log in again.",
    });
  }
};

/*
=========================================
WORLD CHAT SPAM PROTECTION
=========================================
*/

const worldMessageTimestamps =
  new Map<string, number[]>();

const WORLD_SPAM_WINDOW_MS =
  10 * 1000;

const WORLD_MAX_MESSAGES_PER_WINDOW =
  5;

const checkWorldSpam = (
  userId: string
): boolean => {
  const now =
    Date.now();

  const previous =
    worldMessageTimestamps.get(
      userId
    ) || [];

  const recent =
    previous.filter(
      (timestamp) =>
        now - timestamp <
        WORLD_SPAM_WINDOW_MS
    );

  if (
    recent.length >=
    WORLD_MAX_MESSAGES_PER_WINDOW
  ) {
    worldMessageTimestamps.set(
      userId,
      recent
    );

    return true;
  }

  recent.push(now);

  worldMessageTimestamps.set(
    userId,
    recent
  );

  return false;
};

/*
=========================================
WORLD CHAT CONTENT FILTER
=========================================
*/

const blockedWorldWords = [
  "fuck",
  "fucking",
  "motherfucker",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "nigga",
  "cunt",
];

const containsBlockedWorldContent = (
  text: string
): boolean => {
  const normalized =
    text
      .toLowerCase()
      .replace(
        /[^a-z0-9\s]/g,
        " "
      );

  const words =
    normalized.split(
      /\s+/
    );

  return blockedWorldWords.some(
    (blockedWord) =>
      words.includes(
        blockedWord
      )
  );
};

/*
=========================================
WORLD CHAT PERSONAL INFORMATION FILTER
=========================================
*/

const containsPersonalInformation =
  (
    text: string
  ): boolean => {
    const emailPattern =
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

    const phonePattern =
      /\b(?:\+?\d[\d\s().-]{7,}\d)\b/;

    return (
      emailPattern.test(text) ||
      phonePattern.test(text)
    );
  };

/*
=========================================
HOME ROUTE
=========================================
*/

app.get(
  "/",
  (_req, res) => {
    res.json({
      message:
        "Fortune Chat server is running!",
    });
  }
);

/*
=========================================
REGISTER ROUTE
=========================================
*/

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        fullName,
        username,
        email,
        password,
        countryCode,
        countryName,
        countryFlag,
      } = req.body;

      if (
        !fullName ||
        !username ||
        !email ||
        !password ||
        !countryCode ||
        !countryName ||
        !countryFlag
      ) {
        return res.status(400).json({
          message:
            "All registration fields are required.",
        });
      }

      const selectedCountry =
        getWorldCountry(
          countryCode
        );

      if (!selectedCountry) {
        return res.status(400).json({
          message:
            "Please select a valid country.",
        });
      }

      const trimmedFullName =
        fullName.trim();

      const trimmedUsername =
        username
          .trim()
          .toLowerCase();

      const trimmedEmail =
        email
          .trim()
          .toLowerCase();

      const existingUser =
        await User.findOne({
          $or: [
            {
              username:
                trimmedUsername,
            },
            {
              email:
                trimmedEmail,
            },
          ],
        });

      if (existingUser) {
        if (
          existingUser.username ===
          trimmedUsername
        ) {
          return res.status(409).json({
            message:
              "That username is already taken.",
          });
        }

        if (
          existingUser.email ===
          trimmedEmail
        ) {
          return res.status(409).json({
            message:
              "An account with that email already exists.",
          });
        }
      }

      let fortuneId =
        generateFortuneId();

      let fortuneIdExists =
        await User.findOne({
          fortuneId,
        });

      while (fortuneIdExists) {
        fortuneId =
          generateFortuneId();

        fortuneIdExists =
          await User.findOne({
            fortuneId,
          });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({
          fullName:
            trimmedFullName,

          username:
            trimmedUsername,

          email:
            trimmedEmail,

          password:
            hashedPassword,

          fortuneId,

          countryCode:
            selectedCountry.code,

          countryName:
            selectedCountry.name,

          countryFlag:
            selectedCountry.flag,
        });

      return res.status(201).json({
        message:
          "Account created successfully!",

        user: {
          id: user._id,
          fullName:
            user.fullName,
          username:
            user.username,
          email:
            user.email,
          fortuneId:
            user.fortuneId,
          countryCode:
            user.countryCode,
          countryName:
            user.countryName,
          countryFlag:
            user.countryFlag,
        },
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while creating your account.",
      });
    }
  }
);

/*
=========================================
LOGIN ROUTE
=========================================
*/

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email and password are required.",
        });
      }

      const trimmedEmail =
        email
          .trim()
          .toLowerCase();

      const user =
        await User.findOne({
          email:
            trimmedEmail,
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      const passwordIsCorrect =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordIsCorrect) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      user.isOnline = true;

      user.lastSeen =
        new Date();

      if (!user.fortuneId) {
        let fortuneId =
          generateFortuneId();

        let fortuneIdExists =
          await User.findOne({
            fortuneId,
          });

        while (fortuneIdExists) {
          fortuneId =
            generateFortuneId();

          fortuneIdExists =
            await User.findOne({
              fortuneId,
            });
        }

        user.fortuneId =
          fortuneId;
      }

      /*
      =========================================
      IMPORTANT:
      SUPPORT OLDER ACCOUNTS
      =========================================

      Older accounts may not have the newer
      required country fields.

      validateModifiedOnly allows login to update
      online/lastSeen/fortuneId without forcing
      older accounts to provide country data
      before they explicitly choose a country.
      */

      await user.save({
        validateModifiedOnly: true,
      });

      const token =
        generateToken(
          user._id.toString()
        );

      return res.status(200).json({
        message:
          "Login successful!",

        token,

        user: {
          id: user._id,

          fullName:
            user.fullName,

          username:
            user.username,

          email:
            user.email,

          fortuneId:
            user.fortuneId,

          profilePicture:
            user.profilePicture,

          countryCode:
            user.countryCode,

          countryName:
            user.countryName,

          countryFlag:
            user.countryFlag,

          isOnline:
            user.isOnline,
        },
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while logging in.",
      });
    }
  }
);

/*
=========================================
UPDATE MY COUNTRY INFORMATION
=========================================
*/

app.patch(
  "/api/users/me/country",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        countryCode,
      } = req.body;

      if (!countryCode) {
        return res.status(400).json({
          message:
            "Country selection is required.",
        });
      }

      const selectedCountry =
        getWorldCountry(
          countryCode
        );

      if (!selectedCountry) {
        return res.status(400).json({
          message:
            "Please select a valid country.",
        });
      }

      const user =
        req.authenticatedUser!.user;

      user.countryCode =
        selectedCountry.code;

      user.countryName =
        selectedCountry.name;

      user.countryFlag =
        selectedCountry.flag;

      await user.save();

      return res.status(200).json({
        message:
          "Country information updated successfully.",

        user: {
          id: user._id,

          fullName:
            user.fullName,

          username:
            user.username,

          email:
            user.email,

          fortuneId:
            user.fortuneId,

          profilePicture:
            user.profilePicture,

          countryCode:
            user.countryCode,

          countryName:
            user.countryName,

          countryFlag:
            user.countryFlag,

          isOnline:
            user.isOnline,

          lastSeen:
            user.lastSeen,
        },
      });
    } catch (error) {
      console.error(
        "Update country error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while updating your country information.",
      });
    }
  }
);

/*
=========================================
USER SEARCH ROUTE
=========================================
*/

app.get(
  "/api/users/search",
  async (req, res) => {
    try {
      const search =
        String(
          req.query.q || ""
        ).trim();

      if (!search) {
        return res.status(400).json({
          message:
            "Please enter a name, username, or Fortune ID.",
        });
      }

      const users =
        await User.find({
          $or: [
            {
              fullName: {
                $regex:
                  search,
                $options:
                  "i",
              },
            },

            {
              username: {
                $regex:
                  search,
                $options:
                  "i",
              },
            },

            {
              fortuneId:
                search,
            },
          ],
        })
          .select(
            "fullName username fortuneId profilePicture isOnline lastSeen"
          )
          .limit(20);

      return res.status(200).json({
        users,
      });
    } catch (error) {
      console.error(
        "User search error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while searching for users.",
      });
    }
  }
);

/*
=========================================
CREATE OR FIND PRIVATE CONVERSATION
=========================================
*/

app.post(
  "/api/conversations",
  async (req, res) => {
    try {
      const {
        userId,
        otherUserId,
      } = req.body;

      if (
        !userId ||
        !otherUserId
      ) {
        return res.status(400).json({
          message:
            "Both user IDs are required.",
        });
      }

      if (
        userId ===
        otherUserId
      ) {
        return res.status(400).json({
          message:
            "You cannot start a conversation with yourself.",
        });
      }

      const users =
        await User.find({
          _id: {
            $in: [
              userId,
              otherUserId,
            ],
          },
        }).select(
          "fullName username fortuneId profilePicture isOnline lastSeen"
        );

      if (users.length !== 2) {
        return res.status(404).json({
          message:
            "One or both users could not be found.",
        });
      }

      const existingConversation =
        await Conversation.findOne({
          participants: {
            $all: [
              userId,
              otherUserId,
            ],
          },
        });

      if (
        existingConversation
      ) {
        return res.status(200).json({
          message:
            "Conversation already exists.",

          conversation:
            existingConversation,
        });
      }

      const conversation =
        await Conversation.create({
          participants: [
            userId,
            otherUserId,
          ],
        });

      return res.status(201).json({
        message:
          "Conversation created successfully.",

        conversation,
      });
    } catch (error) {
      console.error(
        "Conversation error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while creating the conversation.",
      });
    }
  }
);

/*
=========================================
GET USER CONVERSATIONS
=========================================
*/

app.get(
  "/api/conversations/:userId",
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required.",
        });
      }

      const conversations =
        await Conversation.find({
          participants:
            userId,
        })
          .populate(
            "participants",
            "fullName username fortuneId profilePicture isOnline lastSeen"
          )
          .sort({
            updatedAt: -1,
          });

      return res.status(200).json({
        conversations,
      });
    } catch (error) {
      console.error(
        "Get conversations error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading conversations.",
      });
    }
  }
);

/*
=========================================
UPLOAD IMAGE
=========================================
*/

app.post(
  "/api/uploads/image",
  imageUpload.single(
    "image"
  ),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "No image was uploaded.",
        });
      }

      const imageUrl =
        `/uploads/${req.file.filename}`;

      return res.status(201).json({
        message:
          "Image uploaded successfully.",

        imageUrl,

        fileName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        fileSize:
          req.file.size,
      });
    } catch (error) {
      console.error(
        "Image upload error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while uploading the image.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT IMAGE UPLOAD
=========================================
*/

app.post(
  "/api/world/uploads/image",
  requireAuth,
  imageUpload.single(
    "image"
  ),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "No image was uploaded.",
        });
      }

      const imageUrl =
        `/uploads/${req.file.filename}`;

      return res.status(201).json({
        message:
          "World Chat image uploaded successfully.",

        imageUrl,

        fileName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        fileSize:
          req.file.size,
      });
    } catch (error) {
      console.error(
        "World Chat image upload error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while uploading the World Chat image.",
      });
    }
  }
);

/*
=========================================
UPDATE PROFILE PICTURE
=========================================
*/

app.patch(
  "/api/users/:userId/profile-picture",
  imageUpload.single(
    "image"
  ),
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            "No image was uploaded.",
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      const imageUrl =
        `/uploads/${req.file.filename}`;

      user.profilePicture =
        imageUrl;

      await user.save();

      return res.status(200).json({
        message:
          "Profile picture updated successfully.",

        user: {
          id: user._id,

          fullName:
            user.fullName,

          username:
            user.username,

          email:
            user.email,

          fortuneId:
            user.fortuneId,

          profilePicture:
            user.profilePicture,

          countryCode:
            user.countryCode,

          countryName:
            user.countryName,

          countryFlag:
            user.countryFlag,

          isOnline:
            user.isOnline,

          lastSeen:
            user.lastSeen,
        },
      });
    } catch (error) {
      console.error(
        "Profile picture update error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while updating your profile picture.",
      });
    }
  }
);

/*
=========================================
UPLOAD GENERAL FILE
=========================================
*/

app.post(
  "/api/uploads/file",
  fileUpload.single(
    "file"
  ),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "No file was uploaded.",
        });
      }

      const fileUrl =
        `/uploads/${req.file.filename}`;

      return res.status(201).json({
        message:
          "File uploaded successfully.",

        fileUrl,

        fileName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        fileSize:
          req.file.size,
      });
    } catch (error) {
      console.error(
        "File upload error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while uploading the file.",
      });
    }
  }
);

/*
=========================================
SEND PRIVATE MESSAGE
=========================================
*/

app.post(
  "/api/messages",
  async (req, res) => {
    try {
      const {
        conversationId,
        senderId,
        receiverId,
        text,
        type,
        mediaUrl,
        fileName,
        mimeType,
        fileSize,
      } = req.body;

      if (
        !conversationId ||
        !senderId ||
        !receiverId
      ) {
        return res.status(400).json({
          message:
            "Conversation, sender, and receiver are required.",
        });
      }

      const messageType =
        type || "text";

      if (
        ![
          "text",
          "image",
          "file",
          "sticker",
          "voice",
        ].includes(
          messageType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid message type.",
        });
      }

      if (
        messageType ===
          "text" &&
        !text?.trim()
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      if (
        messageType ===
          "image" &&
        !mediaUrl
      ) {
        return res.status(400).json({
          message:
            "Image URL is required.",
        });
      }

      if (
        messageType ===
          "file" &&
        !mediaUrl
      ) {
        return res.status(400).json({
          message:
            "File URL is required.",
        });
      }

      if (
        messageType ===
          "sticker" &&
        !mediaUrl
      ) {
        return res.status(400).json({
          message:
            "Sticker URL is required.",
        });
      }

      if (
        messageType ===
          "voice" &&
        !mediaUrl
      ) {
        return res.status(400).json({
          message:
            "Voice message URL is required.",
        });
      }

      const conversation =
        await Conversation.findById(
          conversationId
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const senderIsParticipant =
        conversation.participants.some(
          (participant) =>
            participant.toString() ===
            senderId
        );

      if (
        !senderIsParticipant
      ) {
        return res.status(403).json({
          message:
            "You are not a participant in this conversation.",
        });
      }

      const receiverIsParticipant =
        conversation.participants.some(
          (participant) =>
            participant.toString() ===
            receiverId
        );

      if (
        !receiverIsParticipant
      ) {
        return res.status(400).json({
          message:
            "Receiver is not part of this conversation.",
        });
      }

      const message =
        await Message.create({
          conversationId,
          senderId,
          receiverId,

          type:
            messageType,

          text:
            text?.trim() || "",

          mediaUrl:
            mediaUrl || "",

          fileName:
            fileName || "",

          mimeType:
            mimeType || "",

          fileSize:
            fileSize || 0,
        });

      conversation.updatedAt =
        new Date();

      await conversation.save();

      return res.status(201).json({
        message:
          "Message sent successfully.",

        data: message,
      });
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while sending the message.",
      });
    }
  }
);

/*
=========================================
GET CONVERSATION MESSAGES
=========================================
*/

app.get(
  "/api/messages/:conversationId",
  async (req, res) => {
    try {
      const {
        conversationId,
      } = req.params;

      if (!conversationId) {
        return res.status(400).json({
          message:
            "Conversation ID is required.",
        });
      }

      const conversation =
        await Conversation.findById(
          conversationId
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const messages =
        await Message.find({
          conversationId,
        }).sort({
          createdAt: 1,
        });

      return res.status(200).json({
        messages,
      });
    } catch (error) {
      console.error(
        "Get messages error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading messages.",
      });
    }
  }
);

/*
=========================================
MARK MESSAGES AS READ
=========================================
*/

app.patch(
  "/api/messages/:conversationId/read/:userId",
  async (req, res) => {
    try {
      const {
        conversationId,
        userId,
      } = req.params;

      if (
        !conversationId ||
        !userId
      ) {
        return res.status(400).json({
          message:
            "Conversation ID and user ID are required.",
        });
      }

      const conversation =
        await Conversation.findById(
          conversationId
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const userIsParticipant =
        conversation.participants.some(
          (participant) =>
            participant.toString() ===
            userId
        );

      if (
        !userIsParticipant
      ) {
        return res.status(403).json({
          message:
            "You are not a participant in this conversation.",
        });
      }

      const result =
        await Message.updateMany(
          {
            conversationId,

            receiverId:
              userId,

            isRead:
              false,
          },

          {
            $set: {
              isRead:
                true,

              readAt:
                new Date(),
            },
          }
        );

      return res.status(200).json({
        message:
          "Messages marked as read.",

        count:
          result.modifiedCount,
      });
    } catch (error) {
      console.error(
        "Mark messages as read error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while marking messages as read.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - GET COUNTRY MESSAGES
=========================================
*/

app.get(
  "/api/world/messages/:countryCode",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const country =
        getWorldCountry(
          req.params.countryCode
        );

      if (!country) {
        return res.status(400).json({
          message:
            "That World Chat country does not exist.",
        });
      }

      const currentUserId =
        req.authenticatedUser!.id;

      const blockedUsers =
        await WorldBlock.find({
          userId:
            currentUserId,

          type:
            "block",
        }).select(
          "targetUserId"
        );

      const mutedUsers =
        await WorldBlock.find({
          userId:
            currentUserId,

          type:
            "mute",
        }).select(
          "targetUserId"
        );

      const ignoredUserIds = [
        ...blockedUsers.map(
          (block) =>
            block.targetUserId
        ),

        ...mutedUsers.map(
          (mute) =>
            mute.targetUserId
        ),
      ];

      const messages =
        await WorldMessage.find({
          countryCode:
            country.code,

          senderId: {
            $nin:
              ignoredUserIds,
          },
        })
          .populate(
            "senderId",
            "fullName username fortuneId profilePicture"
          )
          .sort({
            createdAt: 1,
          })
          .limit(100);

      const safeMessages =
        messages.map(
          (message: any) => {
            const messageObject =
              message.toObject();

            if (
              messageObject.moderationStatus !==
                "visible" ||
              messageObject.isSpam
            ) {
              messageObject.text =
                "***";

              messageObject.mediaUrl =
                "";

              messageObject.fileName =
                "";

              messageObject.mimeType =
                "";

              messageObject.fileSize =
                0;
            }

            return messageObject;
          }
        );

      return res.status(200).json({
        country: {
          code:
            country.code,

          name:
            country.name,

          flag:
            country.flag,
        },

        messages:
          safeMessages,
      });
    } catch (error) {
      console.error(
        "World Chat messages error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading World Chat.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - SEND MESSAGE
=========================================
*/

app.post(
  "/api/world/messages",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        countryCode,
        type,
        text,
        mediaUrl,
        fileName,
        mimeType,
        fileSize,
      } = req.body;

      const authenticatedUser =
        req.authenticatedUser!;

      const user =
        authenticatedUser.user;

      const country =
        getWorldCountry(
          countryCode || ""
        );

      if (!country) {
        return res.status(400).json({
          message:
            "Please select a valid World Chat country.",
        });
      }

      /*
      -----------------------------------------
      VERIFY ACCOUNT COUNTRY
      -----------------------------------------
      */

      const userCountry =
        getWorldCountry(
          user.countryCode || ""
        );

      if (!userCountry) {
        return res.status(400).json({
          message:
            "Please complete your country information before using World Chat.",
        });
      }

      /*
      -----------------------------------------
      ONLY TEXT / IMAGE / STICKER
      -----------------------------------------
      */

      if (
        ![
          "text",
          "image",
          "sticker",
        ].includes(
          type
        )
      ) {
        return res.status(400).json({
          message:
            "World Chat only supports text, images, and stickers.",
        });
      }

      /*
      -----------------------------------------
      SPAM CHECK
      -----------------------------------------
      */

      if (
        checkWorldSpam(
          authenticatedUser.id
        )
      ) {
        return res.status(429).json({
          message:
            "You are sending messages too quickly. Please slow down.",
        });
      }

      /*
      -----------------------------------------
      TEXT VALIDATION
      -----------------------------------------
      */

      const cleanText =
        typeof text ===
        "string"
          ? text.trim()
          : "";

      if (
        type ===
          "text" &&
        !cleanText
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      if (
        cleanText.length >
        1000
      ) {
        return res.status(400).json({
          message:
            "World Chat messages cannot exceed 1000 characters.",
        });
      }

      /*
      -----------------------------------------
      MEDIA VALIDATION
      -----------------------------------------
      */

      if (
        (
          type ===
            "image" ||
          type ===
            "sticker"
        ) &&
        !mediaUrl
      ) {
        return res.status(400).json({
          message:
            "Media URL is required.",
        });
      }

      /*
      -----------------------------------------
      CONTENT MODERATION
      -----------------------------------------
      */

      const containsBadContent =
        containsBlockedWorldContent(
          cleanText
        );

      const containsPrivateInfo =
        containsPersonalInformation(
          cleanText
        );

      const shouldHide =
        containsBadContent ||
        containsPrivateInfo;

      let moderationReason =
        "";

      if (
        containsBadContent
      ) {
        moderationReason =
          "inappropriate_content";
      } else if (
        containsPrivateInfo
      ) {
        moderationReason =
          "personal_information";
      }

      /*
      -----------------------------------------
      CREATE WORLD MESSAGE
      -----------------------------------------
      */

      const worldMessage =
        await WorldMessage.create({
          countryCode:
            country.code,

          countryName:
            country.name,

          senderId:
            user._id,

          type,

          text:
            shouldHide
              ? "***"
              : cleanText,

          mediaUrl:
            shouldHide
              ? ""
              : mediaUrl || "",

          fileName:
            shouldHide
              ? ""
              : fileName || "",

          mimeType:
            shouldHide
              ? ""
              : mimeType || "",

          fileSize:
            shouldHide
              ? 0
              : fileSize || 0,

          senderCountryCode:
            userCountry.code,

          senderCountryName:
            userCountry.name,

          senderCountryFlag:
            userCountry.flag,

          moderationStatus:
            shouldHide
              ? "hidden"
              : "visible",

          moderationReason,

          reportCount:
            0,

          isSpam:
            false,
        });

      const populatedMessage =
        await WorldMessage.findById(
          worldMessage._id
        ).populate(
          "senderId",
          "fullName username fortuneId profilePicture"
        );

      return res.status(201).json({
        message:
          "World message sent successfully.",

        data:
          populatedMessage,
      });
    } catch (error) {
      console.error(
        "World Chat send message error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while sending the World Chat message.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - REPORT MESSAGE
=========================================
*/

app.post(
  "/api/world/reports/message",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        messageId,
        reason,
        details,
      } = req.body;

      const reporterId =
        req.authenticatedUser!.id;

      if (
        !messageId ||
        !reason
      ) {
        return res.status(400).json({
          message:
            "Message ID and report reason are required.",
        });
      }

      const validReasons = [
        "spam",
        "harassment",
        "inappropriate",
        "scam",
        "personal_information",
        "other",
      ];

      if (
        !validReasons.includes(
          reason
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid report reason.",
        });
      }

      const worldMessage =
        await WorldMessage.findById(
          messageId
        );

      if (!worldMessage) {
        return res.status(404).json({
          message:
            "World Chat message not found.",
        });
      }

      if (
        worldMessage.senderId.toString() ===
        reporterId
      ) {
        return res.status(400).json({
          message:
            "You cannot report your own message.",
        });
      }

      const existingReport =
        await WorldReport.findOne({
          reporterId,
          messageId,
        });

      if (existingReport) {
        return res.status(409).json({
          message:
            "You have already reported this message.",
        });
      }

      const report =
        await WorldReport.create({
          reporterId,

          reportedUserId:
            worldMessage.senderId,

          messageId,

          countryCode:
            worldMessage.countryCode,

          targetType:
            "message",

          reason,

          details:
            typeof details ===
            "string"
              ? details
                  .trim()
                  .slice(
                    0,
                    1000
                  )
              : "",

          status:
            "pending",
        });

      worldMessage.reportCount +=
        1;

      /*
      -----------------------------------------
      AUTOMATIC HIDE AFTER MULTIPLE REPORTS
      -----------------------------------------
      */

      if (
        worldMessage.reportCount >=
        3
      ) {
        worldMessage.moderationStatus =
          "hidden";

        worldMessage.moderationReason =
          "multiple_reports";
      }

      await worldMessage.save();

      return res.status(201).json({
        message:
          "Report submitted successfully.",

        reportId:
          report._id,
      });
    } catch (error) {
      console.error(
        "World message report error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while reporting the message.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - REPORT USER
=========================================
*/

app.post(
  "/api/world/reports/user",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        reportedUserId,
        countryCode,
        reason,
        details,
      } = req.body;

      const reporterId =
        req.authenticatedUser!.id;

      if (
        !reportedUserId ||
        !countryCode ||
        !reason
      ) {
        return res.status(400).json({
          message:
            "User, country, and report reason are required.",
        });
      }

      if (
        reporterId ===
        reportedUserId
      ) {
        return res.status(400).json({
          message:
            "You cannot report yourself.",
        });
      }

      const country =
        getWorldCountry(
          countryCode
        );

      if (!country) {
        return res.status(400).json({
          message:
            "Invalid World Chat country.",
        });
      }

      const validReasons = [
        "spam",
        "harassment",
        "inappropriate",
        "scam",
        "personal_information",
        "other",
      ];

      if (
        !validReasons.includes(
          reason
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid report reason.",
        });
      }

      const reportedUser =
        await User.findById(
          reportedUserId
        );

      if (!reportedUser) {
        return res.status(404).json({
          message:
            "The reported user could not be found.",
        });
      }

      const report =
        await WorldReport.create({
          reporterId,

          reportedUserId,

          countryCode:
            country.code,

          targetType:
            "user",

          reason,

          details:
            typeof details ===
            "string"
              ? details
                  .trim()
                  .slice(
                    0,
                    1000
                  )
              : "",

          status:
            "pending",
        });

      return res.status(201).json({
        message:
          "User report submitted successfully.",

        reportId:
          report._id,
      });
    } catch (error) {
      console.error(
        "World user report error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while reporting the user.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - MUTE USER
=========================================
*/

app.post(
  "/api/world/mute",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        targetUserId,
        countryCode,
      } = req.body;

      const userId =
        req.authenticatedUser!.id;

      if (
        !targetUserId ||
        !countryCode
      ) {
        return res.status(400).json({
          message:
            "Target user and country are required.",
        });
      }

      if (
        targetUserId ===
        userId
      ) {
        return res.status(400).json({
          message:
            "You cannot mute yourself.",
        });
      }

      const country =
        getWorldCountry(
          countryCode
        );

      if (!country) {
        return res.status(400).json({
          message:
            "Invalid World Chat country.",
        });
      }

      const targetUser =
        await User.findById(
          targetUserId
        );

      if (!targetUser) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      const existingMute =
        await WorldBlock.findOne({
          userId,

          targetUserId,

          type:
            "mute",
        });

      if (existingMute) {
        return res.status(200).json({
          message:
            "User is already muted.",
        });
      }

      await WorldBlock.create({
        userId,

        targetUserId,

        type:
          "mute",

        countryCode:
          country.code,
      });

      return res.status(201).json({
        message:
          "User muted successfully.",
      });
    } catch (error) {
      console.error(
        "World mute error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while muting the user.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - UNMUTE USER
=========================================
*/

app.delete(
  "/api/world/mute/:targetUserId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.authenticatedUser!.id;

      const {
        targetUserId,
      } = req.params;

      await WorldBlock.deleteOne({
        userId,

        targetUserId,

        type:
          "mute",
      });

      return res.status(200).json({
        message:
          "User unmuted successfully.",
      });
    } catch (error) {
      console.error(
        "World unmute error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while unmuting the user.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - BLOCK USER
=========================================
*/

app.post(
  "/api/world/block",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        targetUserId,
        countryCode,
      } = req.body;

      const userId =
        req.authenticatedUser!.id;

      if (
        !targetUserId ||
        !countryCode
      ) {
        return res.status(400).json({
          message:
            "Target user and country are required.",
        });
      }

      if (
        targetUserId ===
        userId
      ) {
        return res.status(400).json({
          message:
            "You cannot block yourself.",
        });
      }

      const country =
        getWorldCountry(
          countryCode
        );

      if (!country) {
        return res.status(400).json({
          message:
            "Invalid World Chat country.",
        });
      }

      const targetUser =
        await User.findById(
          targetUserId
        );

      if (!targetUser) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      const existingBlock =
        await WorldBlock.findOne({
          userId,

          targetUserId,

          type:
            "block",
        });

      if (existingBlock) {
        return res.status(200).json({
          message:
            "User is already blocked.",
        });
      }

      await WorldBlock.create({
        userId,

        targetUserId,

        type:
          "block",

        countryCode:
          country.code,
      });

      return res.status(201).json({
        message:
          "User blocked successfully.",
      });
    } catch (error) {
      console.error(
        "World block error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while blocking the user.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - UNBLOCK USER
=========================================
*/

app.delete(
  "/api/world/block/:targetUserId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.authenticatedUser!.id;

      const {
        targetUserId,
      } = req.params;

      await WorldBlock.deleteOne({
        userId,

        targetUserId,

        type:
          "block",
      });

      return res.status(200).json({
        message:
          "User unblocked successfully.",
      });
    } catch (error) {
      console.error(
        "World unblock error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while unblocking the user.",
      });
    }
  }
);

/*
=========================================
WORLD CHAT - GET USER'S MUTES/BLOCKS
=========================================
*/

app.get(
  "/api/world/blocks",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const userId =
        req.authenticatedUser!.id;

      const blocks =
        await WorldBlock.find({
          userId,
        }).populate(
          "targetUserId",
          "fullName username fortuneId profilePicture"
        );

      return res.status(200).json({
        blocks,
      });
    } catch (error) {
      console.error(
        "World blocks error:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading your World Chat restrictions.",
      });
    }
  }
);

/*
=========================================
ERROR HANDLER
=========================================
*/

app.use(
  (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "Server error:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message:
            "The uploaded file is too large. Maximum size is 10MB.",
        });
      }

      return res.status(400).json({
        message:
          error.message,
      });
    }

    if (
      error?.message ===
      "Only image files are allowed."
    ) {
      return res.status(400).json({
        message:
          "Only image files are allowed.",
      });
    }

    if (
      error?.message ===
      "This file type is not supported."
    ) {
      return res.status(400).json({
        message:
          "This file type is not supported.",
      });
    }

    return res.status(500).json({
      message:
        "Something went wrong on the server.",
    });
  }
);

/*
=========================================
START SERVER
=========================================
*/

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Fortune Chat server running on http://localhost:${PORT}`
    );

    console.log(
      `Fortune Chat network access on http://192.168.0.168:${PORT}`
    );
  });
};

startServer();