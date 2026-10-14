export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar?: string;
  isOnline: boolean;
}