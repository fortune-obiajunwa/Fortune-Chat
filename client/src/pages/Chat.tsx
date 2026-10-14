import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { io, type Socket } from "socket.io-client";

interface Conversation {
  id: string;
  name: string;
  username: string;
  receiverId: string;
  lastMessage: string;
  time: string;
  isOnline: boolean;
  unreadCount: number;
  profilePicture?: string;
}

interface SearchUser {
  _id: string;
  fullName: string;
  username: string;
  fortuneId: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface ApiConversation {
  _id: string;
  participants: SearchUser[];
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  type?: "text" | "image" | "file" | "sticker" | "voice";
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Sticker {
  id: string;
  emoji: string;
  name: string;
  background: string;
}

interface ChatProps {
  onOpenWorldChat: () => void;
}

const SERVER_URL = "http://localhost:5000";

/*
=========================================
BUILT-IN FORTUNE CHAT STICKERS
=========================================
*/

const STICKERS: Sticker[] = [
  {
    id: "laugh",
    emoji: "😂",
    name: "Laugh",
    background: "#fff3b0",
  },
  {
    id: "love",
    emoji: "😍",
    name: "Love",
    background: "#ffd6e7",
  },
  {
    id: "heart",
    emoji: "❤️",
    name: "Heart",
    background: "#ffe0e0",
  },
  {
    id: "cool",
    emoji: "😎",
    name: "Cool",
    background: "#d9f1ff",
  },
  {
    id: "fire",
    emoji: "🔥",
    name: "Fire",
    background: "#ffe0c2",
  },
  {
    id: "wow",
    emoji: "🤯",
    name: "Wow",
    background: "#e4d8ff",
  },
  {
    id: "party",
    emoji: "🥳",
    name: "Party",
    background: "#ffe4f2",
  },
  {
    id: "sad",
    emoji: "😢",
    name: "Sad",
    background: "#dcecff",
  },
  {
    id: "angry",
    emoji: "😡",
    name: "Angry",
    background: "#ffd5d5",
  },
  {
    id: "thumbs",
    emoji: "👍",
    name: "Nice",
    background: "#fff0c7",
  },
  {
    id: "clap",
    emoji: "👏",
    name: "Clap",
    background: "#ffe7c9",
  },
  {
    id: "rocket",
    emoji: "🚀",
    name: "Rocket",
    background: "#dce8ff",
  },
];

function Chat({ onOpenWorldChat }: ChatProps) {
  const [activeSection, setActiveSection] = useState<
    "chats" | "world" | "profile"
  >("chats");

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [conversationsLoading, setConversationsLoading] = useState(true);

  const [conversationsError, setConversationsError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [showNewChat, setShowNewChat] = useState(false);

  const [newChatSearch, setNewChatSearch] = useState("");

  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);

  const [searchError, setSearchError] = useState("");

  const [creatingConversation, setCreatingConversation] = useState(false);

  /*
  =========================================
  MESSAGE STATE
  =========================================
  */

  const [messages, setMessages] = useState<Message[]>([]);

  const [messagesLoading, setMessagesLoading] = useState(false);

  const [messagesError, setMessagesError] = useState("");

  const [messageText, setMessageText] = useState("");

  const [sendingMessage, setSendingMessage] = useState(false);

  /*
  =========================================
  REAL-TIME SOCKET STATE
  =========================================
  */

  const socketRef = useRef<Socket | null>(null);

  /*
  =========================================
  MESSAGE SCROLL STATE
  =========================================
  */

  const messagesAreaRef = useRef<HTMLDivElement | null>(null);

  /*
  =========================================
  ATTACHMENT STATE
  =========================================
  */

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /*
  =========================================
  VOICE RECORDING STATE
  =========================================
  */

  const [isRecording, setIsRecording] = useState(false);

  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [sendingVoice, setSendingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const audioChunksRef = useRef<Blob[]>([]);

  const discardRecordingRef = useRef(false);

  /*
  =========================================
  PROFILE PICTURE STATE
  =========================================
  */

  const [uploadingProfilePicture, setUploadingProfilePicture] =
    useState(false);

  const [profilePictureError, setProfilePictureError] = useState("");

  const profilePictureInputRef = useRef<HTMLInputElement | null>(null);

  const userData = localStorage.getItem("fortuneChatUser");

  const user = userData ? JSON.parse(userData) : null;

  /*
  =========================================
  MEDIA URL HELPER
  =========================================
  */

  const getMediaUrl = (mediaUrl?: string) => {
    if (!mediaUrl) {
      return "";
    }

    if (
      mediaUrl.startsWith("http://") ||
      mediaUrl.startsWith("https://") ||
      mediaUrl.startsWith("data:")
    ) {
      return mediaUrl;
    }

    return `${SERVER_URL}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
  };

  /*
  =========================================
  MESSAGE PREVIEW HELPER
  =========================================
  */

  const getConversationMessagePreview = (message: Message) => {
    if (message.type === "image") {
      return "📷 Photo";
    }

    if (message.type === "file") {
      return `📎 ${message.fileName || "File"}`;
    }

    if (message.type === "sticker") {
      return "😊 Sticker";
    }

    if (message.type === "voice") {
      return "🎤 Voice message";
    }

    return message.text || "New message";
  };

  /*
  =========================================
  ADD MESSAGE WITHOUT DUPLICATES
  =========================================
  */

  const addMessageIfNew = (incomingMessage: Message) => {
    if (!incomingMessage?._id) {
      return;
    }

    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some(
        (message) => message._id === incomingMessage._id
      );

      if (alreadyExists) {
        return currentMessages;
      }

      const updatedMessages = [
        ...currentMessages,
        incomingMessage,
      ];

      return updatedMessages.sort(
        (firstMessage, secondMessage) =>
          new Date(firstMessage.createdAt).getTime() -
          new Date(secondMessage.createdAt).getTime()
      );
    });

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === incomingMessage.conversationId
          ? {
              ...conversation,
              lastMessage: getConversationMessagePreview(incomingMessage),
              time: new Date(
                incomingMessage.createdAt
              ).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
            }
          : conversation
      )
    );
  };

  /*
  =========================================
  CREATE STICKER IMAGE URL
  =========================================
  */

  const createStickerUrl = (sticker: Sticker) => {
    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="240"
        height="240"
        viewBox="0 0 240 240"
      >
        <rect
          width="240"
          height="240"
          rx="48"
          fill="${sticker.background}"
        />

        <circle
          cx="120"
          cy="120"
          r="92"
          fill="white"
          opacity="0.45"
        />

        <text
          x="120"
          y="145"
          text-anchor="middle"
          font-size="105"
          font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
        >
          ${sticker.emoji}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  /*
  =========================================
  FILE SIZE FORMATTER
  =========================================
  */

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) {
      return "Unknown size";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /*
  =========================================
  FILE ICON HELPER
  =========================================
  */

  const getFileIcon = (fileName?: string, mimeType?: string) => {
    const extension = fileName?.split(".").pop()?.toLowerCase();

    if (mimeType === "application/pdf" || extension === "pdf") {
      return "📕";
    }

    if (
      extension === "doc" ||
      extension === "docx" ||
      mimeType?.includes("word")
    ) {
      return "📘";
    }

    if (
      extension === "xls" ||
      extension === "xlsx" ||
      mimeType?.includes("excel") ||
      mimeType?.includes("spreadsheet")
    ) {
      return "📗";
    }

    if (
      extension === "ppt" ||
      extension === "pptx" ||
      mimeType?.includes("powerpoint") ||
      mimeType?.includes("presentation")
    ) {
      return "📙";
    }

    if (
      extension === "zip" ||
      extension === "rar" ||
      extension === "7z"
    ) {
      return "🗜️";
    }

    if (extension === "txt" || extension === "csv") {
      return "📄";
    }

    return "📎";
  };

  /*
  =========================================
  LOAD USER CONVERSATIONS
  =========================================
  */

  const loadConversations = async () => {
    if (!user?.id) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);
    setConversationsError("");

    try {
      const response = await fetch(
        `${SERVER_URL}/api/conversations/${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        setConversationsError(
          data.message || "Unable to load conversations."
        );

        setConversations([]);
        return;
      }

      const apiConversations: ApiConversation[] =
        data.conversations || [];

      const formattedConversations: Conversation[] = apiConversations
        .map((conversation) => {
          const otherUser = conversation.participants.find(
            (participant) => participant._id !== user.id
          );

          if (!otherUser) {
            return null;
          }

          return {
            id: conversation._id,
            name: otherUser.fullName,
            username: otherUser.username,
            receiverId: otherUser._id,
            lastMessage: "Start a conversation",
            time: new Date(
              conversation.updatedAt
            ).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
            isOnline: otherUser.isOnline,
            unreadCount: conversation.unreadCount || 0,
            profilePicture: otherUser.profilePicture,
          };
        })
        .filter(
          (conversation): conversation is Conversation =>
            conversation !== null
        );

      setConversations(formattedConversations);
    } catch {
      setConversationsError("Unable to connect to Fortune Chat.");
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  /*
  =========================================
  LOAD CONVERSATIONS
  =========================================
  */

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  /*
  =========================================
  LOAD MESSAGES
  =========================================
  */

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    setMessagesError("");

    try {
      const response = await fetch(
        `${SERVER_URL}/api/messages/${conversationId}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message || "Unable to load messages."
        );

        setMessages([]);
        return;
      }

      const loadedMessages: Message[] = data.messages || [];

      setMessages((currentMessages) => {
        const messagesForThisConversation =
          currentMessages.filter(
            (currentMessage) =>
              currentMessage.conversationId === conversationId
          );

        const mergedMessages = [
          ...loadedMessages,
          ...messagesForThisConversation,
        ];

        const uniqueMessages = Array.from(
          new Map(
            mergedMessages.map((message) => [
              message._id,
              message,
            ])
          ).values()
        );

        return uniqueMessages.sort(
          (firstMessage, secondMessage) =>
            new Date(firstMessage.createdAt).getTime() -
            new Date(secondMessage.createdAt).getTime()
        );
      });
    } catch {
      setMessagesError("Unable to connect to Fortune Chat.");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  /*
  =========================================
  MARK MESSAGES AS READ
  =========================================
  */

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user?.id) {
      return;
    }

    try {
      const response = await fetch(
        `${SERVER_URL}/api/messages/${conversationId}/read/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return;
      }

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation
        )
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.receiverId === user.id
            ? {
                ...message,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : message
        )
      );
    } catch {
      /*
      Read status failure should not break the chat.
      */
    }
  };

  /*
  =========================================
  SOCKET.IO REAL-TIME CHAT
  =========================================
  */

  useEffect(() => {
    if (!selectedConversation?.id || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      return;
    }

    const conversationId = selectedConversation.id;

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        `FortuneChat website socket connected: ${socket.id}`
      );

      socket.emit(
        "join_conversation",
        conversationId
      );
    });

    socket.on("new_message", (incomingMessage: Message) => {
      if (
        !incomingMessage ||
        incomingMessage.conversationId !== conversationId
      ) {
        return;
      }

      addMessageIfNew(incomingMessage);

      /*
      The conversation is currently open, so an incoming
      message should immediately be marked as read.
      */
      if (incomingMessage.receiverId === user.id) {
        markMessagesAsRead(conversationId);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `FortuneChat website socket disconnected: ${reason}`
      );
    });

    socket.on("connect_error", (socketError) => {
      console.log(
        "FortuneChat website socket connection error:",
        socketError.message
      );
    });

    return () => {
      socket.emit(
        "leave_conversation",
        conversationId
      );

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [selectedConversation?.id, user?.id]);

  /*
  =========================================
  LOAD MESSAGES WHEN CONVERSATION OPENS
  =========================================
  */

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMessagesError("");
      return;
    }

    const openConversation = async () => {
      await loadMessages(selectedConversation.id);
      await markMessagesAsRead(selectedConversation.id);
    };

    openConversation();
  }, [selectedConversation]);

  /*
  =========================================
  AUTO SCROLL TO NEWEST MESSAGE
  =========================================
  */

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      const messagesArea = messagesAreaRef.current;

      if (messagesArea) {
        messagesArea.scrollTo({
          top: messagesArea.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [messages]);

  /*
  =========================================
  LOGOUT
  =========================================
  */

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    localStorage.removeItem("fortuneChatToken");
    localStorage.removeItem("fortuneChatUser");

    window.location.reload();
  };

  /*
  =========================================
  OPEN CONVERSATION
  =========================================
  */

  const handleOpenConversation = (
    conversation: Conversation
  ) => {
    setSelectedConversation(conversation);
    setMessageText("");
    setMessagesError("");
    setShowAttachmentMenu(false);
    setShowStickerPicker(false);
  };

  /*
  =========================================
  BACK TO CONVERSATIONS
  =========================================
  */

  const handleBackToConversations = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setSelectedConversation(null);
    setMessages([]);
    setMessageText("");
    setShowAttachmentMenu(false);
    setShowStickerPicker(false);

    stopRecording(false);
  };

  /*
  =========================================
  COPY FORTUNE ID
  =========================================
  */

  const handleCopyFortuneId = async () => {
    if (!user?.fortuneId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(user.fortuneId);

      alert("Fortune ID copied!");
    } catch {
      alert("Unable to copy Fortune ID.");
    }
  };

  /*
  =========================================
  PROFILE PICTURE BUTTON
  =========================================
  */

  const handleProfilePictureClick = () => {
    if (uploadingProfilePicture) {
      return;
    }

    setProfilePictureError("");

    profilePictureInputRef.current?.click();
  };

  /*
  =========================================
  UPLOAD PROFILE PICTURE
  =========================================
  */

  const handleProfilePictureSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !user?.id) {
      return;
    }

    setProfilePictureError("");

    if (!file.type.startsWith("image/")) {
      setProfilePictureError(
        "Please select a valid image file."
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProfilePictureError(
        "Profile picture must be smaller than 10 MB."
      );

      return;
    }

    setUploadingProfilePicture(true);

    try {
      const formData = new FormData();

      formData.append("image", file);

      const response = await fetch(
        `${SERVER_URL}/api/users/${user.id}/profile-picture`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setProfilePictureError(
          data.message ||
            "Unable to update your profile picture."
        );

        return;
      }

      if (data.user) {
        localStorage.setItem(
          "fortuneChatUser",
          JSON.stringify({
            ...user,
            ...data.user,
          })
        );
      }

      setProfilePictureError("");

      window.location.reload();
    } catch {
      setProfilePictureError(
        "Unable to connect to Fortune Chat."
      );
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  /*
  =========================================
  OPEN NEW CHAT
  =========================================
  */

  const handleOpenNewChat = () => {
    setShowNewChat(true);
    setNewChatSearch("");
    setSearchResults([]);
    setSearchError("");
  };

  /*
  =========================================
  CLOSE NEW CHAT
  =========================================
  */

  const handleCloseNewChat = () => {
    setShowNewChat(false);
    setNewChatSearch("");
    setSearchResults([]);
    setSearchError("");
  };

  /*
  =========================================
  SEARCH USERS
  =========================================
  */

  const handleSearchUsers = async (value: string) => {
    setNewChatSearch(value);
    setSearchError("");

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      const response = await fetch(
        `${SERVER_URL}/api/users/search?q=${encodeURIComponent(
          value.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        setSearchError(
          data.message || "Unable to search users."
        );

        setSearchResults([]);
        return;
      }

      setSearchResults(data.users || []);
    } catch {
      setSearchError("Unable to connect to Fortune Chat.");

      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  /*
  =========================================
  CREATE OR FIND PRIVATE CONVERSATION
  =========================================
  */

  const handleStartConversation = async (
    searchUser: SearchUser
  ) => {
    if (!user?.id || !searchUser?._id) {
      setSearchError(
        "Unable to identify the users for this conversation."
      );

      return;
    }

    setCreatingConversation(true);
    setSearchError("");

    try {
      const response = await fetch(
        `${SERVER_URL}/api/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            otherUserId: searchUser._id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setSearchError(
          data.message || "Unable to start conversation."
        );

        return;
      }

      const conversation: Conversation = {
        id: data.conversation._id,
        name: searchUser.fullName,
        username: searchUser.username,
        receiverId: searchUser._id,
        lastMessage: "Start a conversation",
        time: "Now",
        isOnline: searchUser.isOnline,
        unreadCount: 0,
        profilePicture: searchUser.profilePicture,
      };

      setConversations((currentConversations) => {
        const alreadyExists = currentConversations.some(
          (existingConversation) =>
            existingConversation.id === conversation.id
        );

        if (alreadyExists) {
          return currentConversations;
        }

        return [conversation, ...currentConversations];
      });

      setSelectedConversation(conversation);
      setShowNewChat(false);
      setNewChatSearch("");
      setSearchResults([]);

      await loadConversations();
    } catch {
      setSearchError("Unable to connect to Fortune Chat.");
    } finally {
      setCreatingConversation(false);
    }
  };

  /*
  =========================================
  SEND TEXT MESSAGE
  =========================================
  */

  const handleSendMessage = async () => {
    if (
      !messageText.trim() ||
      !selectedConversation ||
      !user?.id
    ) {
      return;
    }

    setSendingMessage(true);
    setMessagesError("");

    try {
      const response = await fetch(
        `${SERVER_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            senderId: user.id,
            receiverId: selectedConversation.receiverId,
            text: messageText.trim(),
            type: "text",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message || "Unable to send message."
        );

        return;
      }

      /*
      The server also emits this message through Socket.IO.
      addMessageIfNew prevents the REST response and socket
      response from creating duplicates.
      */
      addMessageIfNew(data.data);

      setMessageText("");

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: data.data.text,
                time: new Date(
                  data.data.createdAt
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : conversation
        )
      );
    } catch {
      setMessagesError(
        "Unable to connect to Fortune Chat."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /*
  =========================================
  HANDLE ENTER KEY
  =========================================
  */

  const handleMessageKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      handleSendMessage();
    }
  };

  /*
  =========================================
  ATTACHMENT MENU
  =========================================
  */

  const handleAttachmentClick = () => {
    if (showAttachmentMenu) {
      setShowAttachmentMenu(false);
      setShowStickerPicker(false);
      return;
    }

    setShowAttachmentMenu(true);
    setShowStickerPicker(false);
  };

  /*
  =========================================
  PHOTO BUTTON
  =========================================
  */

  const handlePhotoAttachment = () => {
    setShowAttachmentMenu(false);
    setShowStickerPicker(false);

    imageInputRef.current?.click();
  };

  /*
  =========================================
  UPLOAD IMAGE
  =========================================
  */

  const handleImageSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (
      !file ||
      !selectedConversation ||
      !user?.id
    ) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB.");

      return;
    }

    setSendingMessage(true);
    setMessagesError("");

    try {
      const formData = new FormData();

      formData.append("image", file);

      const uploadResponse = await fetch(
        `${SERVER_URL}/api/uploads/image`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setMessagesError(
          uploadData.message || "Unable to upload image."
        );

        return;
      }

      const response = await fetch(
        `${SERVER_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            senderId: user.id,
            receiverId: selectedConversation.receiverId,
            text: "",
            type: "image",
            mediaUrl:
              uploadData.url ||
              uploadData.imageUrl,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message || "Unable to send image."
        );

        return;
      }

      addMessageIfNew(data.data);

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: "📷 Photo",
                time: new Date(
                  data.data.createdAt
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : conversation
        )
      );
    } catch {
      setMessagesError(
        "Unable to upload or send image."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /*
  =========================================
  FILE BUTTON
  =========================================
  */

  const handleFileAttachment = () => {
    setShowAttachmentMenu(false);
    setShowStickerPicker(false);

    fileInputRef.current?.click();
  };

  /*
  =========================================
  UPLOAD FILE
  =========================================
  */

  const handleFileSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (
      !file ||
      !selectedConversation ||
      !user?.id
    ) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be smaller than 10 MB.");

      return;
    }

    setSendingMessage(true);
    setMessagesError("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const uploadResponse = await fetch(
        `${SERVER_URL}/api/uploads/file`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setMessagesError(
          uploadData.message || "Unable to upload file."
        );

        return;
      }

      const response = await fetch(
        `${SERVER_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            senderId: user.id,
            receiverId: selectedConversation.receiverId,
            text: "",
            type: "file",
            mediaUrl:
              uploadData.url ||
              uploadData.fileUrl,
            fileName:
              uploadData.fileName ||
              file.name,
            mimeType:
              uploadData.mimeType ||
              file.type,
            fileSize:
              uploadData.fileSize ||
              file.size,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message || "Unable to send file."
        );

        return;
      }

      addMessageIfNew(data.data);

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: `📎 ${file.name}`,
                time: new Date(
                  data.data.createdAt
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : conversation
        )
      );
    } catch {
      setMessagesError(
        "Unable to upload or send file."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /*
  =========================================
  STICKER BUTTON
  =========================================
  */

  const handleStickerAttachment = () => {
    setShowAttachmentMenu(false);
    setShowStickerPicker(true);
  };

  /*
  =========================================
  SEND STICKER
  =========================================
  */

  const handleSendSticker = async (
    sticker: Sticker
  ) => {
    if (
      !selectedConversation ||
      !user?.id ||
      sendingMessage
    ) {
      return;
    }

    setSendingMessage(true);
    setMessagesError("");

    try {
      const stickerUrl =
        createStickerUrl(sticker);

      const response = await fetch(
        `${SERVER_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            senderId: user.id,
            receiverId: selectedConversation.receiverId,
            text: "",
            type: "sticker",
            mediaUrl: stickerUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message || "Unable to send sticker."
        );

        return;
      }

      addMessageIfNew(data.data);

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: `${sticker.emoji} Sticker`,
                time: new Date(
                  data.data.createdAt
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : conversation
        )
      );

      setShowStickerPicker(false);
    } catch {
      setMessagesError(
        "Unable to send sticker."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /*
  =========================================
  CLOSE STICKER PICKER
  =========================================
  */

  const handleCloseStickerPicker = () => {
    setShowStickerPicker(false);
  };

  /*
  =========================================
  GET SUPPORTED AUDIO TYPE
  =========================================
  */

  const getSupportedAudioMimeType = () => {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
    ) {
      return "audio/webm;codecs=opus";
    }

    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/webm")
    ) {
      return "audio/webm";
    }

    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(
        "audio/ogg;codecs=opus"
      )
    ) {
      return "audio/ogg;codecs=opus";
    }

    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/mp4")
    ) {
      return "audio/mp4";
    }

    return "";
  };

  /*
  =========================================
  SEND VOICE MESSAGE
  =========================================
  */

  const sendVoiceMessage = async (
    audioBlob: Blob
  ) => {
    if (
      !selectedConversation ||
      !user?.id ||
      sendingVoice ||
      audioBlob.size <= 0
    ) {
      return;
    }

    setSendingVoice(true);
    setMessagesError("");

    try {
      const audioMimeType =
        audioBlob.type || "audio/webm";

      let extension = "webm";

      if (audioMimeType.includes("ogg")) {
        extension = "ogg";
      } else if (audioMimeType.includes("mp4")) {
        extension = "mp4";
      } else if (audioMimeType.includes("mpeg")) {
        extension = "mp3";
      }

      const voiceFile = new File(
        [audioBlob],
        `voice-note-${Date.now()}.${extension}`,
        {
          type: audioMimeType,
        }
      );

      const formData = new FormData();

      formData.append("file", voiceFile);

      const uploadResponse = await fetch(
        `${SERVER_URL}/api/uploads/file`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        setMessagesError(
          uploadData.message ||
            "Unable to upload voice note."
        );

        return;
      }

      const response = await fetch(
        `${SERVER_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId:
              selectedConversation.id,
            senderId: user.id,
            receiverId:
              selectedConversation.receiverId,
            text: "",
            type: "voice",
            mediaUrl:
              uploadData.url ||
              uploadData.fileUrl,
            fileName:
              uploadData.fileName ||
              voiceFile.name,
            mimeType:
              uploadData.mimeType ||
              audioMimeType,
            fileSize:
              uploadData.fileSize ||
              voiceFile.size,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessagesError(
          data.message ||
            "Unable to send voice note."
        );

        return;
      }

      addMessageIfNew(data.data);

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id ===
          selectedConversation.id
            ? {
                ...conversation,
                lastMessage:
                  "🎤 Voice message",
                time: new Date(
                  data.data.createdAt
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : conversation
        )
      );
    } catch {
      setMessagesError(
        "Unable to upload or send voice note."
      );
    } finally {
      setSendingVoice(false);
    }
  };

  /*
  =========================================
  START VOICE RECORDING
  =========================================
  */

  const startRecording = async () => {
    if (isRecording || sendingVoice) {
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert(
        "Your browser does not support microphone recording."
      );

      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert(
        "Your browser does not support voice recording."
      );

      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const supportedMimeType =
        getSupportedAudioMimeType();

      const mediaRecorder =
        supportedMimeType
          ? new MediaRecorder(stream, {
              mimeType: supportedMimeType,
            })
          : new MediaRecorder(stream);

      audioChunksRef.current = [];

      discardRecordingRef.current = false;

      mediaRecorderRef.current =
        mediaRecorder;

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      mediaRecorder.onerror = () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        audioChunksRef.current = [];

        mediaRecorderRef.current = null;

        if (recordingTimerRef.current) {
          clearInterval(
            recordingTimerRef.current
          );

          recordingTimerRef.current = null;
        }

        setIsRecording(false);
        setRecordingSeconds(0);

        setMessagesError(
          "Voice recording failed."
        );
      };

      mediaRecorder.onstop = async () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        if (recordingTimerRef.current) {
          clearInterval(
            recordingTimerRef.current
          );

          recordingTimerRef.current = null;
        }

        const shouldDiscard =
          discardRecordingRef.current;

        const finalMimeType =
          mediaRecorder.mimeType ||
          supportedMimeType ||
          "audio/webm";

        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: finalMimeType,
          }
        );

        audioChunksRef.current = [];

        mediaRecorderRef.current = null;

        discardRecordingRef.current = false;

        setIsRecording(false);
        setRecordingSeconds(0);

        if (
          !shouldDiscard &&
          audioBlob.size > 0
        ) {
          await sendVoiceMessage(
            audioBlob
          );
        }
      };

      mediaRecorder.start(250);

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingSeconds(
            (currentSeconds) =>
              currentSeconds + 1
          );
        }, 1000);
    } catch {
      alert(
        "Microphone permission was not granted."
      );
    }
  };

  /*
  =========================================
  STOP VOICE RECORDING
  =========================================
  */

  const stopRecording = (
    shouldSend = true
  ) => {
    const mediaRecorder =
      mediaRecorderRef.current;

    if (!mediaRecorder) {
      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );

        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      setRecordingSeconds(0);

      return;
    }

    if (!shouldSend) {
      discardRecordingRef.current = true;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current = null;
    }

    if (!shouldSend) {
      audioChunksRef.current = [];
    }

    setIsRecording(false);
    setRecordingSeconds(0);
  };

  /*
  =========================================
  MICROPHONE BUTTON
  =========================================
  */

  const handleMicrophoneClick = () => {
    if (sendingVoice) {
      return;
    }

    if (isRecording) {
      stopRecording(true);

      return;
    }

    startRecording();
  };

  /*
  =========================================
  FORMAT RECORDING TIME
  =========================================
  */

  const formatRecordingTime = (
    seconds: number
  ) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  /*
  =========================================
  FORMAT MESSAGE TIME
  =========================================
  */

  const formatMessageTime = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  /*
  =========================================
  FILTER EXISTING CONVERSATIONS
  =========================================
  */

  const filteredConversations =
    conversations.filter(
      (conversation) => {
        const searchValue =
          searchTerm.toLowerCase().trim();

        return (
          conversation.name
            .toLowerCase()
            .includes(searchValue) ||
          conversation.username
            .toLowerCase()
            .includes(searchValue)
        );
      }
    );

  /*
  =========================================
  CLEANUP RECORDING + SOCKET
  =========================================
  */

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      discardRecordingRef.current = true;

      if (mediaRecorderRef.current) {
        try {
          if (
            mediaRecorderRef.current.state !==
            "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
        } catch {
          // Recorder may already be stopped.
        }

        mediaRecorderRef.current = null;
      }

      audioChunksRef.current = [];

      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );

        recordingTimerRef.current = null;
      }
    };
  }, []);

  return (
    <main className="chat-page">

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside className="chat-sidebar">

        <div className="chat-brand">

          <div className="chat-brand-logo">
            FC
          </div>

          <div>
            <strong>
              Fortune Chat
            </strong>

            <span>
              Messages
            </span>
          </div>

        </div>

        <nav className="chat-navigation">

          <button
            type="button"
            className={
              activeSection === "chats"
                ? "chat-nav-item active"
                : "chat-nav-item"
            }
            onClick={() => {
              setActiveSection("chats");
              setSelectedConversation(null);
              setShowNewChat(false);
            }}
          >
            <span className="chat-nav-icon">
              💬
            </span>

            <span>
              Private Chats
            </span>
          </button>

          <button
            type="button"
            className="chat-nav-item"
            onClick={onOpenWorldChat}
          >
            <span className="chat-nav-icon">
              🌍
            </span>

            <span>
              World Chat
            </span>
          </button>

          <button
            type="button"
            className={
              activeSection === "profile"
                ? "chat-nav-item active"
                : "chat-nav-item"
            }
            onClick={() => {
              setActiveSection("profile");
              setSelectedConversation(null);
              setShowNewChat(false);
            }}
          >
            <span className="chat-nav-icon">
              👤
            </span>

            <span>
              Profile
            </span>
          </button>

        </nav>

        <div className="chat-sidebar-bottom">

          <div className="chat-user-card">

            <div className="chat-user-avatar">

              {user?.profilePicture ? (

                <img
                  src={getMediaUrl(
                    user.profilePicture
                  )}
                  alt={
                    user?.fullName ||
                    "Profile"
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "50%",
                  }}
                />

              ) : (

                user?.fullName
                  ?.charAt(0)
                  .toUpperCase() || "U"

              )}

            </div>

            <div className="chat-user-info">

              <strong>
                {user?.fullName || "User"}
              </strong>

              <span>
                @{user?.username || "user"}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="chat-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </aside>

      <section className="chat-main">

        {/* =========================================
            PRIVATE CHATS
        ========================================= */}

        {activeSection === "chats" && (
          <>

            {showNewChat ? (

              <div className="conversation-screen">

                <div className="conversation-header">

                  <div>

                    <span className="chat-section-badge">
                      NEW CHAT
                    </span>

                    <h1>
                      Start a conversation
                    </h1>

                  </div>

                  <button
                    type="button"
                    className="chat-back-button"
                    onClick={handleCloseNewChat}
                    aria-label="Close new chat"
                    disabled={creatingConversation}
                  >
                    ←
                  </button>

                </div>

                <div className="conversation-search">

                  <span>
                    🔎
                  </span>

                  <input
                    type="text"
                    placeholder="Search name or Fortune ID"
                    value={newChatSearch}
                    onChange={(event) =>
                      handleSearchUsers(
                        event.target.value
                      )
                    }
                    autoFocus
                    disabled={creatingConversation}
                  />

                </div>

                {creatingConversation && (
                  <div className="conversation-no-results">

                    <span>
                      💬
                    </span>

                    <strong>
                      Opening conversation...
                    </strong>

                    <p>
                      Connecting you with{" "}
                      {searchResults[0]?.fullName ||
                        "this user"}.
                    </p>

                  </div>
                )}

                {!creatingConversation &&
                  searchLoading && (
                    <div className="conversation-no-results">

                      <span>
                        🔄
                      </span>

                      <strong>
                        Searching...
                      </strong>

                      <p>
                        Looking for Fortune Chat users.
                      </p>

                    </div>
                  )}

                {!creatingConversation &&
                  !searchLoading &&
                  searchError && (
                    <div className="conversation-no-results">

                      <span>
                        ⚠️
                      </span>

                      <strong>
                        Conversation unavailable
                      </strong>

                      <p>
                        {searchError}
                      </p>

                    </div>
                  )}

                {!creatingConversation &&
                  !searchLoading &&
                  !searchError &&
                  newChatSearch.trim() &&
                  searchResults.length > 0 && (

                    <div className="conversation-list">

                      {searchResults.map(
                        (searchUser) => (

                          <button
                            key={searchUser._id}
                            type="button"
                            className="conversation-item"
                            onClick={() =>
                              handleStartConversation(
                                searchUser
                              )
                            }
                            disabled={
                              creatingConversation
                            }
                          >

                            <div className="conversation-avatar">

                              {searchUser.profilePicture ? (

                                <img
                                  src={getMediaUrl(
                                    searchUser.profilePicture
                                  )}
                                  alt={
                                    searchUser.fullName
                                  }
                                />

                              ) : (

                                searchUser.fullName
                                  .charAt(0)
                                  .toUpperCase()

                              )}

                              {searchUser.isOnline && (
                                <span className="online-dot" />
                              )}

                            </div>

                            <div className="conversation-details">

                              <div className="conversation-top">

                                <strong>
                                  {
                                    searchUser.fullName
                                  }
                                </strong>

                                <span>
                                  {searchUser.isOnline
                                    ? "Online"
                                    : "Offline"}
                                </span>

                              </div>

                              <div className="conversation-bottom">

                                <p>
                                  @
                                  {
                                    searchUser.username
                                  }
                                </p>

                                <span className="conversation-username">
                                  FC ID:{" "}
                                  {
                                    searchUser.fortuneId
                                  }
                                </span>

                              </div>

                            </div>

                          </button>

                        )
                      )}

                    </div>
                  )}

                {!creatingConversation &&
                  !searchLoading &&
                  !searchError &&
                  newChatSearch.trim() &&
                  searchResults.length === 0 && (

                    <div className="conversation-no-results">

                      <span>
                        🔎
                      </span>

                      <strong>
                        No users found
                      </strong>

                      <p>
                        Try searching with another name,
                        username, or Fortune ID.
                      </p>

                    </div>
                  )}

                {!newChatSearch.trim() &&
                  !searchLoading &&
                  !creatingConversation && (

                    <div className="conversation-no-results">

                      <span>
                        👤
                      </span>

                      <strong>
                        Find someone on Fortune Chat
                      </strong>

                      <p>
                        Search by their name, username,
                        or 10-digit Fortune ID.
                      </p>

                    </div>
                  )}

              </div>

            ) : !selectedConversation ? (

              <div className="conversation-screen">

                <div className="conversation-header">

                  <div>

                    <span className="chat-section-badge">
                      PRIVATE CHATS
                    </span>

                    <h1>
                      Messages
                    </h1>

                  </div>

                  <button
                    type="button"
                    className="new-chat-button"
                    onClick={handleOpenNewChat}
                  >
                    +
                  </button>

                </div>

                <div className="conversation-search">

                  <span>
                    🔎
                  </span>

                  <input
                    type="text"
                    placeholder="Search people or conversations"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value
                      )
                    }
                  />

                </div>

                {conversationsLoading && (
                  <div className="conversation-no-results">

                    <span>
                      🔄
                    </span>

                    <strong>
                      Loading conversations...
                    </strong>

                    <p>
                      Getting your private chats.
                    </p>

                  </div>
                )}

                {!conversationsLoading &&
                  conversationsError && (
                    <div className="conversation-no-results">

                      <span>
                        ⚠️
                      </span>

                      <strong>
                        Unable to load chats
                      </strong>

                      <p>
                        {conversationsError}
                      </p>

                    </div>
                  )}

                {!conversationsLoading &&
                  !conversationsError && (
                    <div className="conversation-list">

                      {filteredConversations.length > 0 ? (

                        filteredConversations.map(
                          (conversation) => (

                            <button
                              key={
                                conversation.id
                              }
                              type="button"
                              className="conversation-item"
                              onClick={() =>
                                handleOpenConversation(
                                  conversation
                                )
                              }
                            >

                              <div className="conversation-avatar">

                                {conversation.profilePicture ? (

                                  <img
                                    src={getMediaUrl(
                                      conversation.profilePicture
                                    )}
                                    alt={
                                      conversation.name
                                    }
                                  />

                                ) : (

                                  conversation.name
                                    .charAt(0)
                                    .toUpperCase()

                                )}

                                {conversation.isOnline && (
                                  <span className="online-dot" />
                                )}

                              </div>

                              <div className="conversation-details">

                                <div className="conversation-top">

                                  <strong>
                                    {
                                      conversation.name
                                    }
                                  </strong>

                                  <span>
                                    {
                                      conversation.time
                                    }
                                  </span>

                                </div>

                                <div className="conversation-bottom">

                                  <p>
                                    {
                                      conversation.lastMessage
                                    }
                                  </p>

                                  <span className="conversation-username">
                                    @
                                    {
                                      conversation.username
                                    }
                                  </span>

                                  {conversation.unreadCount >
                                    0 && (
                                    <span className="unread-count">
                                      {conversation.unreadCount >
                                      99
                                        ? "99+"
                                        : conversation.unreadCount}
                                    </span>
                                  )}

                                </div>

                              </div>

                            </button>
                          )
                        )

                      ) : (

                        <div className="conversation-no-results">

                          <span>
                            💬
                          </span>

                          <strong>
                            {searchTerm.trim()
                              ? "No conversations found"
                              : "No private chats yet"}
                          </strong>

                          <p>
                            {searchTerm.trim()
                              ? "Try searching for another name or username."
                              : "Start a conversation with someone on Fortune Chat."}
                          </p>

                        </div>
                      )}

                    </div>
                  )}

              </div>

            ) : (

              <div className="active-chat">

                <header className="active-chat-header">

                  <button
                    type="button"
                    className="chat-back-button"
                    onClick={
                      handleBackToConversations
                    }
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>

                  <div className="active-chat-user">

                    <div className="active-chat-avatar">

                      {selectedConversation.profilePicture ? (

                        <img
                          src={getMediaUrl(
                            selectedConversation.profilePicture
                          )}
                          alt={
                            selectedConversation.name
                          }
                        />

                      ) : (

                        selectedConversation.name
                          .charAt(0)
                          .toUpperCase()

                      )}

                      {selectedConversation.isOnline && (
                        <span className="online-dot" />
                      )}

                    </div>

                    <div>

                      <strong>
                        {
                          selectedConversation.name
                        }
                      </strong>

                      <span>
                        {
                          selectedConversation.isOnline
                            ? "Online"
                            : `@${selectedConversation.username}`
                        }
                      </span>

                    </div>

                  </div>

                  <button
                    type="button"
                    className="chat-more-button"
                    aria-label="More options"
                  >
                    ⋯
                  </button>

                </header>

                <div
                  className="messages-area"
                  ref={messagesAreaRef}
                >

                  <div className="message-date">
                    Today
                  </div>

                  {messagesLoading && (
                    <div className="conversation-no-results">

                      <span>
                        🔄
                      </span>

                      <strong>
                        Loading messages...
                      </strong>

                    </div>
                  )}

                  {!messagesLoading &&
                    messagesError && (
                      <div className="conversation-no-results">

                        <span>
                          ⚠️
                        </span>

                        <strong>
                          Unable to load messages
                        </strong>

                        <p>
                          {messagesError}
                        </p>

                      </div>
                    )}

                  {!messagesLoading &&
                    !messagesError &&
                    messages.length === 0 && (
                      <div className="conversation-no-results">

                        <span>
                          💬
                        </span>

                        <strong>
                          No messages yet
                        </strong>

                        <p>
                          Send the first message to start
                          the conversation.
                        </p>

                      </div>
                    )}

                  {!messagesLoading &&
                    !messagesError &&
                    messages.map((message) => {

                      const isSent =
                        message.senderId ===
                        user.id;

                      const isImage =
                        message.type ===
                          "image" &&
                        Boolean(
                          message.mediaUrl
                        );

                      const isFile =
                        message.type ===
                          "file" &&
                        Boolean(
                          message.mediaUrl
                        );

                      const isSticker =
                        message.type ===
                          "sticker" &&
                        Boolean(
                          message.mediaUrl
                        );

                      const isVoice =
                        message.type ===
                          "voice" &&
                        Boolean(
                          message.mediaUrl
                        );

                      return (
                        <div
                          key={message._id}
                          className={
                            isSent
                              ? "message sent"
                              : "message received"
                          }
                        >

                          {isImage ? (

                            <img
                              src={getMediaUrl(
                                message.mediaUrl
                              )}
                              alt={
                                message.fileName ||
                                "Shared image"
                              }
                              className="chat-message-image"
                            />

                          ) : isFile ? (

                            <a
                              href={getMediaUrl(
                                message.mediaUrl
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chat-file-message"
                            >

                              <span className="chat-file-icon">
                                {getFileIcon(
                                  message.fileName,
                                  message.mimeType
                                )}
                              </span>

                              <span className="chat-file-details">

                                <strong>
                                  {message.fileName ||
                                    "Shared file"}
                                </strong>

                                <small>
                                  {formatFileSize(
                                    message.fileSize
                                  )}
                                </small>

                              </span>

                              <span className="chat-file-open">
                                ↗
                              </span>

                            </a>

                          ) : isSticker ? (

                            <img
                              src={getMediaUrl(
                                message.mediaUrl
                              )}
                              alt="Fortune Chat sticker"
                              className="chat-message-sticker"
                            />

                          ) : isVoice ? (

                            <div className="chat-voice-message">

                              <div className="chat-voice-icon">
                                🎤
                              </div>

                              <div className="chat-voice-content">

                                <audio
                                  controls
                                  preload="metadata"
                                  src={getMediaUrl(
                                    message.mediaUrl
                                  )}
                                />

                                <small>
                                  Voice message
                                </small>

                              </div>

                            </div>

                          ) : (

                            <p>
                              {
                                message.text
                              }
                            </p>

                          )}

                          <span>
                            {formatMessageTime(
                              message.createdAt
                            )}

                            {isSent && (
                              <span className="message-read-status">
                                {" "}
                                {message.isRead
                                  ? "✓✓"
                                  : "✓"}
                              </span>
                            )}
                          </span>

                        </div>
                      );
                    })}

                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageSelected
                  }
                  style={{
                    display: "none",
                  }}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={
                    handleFileSelected
                  }
                  style={{
                    display: "none",
                  }}
                />

                {showStickerPicker && (
                  <div className="fortune-sticker-picker">

                    <div className="fortune-sticker-header">

                      <div>
                        <strong>
                          Stickers
                        </strong>

                        <span>
                          Pick a sticker to send
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleCloseStickerPicker
                        }
                        aria-label="Close sticker picker"
                      >
                        ×
                      </button>

                    </div>

                    <div className="fortune-sticker-grid">

                      {STICKERS.map(
                        (sticker) => (

                          <button
                            key={sticker.id}
                            type="button"
                            className="fortune-sticker-button"
                            title={sticker.name}
                            aria-label={`Send ${sticker.name} sticker`}
                            onClick={() =>
                              handleSendSticker(
                                sticker
                              )
                            }
                            disabled={
                              sendingMessage
                            }
                            style={{
                              background:
                                sticker.background,
                            }}
                          >

                            <span>
                              {sticker.emoji}
                            </span>

                          </button>

                        )
                      )}

                    </div>

                  </div>
                )}

                {showAttachmentMenu && (
                  <div className="message-attachment-menu">

                    <button
                      type="button"
                      onClick={
                        handlePhotoAttachment
                      }
                    >
                      📷
                      <span>
                        Photo
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleFileAttachment
                      }
                    >
                      📎
                      <span>
                        File
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleStickerAttachment
                      }
                    >
                      😊
                      <span>
                        Sticker
                      </span>
                    </button>

                  </div>
                )}

                <div className="message-input-area">

                  <button
                    type="button"
                    className={
                      showAttachmentMenu ||
                      showStickerPicker
                        ? "message-tool-button active"
                        : "message-tool-button"
                    }
                    aria-label="Add attachment"
                    onClick={
                      handleAttachmentClick
                    }
                    disabled={
                      isRecording ||
                      sendingMessage ||
                      sendingVoice
                    }
                  >
                    +
                  </button>

                  {isRecording ? (

                    <div className="voice-recording-area">

                      <span className="voice-recording-dot" />

                      <strong>
                        Recording
                      </strong>

                      <span>
                        {
                          formatRecordingTime(
                            recordingSeconds
                          )
                        }
                      </span>

                    </div>

                  ) : sendingVoice ? (

                    <div className="voice-recording-area">

                      <span className="voice-recording-dot" />

                      <strong>
                        Sending voice note...
                      </strong>

                    </div>

                  ) : (

                    <input
                      type="text"
                      placeholder="Write a message..."
                      value={
                        messageText
                      }
                      onChange={(event) =>
                        setMessageText(
                          event.target.value
                        )
                      }
                      onKeyDown={
                        handleMessageKeyDown
                      }
                      disabled={
                        sendingMessage ||
                        sendingVoice
                      }
                    />

                  )}

                  {messageText.trim() &&
                  !isRecording &&
                  !sendingVoice ? (

                    <button
                      type="button"
                      className="message-send-button"
                      aria-label="Send message"
                      onClick={
                        handleSendMessage
                      }
                      disabled={
                        sendingMessage
                      }
                    >
                      {sendingMessage
                        ? "..."
                        : "➤"}
                    </button>

                  ) : (

                    <button
                      type="button"
                      className={
                        isRecording
                          ? "message-microphone-button recording"
                          : "message-microphone-button"
                      }
                      aria-label={
                        isRecording
                          ? "Stop and send recording"
                          : "Record voice message"
                      }
                      onClick={
                        handleMicrophoneClick
                      }
                      disabled={
                        sendingMessage ||
                        sendingVoice
                      }
                    >
                      {isRecording
                        ? "■"
                        : "🎤"}
                    </button>

                  )}

                </div>

              </div>
            )}

          </>
        )}

        {/* =========================================
            WORLD CHAT
        ========================================= */}

        {activeSection === "world" && (
          <div className="chat-empty-state">

            <div className="chat-empty-icon">
              🌍
            </div>

            <span className="chat-section-badge">
              WORLD CHAT
            </span>

            <h1>
              Meet the world
            </h1>

            <p>
              Connect with people around the world.
              Send messages, photos and stickers.
            </p>

            <div className="world-chat-features">

              <span>
                💬 Messages
              </span>

              <span>
                📷 Photos
              </span>

              <span>
                ✨ Stickers
              </span>

            </div>

          </div>
        )}

        {/* =========================================
            PROFILE
        ========================================= */}

        {activeSection === "profile" && (
          <div className="profile-screen">

            <div
              className="profile-avatar"
              onClick={handleProfilePictureClick}
              role="button"
              tabIndex={0}
              aria-label="Change profile picture"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  handleProfilePictureClick();
                }
              }}
              style={{
                cursor: uploadingProfilePicture
                  ? "wait"
                  : "pointer",
                position: "relative",
                overflow: "hidden",
                borderRadius: "50%",
              }}
            >

              {user?.profilePicture ? (

                <img
                  src={getMediaUrl(
                    user.profilePicture
                  )}
                  alt={
                    user?.fullName ||
                    "Profile picture"
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "50%",
                  }}
                />

              ) : (

                user?.fullName
                  ?.charAt(0)
                  .toUpperCase() || "U"

              )}

              {uploadingProfilePicture && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "rgba(0, 0, 0, 0.55)",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  Uploading...
                </span>
              )}

            </div>

            <input
              ref={profilePictureInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleProfilePictureSelected
              }
              style={{
                display: "none",
              }}
            />

            <button
              type="button"
              className="fortune-id-copy-button"
              onClick={handleProfilePictureClick}
              disabled={uploadingProfilePicture}
              style={{
                marginTop: "14px",
              }}
            >
              {uploadingProfilePicture
                ? "Uploading..."
                : user?.profilePicture
                ? "Change Profile Picture"
                : "Add Profile Picture"}
            </button>

            {profilePictureError && (
              <p
                style={{
                  marginTop: "10px",
                  color: "#ff6b6b",
                  fontSize: "13px",
                  textAlign: "center",
                  maxWidth: "420px",
                }}
              >
                {profilePictureError}
              </p>
            )}

            <span className="chat-section-badge">
              YOUR PROFILE
            </span>

            <h1>
              {user?.fullName ||
                "Your Profile"}
            </h1>

            <p className="profile-username">
              @{user?.username ||
                "username"}
            </p>

            <div className="fortune-id-card">

              <div className="fortune-id-header">

                <div>

                  <span>
                    FORTUNE ID
                  </span>

                  <strong>
                    Your unique chat ID
                  </strong>

                </div>

                <div className="fortune-id-icon">
                  FC
                </div>

              </div>

              <div className="fortune-id-value">

                <span>
                  {user?.fortuneId ||
                    "Not available"}
                </span>

              </div>

              <button
                type="button"
                className="fortune-id-copy-button"
                onClick={
                  handleCopyFortuneId
                }
                disabled={
                  !user?.fortuneId
                }
              >
                Copy FC ID
              </button>

              <p className="fortune-id-help">
                Share your Fortune ID with people
                who want to find you on Fortune Chat.
              </p>

            </div>

          </div>
        )}

      </section>

    </main>
  );
}

export default Chat;