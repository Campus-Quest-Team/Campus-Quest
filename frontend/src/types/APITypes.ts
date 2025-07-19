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