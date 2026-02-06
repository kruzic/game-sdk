import type {
  SDKMessage,
  SDKResponse,
  UserDetails,
  MessageType,
  SchemaField,
  LeaderboardResult,
  UserRankResult,
} from "./types";

export type {
  UserDetails,
  SchemaField,
  SchemaFieldType,
  LeaderboardEntry,
  LeaderboardResult,
  UserRankResult,
} from "./types";

export interface KruzicClientOptions {
  /** Uključuje dev mode - koristi localStorage umesto postMessage kada nije u iframe-u */
  devMode?: boolean;
  /** ID igre za localStorage ključeve u dev mode-u */
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
    this.parentOrigin = "*"; // Host će ograničiti origin
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
    // Bez embedding-a i dev mode-a, ne šaljemo poruke
    if (!this.isEmbedded && !this.devMode) {
      return Promise.reject(new Error("SDK must be used within Kružić iframe or WebView"));
    }

    // Dev mode - obrađuje se lokalno, poruka nije potrebna
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

      // Timeout nakon 10 sekundi
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${type}`));
        }
      }, 10000);
    });
  }

  /**
   * Obaveštava platformu da je igra učitana i spremna.
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
   * Proverava da li je korisnik prijavljen.
   */
  async isSignedIn(): Promise<boolean> {
    if (this.devMode && !this.isEmbedded) {
      // U dev mode-u uvek vraća true za testiranje
      return true;
    }
    const result = await this.send<{ signedIn: boolean }>("IS_USER_SIGNED_IN");
    return result.signedIn;
  }

  /**
   * Vraća detalje o trenutnom korisniku (ako je prijavljen).
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
   * Vraća ID trenutnog korisnika (za server-side API pozive).
   */
  async getUserId(): Promise<string | null> {
    if (this.devMode && !this.isEmbedded) {
      return "dev-user";
    }
    const result = await this.send<{ userId: string | null }>("GET_USER_ID");
    return result.userId;
  }

  /**
   * Vraća sačuvanu vrednost za trenutnog korisnika.
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
   * Čuva vrednost za trenutnog korisnika.
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
   * Briše sačuvanu vrednost za trenutnog korisnika.
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
   * Vraća listu svih sačuvanih ključeva za trenutnog korisnika.
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
   * Vraća data schema za ovu igru.
   * Vraća null ako schema nije definisana.
   */
  async getDataSchema(): Promise<SchemaField[] | null> {
    if (this.devMode && !this.isEmbedded) {
      // Nema schema validacije u dev mode-u
      return null;
    }
    return this.send<SchemaField[] | null>("GET_DATA_SCHEMA");
  }

  /**
   * Vraća leaderboard unose za dato polje.
   * @param field API naziv polja
   * @param options Opcije za paginaciju
   */
  async getLeaderboard(
    field: string,
    options?: { limit?: number; offset?: number }
  ): Promise<LeaderboardResult | null> {
    if (this.devMode && !this.isEmbedded) {
      // Nema leaderboard-a u dev mode-u
      return null;
    }
    return this.send<LeaderboardResult | null>("GET_LEADERBOARD", {
      field,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  /**
   * Vraća rang trenutnog korisnika za dato leaderboard polje.
   * @param field API naziv polja
   */
  async getMyRank(field: string): Promise<UserRankResult | null> {
    if (this.devMode && !this.isEmbedded) {
      // Nema leaderboard-a u dev mode-u
      return null;
    }
    return this.send<UserRankResult | null>("GET_MY_RANK", { field });
  }

  /**
   * Atomski inkrementira numeričku vrednost za trenutnog korisnika.
   * @param key Ključ podatka za increment
   * @param delta Vrednost za dodavanje (može biti negativna)
   */
  async increment(key: string, delta: number = 1): Promise<void> {
    if (this.devMode && !this.isEmbedded) {
      const storageKey = this.getStorageKey(key);
      const current = localStorage.getItem(storageKey);
      const currentValue = current ? JSON.parse(current) : 0;
      const newValue = (typeof currentValue === "number" ? currentValue : 0) + delta;
      localStorage.setItem(storageKey, JSON.stringify(newValue));
      return;
    }
    await this.send("INCREMENT_DATA", { key, delta });
  }

  /**
   * Čisti event listener-e.
   */
  destroy(): void {
    window.removeEventListener("message", this.handleMessage.bind(this));
    this.pendingRequests.clear();
  }
}
