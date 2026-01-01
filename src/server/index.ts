import type { KruzicServerOptions, UserDataResponse, ApiKeyValidation } from "./types";

export type { KruzicServerOptions, UserDataResponse, ApiKeyValidation } from "./types";

export class KruzicServer {
  private apiKey: string;
  private gameId: string;
  private baseUrl: string;

  constructor(options: KruzicServerOptions) {
    this.apiKey = options.apiKey;
    this.gameId = options.gameId;
    this.baseUrl = options.baseUrl || "https://www.kruzic.rs";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/sdk${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Game-ID": this.gameId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate the API key
   */
  async validateKey(): Promise<ApiKeyValidation> {
    return this.request<ApiKeyValidation>("/auth");
  }

  /**
   * Get a stored value for a user
   */
  async getUserData<T = unknown>(userId: string, key: string): Promise<T | null> {
    const result = await this.request<UserDataResponse<T>>(
      `/data?userId=${encodeURIComponent(userId)}&key=${encodeURIComponent(key)}`
    );
    return result.data ?? null;
  }

  /**
   * Store a value for a user
   */
  async setUserData<T = unknown>(
    userId: string,
    key: string,
    value: T
  ): Promise<void> {
    await this.request<UserDataResponse>("/data", {
      method: "POST",
      body: JSON.stringify({ userId, key, value }),
    });
  }

  /**
   * Delete a stored value for a user
   */
  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.request<UserDataResponse>(
      `/data?userId=${encodeURIComponent(userId)}&key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
  }

  /**
   * List all stored keys for a user
   */
  async listUserData(userId: string): Promise<string[]> {
    const result = await this.request<UserDataResponse<string[]>>(
      `/data/list?userId=${encodeURIComponent(userId)}`
    );
    return result.data ?? [];
  }
}
