# scripts/promote-admin.js

Promosikan akun Firebase Auth manapun menjadi **admin** di Firestore.

## Cara Pakai

```bash
node scripts/promote-admin.js admin-evoste1@gmail.com
```

Output yang diharapkan:

```
🔍  Mencari UID untuk email: admin-evoste1@gmail.com ...
✅  Ditemukan UID: AbCdEf123...
🛡️   Mengatur role: "admin" di users/AbCdEf123 ...
🎉  Sukses! User admin-evoste1@gmail.com sekarang adalah admin.

Silakan login di http://localhost:3000/admin/login
```

## Prasyarat

Pastikan `.env` di root project memuat:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=evoste1
```

## Jika Gagal dengan Error "Permission Denied"

Firestore rules deployed tidak mengizinkan tulis ke `users/{uid}` dari REST API. Solusi:

1. Buka https://console.firebase.google.com/project/evoste1/firestore/rules
2. Pastikan ada rule untuk collection `users` yang mengizinkan user menulis field `role` ke dokumen miliknya sendiri, atau gunakan admin SDK.
3. Atau gunakan cara manual via Firebase Console (lihat README utama).
