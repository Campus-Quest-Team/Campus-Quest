import type { FeedPost, FriendData, LeaderboardEntry, ProfileData } from "./dashboardTypes";

export interface LoginInfo {
  accessToken: string;
  userId: string;
}

export interface UserPayload {
  userId: string;
  firstName: string;
  lastName: string;
  iat: number;
}
export interface FeedResponse {
  feed: FeedPost[];
  jwtToken: string;
}
export interface ProfileResponse {
  profileData: ProfileData;
  jwtToken: string;
}
export interface FriendsResponse {
  friends: FriendData[];
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

export interface LeaderboardResponse {
  scoreboard: LeaderboardEntry[];
  jwtToken: string;
}