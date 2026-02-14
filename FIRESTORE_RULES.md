# Firestore Security Rules (MVP)

Wklej poniższe reguły do Firebase Console → Firestore Database → Rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{uid} {
      allow read, write: if isAuthenticated() && (
        request.auth.uid == uid || isAdmin()
      );
    }

    match /tasks/{taskId} {
      allow read, write: if isAuthenticated() && (
        isAdmin() ||
        resource.data.assignedToUid == request.auth.uid ||
        resource.data.createdByUid == request.auth.uid ||
        request.resource.data.assignedToUid == request.auth.uid ||
        request.resource.data.createdByUid == request.auth.uid
      );
    }
  }
}
```

## Uwagi
- Reguły admina opierają się na `users/{uid}.role`.
- Aplikacja i tak ogranicza listę zadań dla usera do `assignedToUid == request.auth.uid`.
