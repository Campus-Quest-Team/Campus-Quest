import type { LoginInfo } from "./APITypes";

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

export type ProfileData = {
  displayName: string;
  bio: string;
  pfp: string;
  questPosts?: FeedPost[];
  questCompleted: number;
};

export interface FriendData {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

/* -- Properties -- */
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
  isProfileView?: boolean;
  isFriend?: boolean;
  friendId?: string;
}

export interface PopupProps {
  loginInfo: LoginInfo;
  onClose: () => void;
}