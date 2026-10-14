import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface WorldSender {
  _id: string;
  fullName: string;
  username: string;
  fortuneId: string;
  profilePicture?: string;
}

interface WorldMessage {
  _id: string;
  countryCode: string;
  countryName: string;
  senderId:
    | string
    | WorldSender
    | null
    | undefined;
  type: "text" | "image" | "sticker";
  text: string;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  senderCountryCode: string;
  senderCountryName: string;
  senderCountryFlag: string;
  moderationStatus:
    | "visible"
    | "hidden"
    | "removed";
  moderationReason?: string;
  reportCount: number;
  isSpam: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlockedUser {
  _id: string;
  userId: string;
  targetUserId: string;
  type: "mute" | "block";
  countryCode: string;
}

interface StoredUser {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  email?: string;
  fortuneId?: string;
  profilePicture?: string;
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface WorldChatProps {
  onBackToChat: () => void;
}

import { API_BASE_URL as API_URL } from "../config/api";

const countries: Country[] = [
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

const stickers = [
  "😂",
  "❤️",
  "🔥",
  "😍",
  "🥳",
  "😭",
  "🤣",
  "😎",
  "👏",
  "🙏",
  "💯",
  "🎉",
];

const reportReasons = [
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
  },
  {
    value: "scam",
    label: "Scam",
  },
  {
    value: "personal_information",
    label: "Personal information",
  },
  {
    value: "other",
    label: "Other",
  },
] as const;

type ReportReason =
  (typeof reportReasons)[number]["value"];

function getToken(): string | null {
  return localStorage.getItem(
    "fortuneChatToken"
  );
}

function getStoredUser(): StoredUser | null {
  const storedUser =
    localStorage.getItem(
      "fortuneChatUser"
    );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(
      storedUser
    ) as StoredUser;
  } catch {
    return null;
  }
}

function getStoredUserId(): string | null {
  const user = getStoredUser();

  if (!user) {
    return null;
  }

  return user._id || user.id || null;
}

function getSenderId(
  senderId:
    | string
    | WorldSender
    | null
    | undefined
): string {
  if (!senderId) {
    return "";
  }

  if (
    typeof senderId ===
    "string"
  ) {
    return senderId;
  }

  if (
    typeof senderId ===
      "object" &&
    typeof senderId._id ===
      "string"
  ) {
    return senderId._id;
  }

  return "";
}

function getSender(
  senderId:
    | string
    | WorldSender
    | null
    | undefined
): WorldSender | null {
  if (
    senderId &&
    typeof senderId ===
      "object" &&
    typeof senderId._id ===
      "string"
  ) {
    return senderId;
  }

  return null;
}

function isValidWorldMessage(
  value: unknown
): value is WorldMessage {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const message =
    value as Partial<WorldMessage>;

  return (
    typeof message._id ===
      "string" &&
    message._id.length > 0
  );
}

function getMediaUrl(
  url?: string
): string {
  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/${url}`;
}

function formatMessageTime(
  createdAt: string
): string {
  const date =
    new Date(createdAt);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function WorldChat({
  onBackToChat,
}: WorldChatProps) {
  const [search, setSearch] =
    useState("");

  const [
    selectedCountry,
    setSelectedCountry,
  ] = useState<Country | null>(
    null
  );

  const [messages, setMessages] =
    useState<WorldMessage[]>([]);

  const [messageText, setMessageText] =
    useState("");

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    showStickerPicker,
    setShowStickerPicker,
  ] = useState(false);

  const [
    openMenuId,
    setOpenMenuId,
  ] = useState<string | null>(
    null
  );

  const [
    showReportModal,
    setShowReportModal,
  ] = useState(false);

  const [
    reportTarget,
    setReportTarget,
  ] = useState<{
    type: "message" | "user";
    messageId?: string;
    userId: string;
  } | null>(null);

  const [
    selectedReportReason,
    setSelectedReportReason,
  ] = useState<ReportReason>(
    "spam"
  );

  const [
    reportDetails,
    setReportDetails,
  ] = useState("");

  const [reporting, setReporting] =
    useState(false);

  const [
    blockedUsers,
    setBlockedUsers,
  ] = useState<BlockedUser[]>([]);

  const [
    changingBlock,
    setChangingBlock,
  ] = useState(false);

  const [
    changingMute,
    setChangingMute,
  ] = useState(false);

  const [
    showCountrySetup,
    setShowCountrySetup,
  ] = useState(false);

  const [
    countrySetupSearch,
    setCountrySetupSearch,
  ] = useState("");

  const [
    setupCountry,
    setSetupCountry,
  ] = useState<Country | null>(
    null
  );

  const [
    savingCountry,
    setSavingCountry,
  ] = useState(false);

  const imageInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const storedUser =
    getStoredUser();

  const currentUserId =
    getStoredUserId();

  const hasUserCountry =
    Boolean(
      storedUser?.countryCode &&
        storedUser?.countryName &&
        storedUser?.countryFlag
    );

  const filteredCountries =
    countries.filter(
      (country) =>
        country.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  const filteredSetupCountries =
    countries.filter(
      (country) =>
        country.name
          .toLowerCase()
          .includes(
            countrySetupSearch.toLowerCase()
          )
    );

  const scrollToBottom =
    () => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior: "smooth",
        }
      );
    };

  /*
  =========================================
  CHECK USER COUNTRY
  =========================================
  */

  useEffect(() => {
    const user =
      getStoredUser();

    const countryIsMissing =
      !user?.countryCode ||
      !user?.countryName ||
      !user?.countryFlag;

    if (countryIsMissing) {
      setShowCountrySetup(
        true
      );
    }
  }, []);

  /*
  =========================================
  LOAD BLOCKS
  =========================================
  */

  const loadBlocks =
    async () => {
      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/world/blocks`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          return;
        }

        setBlockedUsers(
          Array.isArray(
            data.blocks
          )
            ? data.blocks
            : []
        );
      } catch {
        /*
         * Block information is optional
         * for displaying the room.
         */
      }
    };

  /*
  =========================================
  LOAD WORLD MESSAGES
  =========================================
  */

  const loadMessages =
    async (
      countryCode: string
    ) => {
      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      setLoadingMessages(
        true
      );

      setError("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/world/messages/${countryCode}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load World Chat messages."
          );
        }

        const incomingMessages =
          Array.isArray(
            data.messages
          )
            ? data.messages.filter(
                isValidWorldMessage
              )
            : [];

        setMessages(
          incomingMessages
        );

        setTimeout(
          scrollToBottom,
          50
        );
      } catch (
        requestError
      ) {
        setMessages([]);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load World Chat messages."
        );
      } finally {
        setLoadingMessages(
          false
        );
      }
    };

  /*
  =========================================
  LOAD ROOM WHEN COUNTRY CHANGES
  =========================================
  */

  useEffect(() => {
    if (!selectedCountry) {
      setMessages([]);
      return;
    }

    setShowStickerPicker(
      false
    );

    setOpenMenuId(null);
    setError("");

    loadMessages(
      selectedCountry.code
    );

    loadBlocks();
  }, [selectedCountry]);

  /*
  =========================================
  AUTO SCROLL
  =========================================
  */

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        scrollToBottom,
        50
      );
    }
  }, [messages.length]);

  /*
  =========================================
  SELECT ROOM
  =========================================
  */

  const selectCountry = (
    country: Country
  ) => {
    setSelectedCountry(
      country
    );

    setSearch("");
  };

  /*
  =========================================
  CHANGE ROOM
  =========================================
  */

  const changeCountry = () => {
    setSelectedCountry(
      null
    );

    setMessages([]);
    setMessageText("");

    setShowStickerPicker(
      false
    );

    setOpenMenuId(null);
    setError("");
  };

  /*
  =========================================
  SAVE USER COUNTRY
  =========================================
  */

  const saveUserCountry =
    async () => {
      if (!setupCountry) {
        setError(
          "Please select your country first."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      setSavingCountry(
        true
      );

      setError("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/users/me/country`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                countryCode:
                  setupCountry.code,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to save your country."
          );
        }

        if (data.user) {
          localStorage.setItem(
            "fortuneChatUser",
            JSON.stringify(
              data.user
            )
          );
        } else {
          const currentUser =
            getStoredUser();

          if (currentUser) {
            const updatedUser =
              {
                ...currentUser,
                countryCode:
                  setupCountry.code,
                countryName:
                  setupCountry.name,
                countryFlag:
                  setupCountry.flag,
              };

            localStorage.setItem(
              "fortuneChatUser",
              JSON.stringify(
                updatedUser
              )
            );
          }
        }

        setShowCountrySetup(
          false
        );

        setCountrySetupSearch(
          ""
        );

        setSetupCountry(
          null
        );

        if (selectedCountry) {
          await loadMessages(
            selectedCountry.code
          );

          await loadBlocks();
        }
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save your country."
        );
      } finally {
        setSavingCountry(
          false
        );
      }
    };

  /*
  =========================================
  ADD SERVER MESSAGE SAFELY
  =========================================
  */

  const appendServerMessage =
    (
      incomingMessage: unknown
    ) => {
      if (
        !isValidWorldMessage(
          incomingMessage
        )
      ) {
        return false;
      }

      setMessages(
        (current) => {
          const exists =
            current.some(
              (message) =>
                message._id ===
                incomingMessage._id
            );

          if (exists) {
            return current;
          }

          return [
            ...current,
            incomingMessage,
          ];
        }
      );

      return true;
    };

  /*
  =========================================
  SEND TEXT MESSAGE
  =========================================
  */

  const sendMessage =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (!selectedCountry) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      const text =
        messageText.trim();

      if (!text) {
        return;
      }

      if (!hasUserCountry) {
        setShowCountrySetup(
          true
        );

        return;
      }

      if (sendingMessage) {
        return;
      }

      setSendingMessage(
        true
      );

      setError("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/world/messages`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                countryCode:
                  selectedCountry.code,
                type: "text",
                text,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to send your message."
          );
        }

        const appended =
          appendServerMessage(
            data.message
          );

        if (
          !appended &&
          selectedCountry
        ) {
          await loadMessages(
            selectedCountry.code
          );
        }

        setMessageText("");

        setShowStickerPicker(
          false
        );

        setOpenMenuId(null);

        setTimeout(
          scrollToBottom,
          100
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to send your message."
        );
      } finally {
        setSendingMessage(
          false
        );
      }
    };

  /*
  =========================================
  SEND STICKER
  =========================================
  */

  const sendSticker =
    async (
      sticker: string
    ) => {
      if (!selectedCountry) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      if (!hasUserCountry) {
        setShowCountrySetup(
          true
        );

        return;
      }

      if (sendingMessage) {
        return;
      }

      setSendingMessage(
        true
      );

      setError("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/world/messages`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                countryCode:
                  selectedCountry.code,
                type: "sticker",
                text: "",
                mediaUrl:
                  `emoji:${sticker}`,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to send sticker."
          );
        }

        const appended =
          appendServerMessage(
            data.message
          );

        if (
          !appended &&
          selectedCountry
        ) {
          await loadMessages(
            selectedCountry.code
          );
        }

        setShowStickerPicker(
          false
        );

        setOpenMenuId(null);

        setTimeout(
          scrollToBottom,
          100
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to send sticker."
        );
      } finally {
        setSendingMessage(
          false
        );
      }
    };

  /*
  =========================================
  IMAGE BUTTON
  =========================================
  */

  const handleImageButton =
    () => {
      if (!hasUserCountry) {
        setShowCountrySetup(
          true
        );

        return;
      }

      imageInputRef.current?.click();
    };

  /*
  =========================================
  IMAGE UPLOAD
  =========================================
  */

  const handleImageUpload =
    async (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (
        !file ||
        !selectedCountry
      ) {
        return;
      }

      if (!hasUserCountry) {
        setShowCountrySetup(
          true
        );

        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setError(
          "Please select an image file."
        );

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        setError(
          "Images must be 10 MB or smaller."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      if (uploadingImage) {
        return;
      }

      setUploadingImage(
        true
      );

      setError("");

      try {
        const formData =
          new FormData();

        formData.append(
          "image",
          file
        );

        const uploadResponse =
          await fetch(
            `${API_URL}/api/world/uploads/image`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              body: formData,
            }
          );

        const uploadData =
          await uploadResponse.json();

        if (
          !uploadResponse.ok
        ) {
          throw new Error(
            uploadData.message ||
              "Image upload failed."
          );
        }

        const mediaUrl =
          uploadData.url ||
          uploadData.mediaUrl ||
          uploadData.imageUrl;

        if (!mediaUrl) {
          throw new Error(
            "The server did not return an image URL."
          );
        }

        const messageResponse =
          await fetch(
            `${API_URL}/api/world/messages`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                countryCode:
                  selectedCountry.code,
                type: "image",
                text: "",
                mediaUrl,
                fileName:
                  file.name,
                mimeType:
                  file.type,
                fileSize:
                  file.size,
              }),
            }
          );

        const messageData =
          await messageResponse.json();

        if (
          !messageResponse.ok
        ) {
          throw new Error(
            messageData.message ||
              "Unable to send image."
          );
        }

        const appended =
          appendServerMessage(
            messageData.message
          );

        if (
          !appended &&
          selectedCountry
        ) {
          await loadMessages(
            selectedCountry.code
          );
        }

        setShowStickerPicker(
          false
        );

        setOpenMenuId(null);

        setTimeout(
          scrollToBottom,
          100
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to send image."
        );
      } finally {
        setUploadingImage(
          false
        );
      }
    };

  /*
  =========================================
  OPEN REPORT
  =========================================
  */

  const openReport = (
    type: "message" | "user",
    userId: string,
    messageId?: string
  ) => {
    if (!userId) {
      return;
    }

    setReportTarget({
      type,
      userId,
      messageId,
    });

    setSelectedReportReason(
      "spam"
    );

    setReportDetails("");

    setOpenMenuId(null);

    setShowReportModal(
      true
    );
  };

  /*
  =========================================
  SUBMIT REPORT
  =========================================
  */

  const submitReport =
    async () => {
      if (
        !reportTarget ||
        !selectedCountry
      ) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      setReporting(true);
      setError("");

      try {
        const endpoint =
          reportTarget.type ===
          "message"
            ? `${API_URL}/api/world/reports/message`
            : `${API_URL}/api/world/reports/user`;

        const body =
          reportTarget.type ===
          "message"
            ? {
                messageId:
                  reportTarget.messageId,
                reason:
                  selectedReportReason,
                details:
                  reportDetails.trim(),
              }
            : {
                reportedUserId:
                  reportTarget.userId,
                countryCode:
                  selectedCountry.code,
                reason:
                  selectedReportReason,
                details:
                  reportDetails.trim(),
              };

        const response =
          await fetch(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify(
                body
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to submit report."
          );
        }

        setShowReportModal(
          false
        );

        setReportTarget(null);

        setReportDetails("");
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to submit report."
        );
      } finally {
        setReporting(false);
      }
    };

  /*
  =========================================
  GET USER RELATIONSHIP
  =========================================
  */

  const getRelationship = (
    userId: string
  ) => {
    if (!userId) {
      return null;
    }

    const block =
      blockedUsers.find(
        (item) =>
          item.targetUserId ===
          userId
      );

    return (
      block?.type || null
    );
  };

  /*
  =========================================
  TOGGLE MUTE
  =========================================
  */

  const toggleMute = async (
    targetUserId: string
  ) => {
    const token =
      getToken();

    if (
      !token ||
      !selectedCountry ||
      !targetUserId
    ) {
      return;
    }

    setChangingMute(
      true
    );

    setError("");

    try {
      const relationship =
        getRelationship(
          targetUserId
        );

      if (
        relationship ===
        "mute"
      ) {
        const response =
          await fetch(
            `${API_URL}/api/world/mute/${targetUserId}`,
            {
              method:
                "DELETE",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to unmute user."
          );
        }
      } else {
        const response =
          await fetch(
            `${API_URL}/api/world/mute`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                targetUserId,
                countryCode:
                  selectedCountry.code,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to mute user."
          );
        }
      }

      await loadBlocks();

      setOpenMenuId(
        null
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update mute status."
      );
    } finally {
      setChangingMute(
        false
      );
    }
  };

  /*
  =========================================
  TOGGLE BLOCK
  =========================================
  */

  const toggleBlock = async (
    targetUserId: string
  ) => {
    const token =
      getToken();

    if (
      !token ||
      !selectedCountry ||
      !targetUserId
    ) {
      return;
    }

    setChangingBlock(
      true
    );

    setError("");

    try {
      const relationship =
        getRelationship(
          targetUserId
        );

      if (
        relationship ===
        "block"
      ) {
        const response =
          await fetch(
            `${API_URL}/api/world/block/${targetUserId}`,
            {
              method:
                "DELETE",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to unblock user."
          );
        }
      } else {
        const response =
          await fetch(
            `${API_URL}/api/world/block`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                targetUserId,
                countryCode:
                  selectedCountry.code,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to block user."
          );
        }
      }

      await loadBlocks();

      setOpenMenuId(
        null
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update block status."
      );
    } finally {
      setChangingBlock(
        false
      );
    }
  };

  /*
  =========================================
  RENDER MESSAGE
  =========================================
  */

  const renderMessage = (
    message: WorldMessage
  ) => {
    if (
      !message ||
      typeof message !==
        "object" ||
      !message._id
    ) {
      return null;
    }

    const sender =
      getSender(
        message.senderId
      );

    const senderId =
      getSenderId(
        message.senderId
      );

    if (!senderId) {
      return null;
    }

    const isMine =
      currentUserId ===
      senderId;

    const relationship =
      getRelationship(
        senderId
      );

    const senderName =
      sender?.fullName ||
      "Fortune Chat User";

    const senderUsername =
      sender?.username
        ? `@${sender.username}`
        : "";

    const senderFortuneId =
      sender?.fortuneId
        ? `FC-${sender.fortuneId}`
        : "";

    const profilePicture =
      sender?.profilePicture
        ? getMediaUrl(
            sender.profilePicture
          )
        : "";

    const sticker =
      message.mediaUrl?.startsWith(
        "emoji:"
      )
        ? message.mediaUrl.replace(
            "emoji:",
            ""
          )
        : null;

    const hidden =
      message.moderationStatus !==
        "visible" ||
      message.isSpam;

    return (
      <div
        key={message._id}
        className={`world-message-row ${
          isMine
            ? "world-message-row-own"
            : ""
        } ${
          relationship ===
          "block"
            ? "world-message-blocked"
            : ""
        }`}
      >
        {!isMine && (
          <div className="world-message-avatar">
            {profilePicture ? (
              <img
                src={
                  profilePicture
                }
                alt={
                  senderName
                }
              />
            ) : (
              <span>
                {message.senderCountryFlag ||
                  "🌍"}
              </span>
            )}
          </div>
        )}

        <div
          className={`world-message-content ${
            isMine
              ? "world-message-content-own"
              : ""
          }`}
        >
          {!isMine && (
            <div className="world-message-sender">
              <strong>
                {senderName}
              </strong>

              <span>
                {
                  message.senderCountryFlag
                }{" "}
                {senderUsername}
              </span>

              {senderFortuneId && (
                <small>
                  {senderFortuneId}
                </small>
              )}
            </div>
          )}

          <div
            className={`world-message-bubble ${
              isMine
                ? "world-message-bubble-own"
                : ""
            }`}
          >
            {hidden ? (
              <div className="world-message-hidden">
                <span>
                  ⚠️
                </span>

                <p>
                  This message is no
                  longer available.
                </p>
              </div>
            ) : message.type ===
                "image" &&
              message.mediaUrl ? (
              <img
                className="world-message-image"
                src={getMediaUrl(
                  message.mediaUrl
                )}
                alt={
                  message.fileName ||
                  "World Chat image"
                }
              />
            ) : message.type ===
                "sticker" &&
              sticker ? (
              <div className="world-message-sticker">
                {sticker}
              </div>
            ) : (
              <p className="world-message-text">
                {message.text}
              </p>
            )}

            <div className="world-message-meta">
              <span>
                {formatMessageTime(
                  message.createdAt
                )}
              </span>

              {!isMine && (
                <button
                  type="button"
                  className="world-message-menu-button"
                  aria-label="Message options"
                  onClick={() =>
                    setOpenMenuId(
                      openMenuId ===
                        message._id
                        ? null
                        : message._id
                    )
                  }
                >
                  ⋮
                </button>
              )}
            </div>
          </div>

          {openMenuId ===
            message._id &&
            !isMine && (
              <div className="world-message-menu">
                <button
                  type="button"
                  onClick={() =>
                    openReport(
                      "message",
                      senderId,
                      message._id
                    )
                  }
                >
                  🚩 Report message
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openReport(
                      "user",
                      senderId
                    )
                  }
                >
                  👤 Report user
                </button>

                <button
                  type="button"
                  disabled={
                    changingMute
                  }
                  onClick={() =>
                    toggleMute(
                      senderId
                    )
                  }
                >
                  🔇{" "}
                  {relationship ===
                  "mute"
                    ? "Unmute user"
                    : "Mute user"}
                </button>

                <button
                  type="button"
                  disabled={
                    changingBlock
                  }
                  onClick={() =>
                    toggleBlock(
                      senderId
                    )
                  }
                >
                  ⛔{" "}
                  {relationship ===
                  "block"
                    ? "Unblock user"
                    : "Block user"}
                </button>
              </div>
            )}
        </div>
      </div>
    );
  };

  /*
  =========================================
  PAGE
  =========================================
  */

  return (
    <main className="world-chat-page">
      <section
        className={`world-chat-container ${
          selectedCountry
            ? "world-chat-container-room"
            : ""
        }`}
      >
        <header className="world-chat-header">
          <div>
            <span className="world-chat-label">
              🌍 WORLD CHAT
            </span>

            <h1>
              {selectedCountry
                ? `${selectedCountry.flag} ${selectedCountry.name}`
                : "Choose a country"}
            </h1>

            <p>
              {selectedCountry
                ? "Join the public conversation."
                : "Visit public conversations from countries around the world."}
            </p>
          </div>

          <div className="world-chat-header-actions">
            <button
              type="button"
              className="world-chat-back-button"
              onClick={onBackToChat}
            >
              ← Private Chats
            </button>

            {selectedCountry && (
              <button
                type="button"
                className="world-chat-back-button"
                onClick={changeCountry}
              >
                Change Country
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="world-chat-error">
            <span>
              ⚠️
            </span>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {!selectedCountry ? (
          <div className="world-chat-country-section">
            <div className="world-chat-search">
              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="world-chat-country-list">
              {filteredCountries.map(
                (country) => (
                  <button
                    key={
                      country.code
                    }
                    type="button"
                    className="world-chat-country-card"
                    onClick={() =>
                      selectCountry(
                        country
                      )
                    }
                  >
                    <span className="world-chat-country-flag">
                      {
                        country.flag
                      }
                    </span>

                    <span className="world-chat-country-name">
                      {
                        country.name
                      }
                    </span>

                    <span className="world-chat-country-arrow">
                      →
                    </span>
                  </button>
                )
              )}

              {filteredCountries.length ===
                0 && (
                <div className="world-chat-empty">
                  No country found.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="world-chat-room">
            <div className="world-chat-room-toolbar">
              <div className="world-chat-room-identity">
                <div className="world-chat-room-icon">
                  {
                    selectedCountry.flag
                  }
                </div>

                <div>
                  <h2>
                    {
                      selectedCountry.name
                    }{" "}
                    World Chat
                  </h2>

                  <span>
                    Public room •
                    Everyone can see
                    messages
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="world-chat-refresh"
                onClick={() =>
                  loadMessages(
                    selectedCountry.code
                  )
                }
                disabled={
                  loadingMessages
                }
              >
                {loadingMessages
                  ? "..."
                  : "↻"}
              </button>
            </div>

            <div className="world-chat-messages">
              {loadingMessages ? (
                <div className="world-chat-loading">
                  <div className="world-chat-loading-spinner" />

                  <p>
                    Loading messages...
                  </p>
                </div>
              ) : messages.length ===
                0 ? (
                <div className="world-chat-no-messages">
                  <div>
                    {
                      selectedCountry.flag
                    }
                  </div>

                  <h3>
                    Welcome to{" "}
                    {
                      selectedCountry.name
                    }
                  </h3>

                  <p>
                    There are no public
                    messages here yet.
                    Start the conversation.
                  </p>
                </div>
              ) : (
                messages.map(
                  renderMessage
                )
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>

            <div className="world-chat-composer-area">
              {showStickerPicker && (
                <div className="world-chat-sticker-picker">
                  <div className="world-chat-sticker-header">
                    <span>
                      Choose a sticker
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setShowStickerPicker(
                          false
                        )
                      }
                    >
                      ×
                    </button>
                  </div>

                  <div className="world-chat-sticker-grid">
                    {stickers.map(
                      (sticker) => (
                        <button
                          key={
                            sticker
                          }
                          type="button"
                          onClick={() =>
                            sendSticker(
                              sticker
                            )
                          }
                          disabled={
                            sendingMessage
                          }
                        >
                          {
                            sticker
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              <form
                className="world-chat-composer"
                onSubmit={
                  sendMessage
                }
              >
                <input
                  ref={
                    imageInputRef
                  }
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageUpload
                  }
                  hidden
                />

                <button
                  type="button"
                  className="world-chat-composer-button"
                  onClick={
                    handleImageButton
                  }
                  disabled={
                    uploadingImage ||
                    sendingMessage
                  }
                  title="Send image"
                >
                  {uploadingImage
                    ? "..."
                    : "📷"}
                </button>

                <button
                  type="button"
                  className="world-chat-composer-button"
                  onClick={() =>
                    setShowStickerPicker(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  disabled={
                    sendingMessage ||
                    uploadingImage
                  }
                  title="Send sticker"
                >
                  ✨
                </button>

                <input
                  type="text"
                  className="world-chat-message-input"
                  placeholder={`Message ${selectedCountry.name}...`}
                  value={
                    messageText
                  }
                  onChange={(
                    event
                  ) =>
                    setMessageText(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    sendingMessage ||
                    uploadingImage
                  }
                  maxLength={
                    2000
                  }
                />

                <button
                  type="submit"
                  className="world-chat-send-button"
                  disabled={
                    sendingMessage ||
                    uploadingImage ||
                    !messageText.trim()
                  }
                >
                  {sendingMessage
                    ? "..."
                    : "➤"}
                </button>
              </form>

              <p className="world-chat-composer-note">
                🌍 Public chat •
                Keep conversations
                respectful
              </p>
            </div>
          </div>
        )}
      </section>

      {/* =========================================
          COUNTRY SETUP MODAL
          ========================================= */}

      {showCountrySetup && (
        <div
          className="world-chat-modal-overlay"
          onClick={() => {
            /*
             * Country selection is required.
             */
          }}
        >
          <div
            className="world-chat-country-setup-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="world-chat-country-setup-icon">
              🌍
            </div>

            <div className="world-chat-country-setup-header">
              <span>
                FORTUNE CHAT
              </span>

              <h2>
                Choose your country
              </h2>

              <p>
                Your country helps identify
                where you are chatting from in
                World Chat. You can choose your
                country below.
              </p>
            </div>

            <div className="world-chat-country-setup-search">
              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search your country..."
                value={
                  countrySetupSearch
                }
                onChange={(
                  event
                ) =>
                  setCountrySetupSearch(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="world-chat-country-setup-list">
              {filteredSetupCountries.map(
                (country) => (
                  <button
                    key={
                      country.code
                    }
                    type="button"
                    className={`world-chat-country-setup-option ${
                      setupCountry?.code ===
                      country.code
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSetupCountry(
                        country
                      )
                    }
                  >
                    <span className="world-chat-country-setup-flag">
                      {
                        country.flag
                      }
                    </span>

                    <span>
                      {
                        country.name
                      }
                    </span>

                    {setupCountry?.code ===
                      country.code && (
                      <span className="world-chat-country-setup-check">
                        ✓
                      </span>
                    )}
                  </button>
                )
              )}

              {filteredSetupCountries.length ===
                0 && (
                <div className="world-chat-empty">
                  No country found.
                </div>
              )}
            </div>

            <button
              type="button"
              className="world-chat-country-save"
              disabled={
                !setupCountry ||
                savingCountry
              }
              onClick={
                saveUserCountry
              }
            >
              {savingCountry
                ? "Saving country..."
                : setupCountry
                ? `Continue as ${setupCountry.flag} ${setupCountry.name}`
                : "Select your country"}
            </button>

            <p className="world-chat-country-setup-note">
              🔒 Your password is never
              displayed or stored in this
              country selection.
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          REPORT MODAL
          ========================================= */}

      {showReportModal &&
        reportTarget && (
          <div
            className="world-chat-modal-overlay"
            onClick={() =>
              setShowReportModal(
                false
              )
            }
          >
            <div
              className="world-chat-report-modal"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="world-chat-report-header">
                <div>
                  <span>
                    🚩 REPORT
                  </span>

                  <h2>
                    Report{" "}
                    {reportTarget.type ===
                    "message"
                      ? "message"
                      : "user"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowReportModal(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <p>
                Help keep World Chat safe by
                telling us what is wrong.
              </p>

              <label>
                Reason

                <select
                  value={
                    selectedReportReason
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedReportReason(
                      event.target
                        .value as ReportReason
                    )
                  }
                >
                  {reportReasons.map(
                    (reason) => (
                      <option
                        key={
                          reason.value
                        }
                        value={
                          reason.value
                        }
                      >
                        {
                          reason.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Additional details

                <textarea
                  placeholder="Tell us anything that may help..."
                  value={
                    reportDetails
                  }
                  onChange={(
                    event
                  ) =>
                    setReportDetails(
                      event.target
                        .value
                    )
                  }
                  maxLength={
                    1000
                  }
                />
              </label>

              <div className="world-chat-report-actions">
                <button
                  type="button"
                  className="world-chat-report-cancel"
                  onClick={() =>
                    setShowReportModal(
                      false
                    )
                  }
                  disabled={
                    reporting
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="world-chat-report-submit"
                  onClick={
                    submitReport
                  }
                  disabled={
                    reporting
                  }
                >
                  {reporting
                    ? "Submitting..."
                    : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

export default WorldChat;