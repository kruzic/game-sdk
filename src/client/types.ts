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
  | "DELETE_USER_DATA";
