# @kruzic/game-sdk

SDK for building games on the [Kruzic](https://kruzic.rs) platform.

## Installation

```bash
npm install @kruzic/game-sdk
```

## Quick Start

```typescript
import { KruzicClient } from "@kruzic/game-sdk/client";

const sdk = new KruzicClient();

// Signal that your game is ready
sdk.ready();

// Check if user is signed in
const isSignedIn = await sdk.isSignedIn();

// Get user details
const user = await sdk.getUserDetails();
console.log(user?.name);

// Save user data
await sdk.setData("highscore", 1000);

// Load user data
const highscore = await sdk.getData("highscore");
```

## Client API

The client SDK is used in games running inside the Kruzic iframe.

### `new KruzicClient(options?)`

Create a new SDK client.

```typescript
const sdk = new KruzicClient({
  devMode: true,  // Use localStorage for local development
  gameId: "my-game"  // Used for localStorage keys in dev mode
});
```

### `sdk.ready()`

Signal that your game has loaded and is ready to play. Call this once your game initializes.

### `sdk.isSignedIn(): Promise<boolean>`

Check if the current user is signed in.

### `sdk.getUserId(): Promise<string | null>`

Get the current user's ID. Returns `null` for guests.

### `sdk.getUserDetails(): Promise<UserDetails | null>`

Get user details including name and profile picture.

```typescript
interface UserDetails {
  id: string;
  name: string | null;
  image: string | null;
}
```

### `sdk.getData<T>(key: string): Promise<T | null>`

Load a stored value for the current user.

### `sdk.setData<T>(key: string, value: T): Promise<void>`

Save a value for the current user. The value can be any JSON-serializable type.

### `sdk.deleteData(key: string): Promise<void>`

Delete a stored value.

### `sdk.listData(): Promise<string[]>`

List all stored keys for the current user.

### `sdk.destroy()`

Clean up event listeners. Call this when unmounting your game.

## Dev Mode

When developing locally (outside the Kruzic iframe), the SDK automatically switches to dev mode:

- Uses `localStorage` instead of postMessage communication
- Simulates a signed-in user with ID "dev-user"
- All methods work normally for testing

You can also enable dev mode explicitly:

```typescript
const sdk = new KruzicClient({ devMode: true });
```

## Server API

For games with a backend server, use the server SDK to access user data via REST API.

```typescript
import { KruzicServer } from "@kruzic/game-sdk/server";

const sdk = new KruzicServer({
  apiKey: process.env.KRUZIC_API_KEY,
  gameId: "your-game-id"
});

// Get user data (userId obtained from client SDK)
const data = await sdk.getUserData(userId, "highscore");

// Set user data
await sdk.setUserData(userId, "highscore", 1000);
```

## Example: Saving Game Progress

```typescript
import { KruzicClient } from "@kruzic/game-sdk/client";

const sdk = new KruzicClient();

interface GameProgress {
  level: number;
  coins: number;
  achievements: string[];
}

async function loadProgress(): Promise<GameProgress> {
  const saved = await sdk.getData<GameProgress>("progress");
  return saved ?? { level: 1, coins: 0, achievements: [] };
}

async function saveProgress(progress: GameProgress) {
  await sdk.setData("progress", progress);
}

// On game start
sdk.ready();
const progress = await loadProgress();

// After completing a level
progress.level++;
progress.coins += 100;
await saveProgress(progress);
```

## Data Storage

- **Signed-in users**: Data is stored on Kruzic servers and synced across devices
- **Guests**: Data is stored in the browser's localStorage

## TypeScript Support

This package includes TypeScript definitions. All methods are fully typed.

## License

MIT
