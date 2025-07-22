import type { LoginInfo } from "./APITypes";

export interface QuestPost {
  _id: string;
  questId: string;
  userId: string;
  caption: string;
  questDescription: string;
  likes: number;
  flagged: number;
  timeStamp: string;
  likedBy: string[];
  flaggedBy: string[];
  mediaUrl: string;
}

export interface FeedPost {
  postId: string;
  caption: string;
  questDescription: string;
  likes: number;
  flagged: number;
  timeStamp: string;
  likedBy: string[];
  flaggedBy: string[];
  mediaUrl: string;
  creator: {
    userId: string;
    displayName: string;
    pfpUrl: string;
  };
}

export interface FeedResponse {
  feed: FeedPost[];
  jwtToken: string;
}

export interface ProfileData {
  questCompleted: number;
  displayName: string;
  pfp: string;
  questPosts: QuestPost[];
}

export interface ProfileResponse {
  profileData: ProfileData;
  jwtToken: string;
}

export interface FriendData {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

export interface FriendsResponse {
  friends: FriendData[];
  jwtToken: string;
}


export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

export interface LeaderboardResponse {
  scoreboard: LeaderboardEntry[];
  jwtToken: string;
}

export interface CurrentQuestResponse {
  success: boolean;
  currentQuest: {
    questId: string;
    timestamp: string;
    questData: any; // refine this if you know its shape
  };
  questDescription: string;
  timestamp: string;
}

export interface PostCardProps {
  user: string;
  title: string;
  imageUrl: string;
  caption: string;
  likes: number;
  pfp: string;
}

export interface SidebarProps {
  loginInfo: LoginInfo;
  onProfileChange: (profile: ProfileData) => void;
}

export interface ProfileEditProps {
  loginInfo: LoginInfo;
  onClose: () => void;
}