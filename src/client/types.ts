export interface SDKMessage {
  type: string;
  requestId: number;
  payload?: unknown;
}

export interface SDKResponse {
  type: "RESPONSE";
  requestId: number;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface UserDetails {
  id: string;
  name: string;
  image: string | null;
}

export type MessageType =
  | "GAME_READY"
  | "IS_USER_SIGNED_IN"
  | "GET_USER_DETAILS"
  | "GET_USER_ID"
  | "GET_USER_DATA"
  | "SET_USER_DATA"
  | "LIST_USER_DATA"
  | "DELETE_USER_DATA"
  | "GET_DATA_SCHEMA"
  | "GET_LEADERBOARD"
  | "GET_MY_RANK"
  | "INCREMENT_DATA";

export type SchemaFieldType = "string" | "number" | "json";

export interface SchemaField {
  apiName: string;
  type: SchemaFieldType;
  clientRead: boolean;
  clientWrite: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  tag: string | null;
  name: string;
  image: string | null;
  value: number;
  formattedValue: string;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  total: number;
  userRank?: { rank: number; value: number; formattedValue: string } | null;
  fieldInfo: {
    apiName: string;
    displayName: string;
    displayTemplate: string | null;
    leaderboardSort: "asc" | "desc";
  };
}

export interface UserRankResult {
  rank: number;
  value: number;
  formattedValue: string;
}
