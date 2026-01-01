export interface KruzicServerOptions {
  apiKey: string;
  gameId: string;
  baseUrl?: string;
}

export interface UserDataResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiKeyValidation {
  valid: boolean;
  gameId?: string;
  developerId?: string;
  error?: string;
}
