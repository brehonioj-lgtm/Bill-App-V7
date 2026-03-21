# Monthly Bills V11 Cloud Sync

This version keeps the full polished UI and adds Firebase cloud sync.

## What cloud sync gives you
- restore data after clear data / reinstall
- same bills on another device
- automatic backup

## Important
This zip is **cloud-ready**, but you still need your own Firebase project config.

## Setup
1. Create a Firebase project
2. Enable:
   - Authentication -> Anonymous
   - Firestore Database
3. Copy `.env.example` to `.env`
4. Fill the Firebase values
5. Deploy again

## Firestore rule starter
Use something like this while testing:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /monthlyBillsUsers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
