# @kruzic/game-sdk

[![npm version](https://img.shields.io/npm/v/@kruzic/game-sdk.svg)](https://www.npmjs.com/package/@kruzic/game-sdk)

SDK za pravljenje igara na [Kružić](https://kruzic.rs) platformi.

> **Demo projekat:** Pogledaj [sdk-demo](https://github.com/kruzic/sdk-demo) za kompletan primer korišćenja SDK-a.

## Instalacija

```bash
npm install @kruzic/game-sdk
```

## Brzi početak

```typescript
import { KruzicClient } from "@kruzic/game-sdk/client";

const sdk = new KruzicClient();

// Obavesti platformu da je igra spremna
sdk.ready();

// Proveri da li je korisnik prijavljen
const prijavljen = await sdk.isSignedIn();

// Dobij podatke o korisniku
const korisnik = await sdk.getUserDetails();
console.log(korisnik?.name);

// Sačuvaj podatke
await sdk.setData("highscore", 1000);

// Učitaj podatke
const highscore = await sdk.getData("highscore");
```

## Client API

Klijentski SDK se koristi u igrama koje se pokreću unutar Kružić iframe-a.

### `new KruzicClient(options?)`

Kreiraj novi SDK klijent.

```typescript
const sdk = new KruzicClient({
  devMode: true,  // Koristi localStorage za lokalni razvoj
  gameId: "moja-igra"  // Koristi se za localStorage ključeve u dev modu
});
```

### `sdk.ready()`

Obaveštava platformu da je igra učitana i spremna. Pozovi ovu funkciju kada se igra inicijalizuje.

### `sdk.isSignedIn(): Promise<boolean>`

Proverava da li je korisnik prijavljen.

### `sdk.getUserId(): Promise<string | null>`

Vraća ID korisnika. Vraća `null` za goste.

### `sdk.getUserDetails(): Promise<UserDetails | null>`

Vraća detalje o korisniku uključujući ime i sliku profila.

```typescript
interface UserDetails {
  id: string;
  name: string | null;
  image: string | null;
}
```

### `sdk.getData<T>(key: string): Promise<T | null>`

Učitava sačuvanu vrednost za trenutnog korisnika.

### `sdk.setData<T>(key: string, value: T): Promise<void>`

Čuva vrednost za trenutnog korisnika. Vrednost može biti bilo koji JSON-serializabilan tip.

### `sdk.deleteData(key: string): Promise<void>`

Briše sačuvanu vrednost.

### `sdk.listData(): Promise<string[]>`

Vraća listu svih sačuvanih ključeva za trenutnog korisnika.

### `sdk.destroy()`

Čisti event listenere. Pozovi kada uništavaš igru.

## Dev Mode

Kada razvijaš lokalno (van Kružić iframe-a), SDK automatski prelazi u dev mode:

- Koristi `localStorage` umesto postMessage komunikacije
- Simulira prijavljenog korisnika sa ID-jem "dev-user"
- Sve metode rade normalno za testiranje

Možeš i eksplicitno uključiti dev mode:

```typescript
const sdk = new KruzicClient({ devMode: true });
```

## Server API

Za igre sa backend serverom, koristi server SDK za pristup podacima preko REST API-ja.

```typescript
import { KruzicServer } from "@kruzic/game-sdk/server";

const sdk = new KruzicServer({
  apiKey: process.env.KRUZIC_API_KEY,
  gameId: "id-tvoje-igre"
});

// Dobij podatke korisnika (userId dobijaš iz client SDK-a)
const data = await sdk.getUserData(userId, "highscore");

// Sačuvaj podatke korisnika
await sdk.setUserData(userId, "highscore", 1000);
```

## Primer: Čuvanje napretka

```typescript
import { KruzicClient } from "@kruzic/game-sdk/client";

const sdk = new KruzicClient();

interface GameProgress {
  level: number;
  coins: number;
  achievements: string[];
}

async function ucitajNapredak(): Promise<GameProgress> {
  const sacuvano = await sdk.getData<GameProgress>("progress");
  return sacuvano ?? { level: 1, coins: 0, achievements: [] };
}

async function sacuvajNapredak(napredak: GameProgress) {
  await sdk.setData("progress", napredak);
}

// Na početku igre
sdk.ready();
const napredak = await ucitajNapredak();

// Posle završenog nivoa
napredak.level++;
napredak.coins += 100;
await sacuvajNapredak(napredak);
```

## Čuvanje podataka

- **Prijavljeni korisnici**: Podaci se čuvaju na Kružić serverima i sinhronizuju između uređaja
- **Gosti**: Podaci se čuvaju u localStorage browsera

## TypeScript podrška

Ovaj paket uključuje TypeScript definicije. Sve metode su potpuno tipizirane.

## Licenca

MIT
