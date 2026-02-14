# Marlboro (MVP #1)

Minimalna aplikacja kancelaryjna oparta o **Next.js (App Router) + TypeScript + Firebase (Auth + Firestore)**.

## Funkcje
- Logowanie przez Google (Firebase Auth).
- Zapisywanie/aktualizacja profilu użytkownika w `users/{uid}` po logowaniu.
- Role `admin` / `user` na podstawie `NEXT_PUBLIC_ADMIN_EMAILS`.
- Moduł zadań (`tasks/{taskId}`): tworzenie, edycja, oznaczanie done/open, usuwanie.
- Realtime odświeżanie list zadań (`onSnapshot`).
- Filtry: Dziś / 7 dni / Po terminie / Wszystkie + liczniki.
- Stały przycisk „Zadania” w prawym górnym rogu po zalogowaniu.

## Wymagania
- Node.js 18+
- Projekt Firebase z włączonym:
  - Authentication → Google provider
  - Firestore Database

## Konfiguracja
1. Skopiuj env:

```bash
cp .env.example .env.local
```

2. Uzupełnij `.env.local` wartościami Firebase (`NEXT_PUBLIC_FIREBASE_*`) i listą adminów (`NEXT_PUBLIC_ADMIN_EMAILS`).

3. W Firebase Console ustaw reguły z pliku `FIRESTORE_RULES.md`.

## Uruchomienie lokalne
```bash
npm i
npm run dev
```

Aplikacja będzie dostępna na `http://localhost:3000`.

## Struktura
- `app/` — App Router, strona logowania/dashboard.
- `contexts/AuthContext.tsx` — klientowy provider Auth + synchronizacja `users/{uid}`.
- `components/TasksDrawer.tsx` — panel zadań i operacje CRUD.
- `lib/firebase.ts` — inicjalizacja Firebase modular SDK.
