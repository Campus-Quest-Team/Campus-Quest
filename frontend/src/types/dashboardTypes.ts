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

export type ProfileData = {
  displayName: string;
  bio: string;
  pfp: string;
  questPosts?: FeedPost[];
  questCompleted: number;
};


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
    questData: Record<string, unknown>;
    questDescription: string;

  };
  timestamp: string;
}

export interface PostCardProps {
  userId: string;
  jwtToken: string;
  postId: string;
  user: string;
  title: string;
  imageUrl: string;
  timeStamp: string;
  caption: string;
  liked: boolean;
  likes: number;
  pfp: string;
  onHide: (postId: string) => void;
}

export interface SidebarProps {
  loginInfo: LoginInfo;
  onProfileChange: (profile: ProfileData) => void;
}

export interface ProfileEditProps {
  loginInfo: LoginInfo;
  onClose: () => void;
}