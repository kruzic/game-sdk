import type { SDKMessage, SDKResponse, UserDetails, MessageType } from "./types";

export type { UserDetails } from "./types";

export interface KruzicClientOptions {
  /** Enable dev mode - uses localStorage instead of postMessage when not in iframe */
  devMode?: boolean;
  /** Game ID for localStorage keys in dev mode */
  gameId?: string;
}

export class KruzicClient {
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (data: unknown) => void; reject: (error: Error) => void }
  >();
  private parentOrigin: string;
  private isIframe: boolean;
  private isWebView: boolean;
  private isEmbedded: boolean;
  private devMode: boolean;
  private gameId: string;

  constructor(options: KruzicClientOptions = {}) {
    this.isIframe = typeof window !== "undefined" && window.parent !== window;
    this.isWebView = typeof window !== "undefined" && !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    this.isEmbedded = this.isIframe || this.isWebView;
    this.parentOrigin = "*"; // Will be restricted by host
    this.devMode = options.devMode ?? !this.isEmbedded;
    this.gameId = options.gameId ?? "dev-game";

    if (this.isEmbedded) {
      window.addEventListener("message", this.handleMessage.bind(this));
    }

    if (this.devMode && !this.isEmbedded) {
      console.log("[Kružić SDK] Running in dev mode - using localStorage");
    }

    if (this.isWebView) {
      console.log("[Kružić SDK] Running in React Native WebView");
    }
  }

  private getStorageKey(key: string): string {
    return `kruzic_${this.gameId}_dev_${key}`;
  }

  private handleMessage(event: MessageEvent) {
    const response = event.data as SDKResponse;

    if (response.type !== "RESPONSE") return;

    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) return;

    this.pendingRequests.delete(response.requestId);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || "Unknown error"));
    }
  }

  private postToHost(message: SDKMessage): void {
    if (this.isWebView) {
      // React Native WebView
      (window as unknown as { ReactNativeWebView: { postMessage: (msg: string) => void } }).ReactNativeWebView.postMessage(JSON.stringify(message));
    } else if (this.isIframe) {
      // Browser iframe
      window.parent.postMessage(message, this.parentOrigin);
    }
  }

  private send<T = unknown>(type: MessageType, payload?: unknown): Promise<T> {
    // In dev mode without embedding, we don't send messages
    if (!this.isEmbedded && !this.devMode) {
      return Promise.reject(new Error("SDK must be used within Kružić iframe or WebView"));
    }

    // Dev mode - handled locally, no message needed
    if (this.devMode && !this.isEmbedded) {
      return Promise.reject(new Error("Use dev mode methods directly"));
    }

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, {
        resolve: resolve as (data: unknown) => void,
        reject,
      });

      const message: SDKMessage = {
        type,
        requestId: id,
        payload,
      };

      this.postToHost(message);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${type}`));
        }
      }, 10000);
    });
  }

  /**
   * Signal that the game has loaded and is ready
   */
  ready(): void {
    if (!this.isEmbedded) {
      if (this.devMode) {
        console.log("[Kružić SDK] Game ready (dev mode)");
      }
      return;
    }

    const message: SDKMessage = {
      type: "GAME_READY",
      requestId: ++this.requestId,
    };

    this.postToHost(message);
  }

  /**
   * Check if the current user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    if (this.devMode && !this.isEmbedded) {
      // In dev mode, always return true for testing
      return true;
    }
    const result = await this.send<{ signedIn: boolean }>("IS_USER_SIGNED_IN");
    return result.signedIn;
  }

  /**
   * Get the current user's details (if signed in)
   */
  async getUserDetails(): Promise<UserDetails | null> {
    if (this.devMode && !this.isEmbedded) {
      return {
        id: "dev-user",
        name: "Dev User",
        image: null,
      };
    }
    return this.send<UserDetails | null>("GET_USER_DETAILS");
  }

  /**
   * Get the current user's ID (for server-side API calls)
   */
  async getUserId(): Promise<string | null> {
    if (this.devMode && !this.isEmbedded) {
      return "dev-user";
    }
    const result = await this.send<{ userId: string | null }>("GET_USER_ID");
    return result.userId;
  }

  /**
   * Get a stored value for the current user
   */
  async getData<T = unknown>(key: string): Promise<T | null> {
    if (this.devMode && !this.isEmbedded) {
      const storageKey = this.getStorageKey(key);
      const value = localStorage.getItem(storageKey);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    }
    return this.send<T | null>("GET_USER_DATA", { key });
  }

  /**
   * Store a value for the current user
   */
  async setData<T = unknown>(key: string, value: T): Promise<void> {
    if (this.devMode && !this.isEmbedded) {
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(value));
      return;
    }
    await this.send("SET_USER_DATA", { key, value });
  }

  /**
   * Delete a stored value for the current user
   */
  async deleteData(key: string): Promise<void> {
    if (this.devMode && !this.isEmbedded) {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
      return;
    }
    await this.send("DELETE_USER_DATA", { key });
  }

  /**
   * List all stored keys for the current user
   */
  async listData(): Promise<string[]> {
    if (this.devMode && !this.isEmbedded) {
      const prefix = this.getStorageKey("");
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keys.push(key.slice(prefix.length));
        }
      }
      return keys;
    }
    return this.send<string[]>("LIST_USER_DATA");
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    window.removeEventListener("message", this.handleMessage.bind(this));
    this.pendingRequests.clear();
  }
}
