# Design: Real-time Order Status & Chatbot dengan Akses Database

**Tanggal:** 2026-07-26
**Status:** Disetujui
**Scope:** Fondasi pembayaran real-time + chatbot dengan awareness database

## Latar Belakang

Evoste Web adalah e-commerce parfum dengan Midtrans sebagai payment gateway dan Ollama Cloud sebagai chatbot. Saat ini terdapat tiga gap yang mengganggu pengalaman:

1. **Status order selalu "pending"** — `/api/checkout` membuat order dengan `status: "pending"`, tapi tidak ada mekanisme untuk update status berdasarkan hasil pembayaran Midtrans. Akibatnya order tetap "pending" walaupun customer sudah bayar.

2. **Chatbot tidak aware database** — `SYSTEM_PROMPT` hardcoded dengan 5 produk. Setiap tambah produk perlu deploy ulang. Sistem prompt tidak bisa merepresentasikan state real-time aplikasi.

3. **Chatbot tidak bisa cek pesanan** — User tidak punya cara untuk menanyakan status pesanannya tanpa login ke dashboard.

## Tujuan

- Order status otomatis update saat customer menyelesaikan pembayaran (real-time atau near-real-time).
- Chatbot menyadari database live — bisa jawab pertanyaan tentang produk dan status pesanan.
- Customer bisa tanya pesanan via chatbot cukup dengan kode order (`EVO-XXX`).
- Privasi terjaga: customer hanya bisa akses order miliknya.

## Keputusan Desain

### Order Status Update: Hybrid (Webhook + Polling Fallback)

Dua endpoint dibutuhkan karena:

- **Webhook** (`POST /api/midtrans-webhook`) — cara canonical Midtrans. Midtrans push notifikasi saat status berubah. Real-time. Tapi butuh URL publik dan setup dashboard Midtrans.
- **Polling endpoint** (`POST /api/check-status`) — server query Midtrans API langsung. Tidak butuh webhook setup. Bekerja di localhost. Dipanggil dari `/checkout/success` page saat user landing.

Kombinasi: webhook untuk production real-time, polling sebagai fallback yang pasti berfungsi. Customer yang baru bayar dan kembali ke success page akan otomatis memicu status update.

### Chatbot Tool Calling: langsung ke Ollama

Ollama Cloud mendukung tool calling (function calling). Pattern:

```
[User message] → /api/chat → Ollama dengan tools
                                    ↓ (jika AI decide call tool)
[Tool handler] → Firestore via Admin SDK → return JSON
                                    ↓
[Ollama] → susun jawaban natural language → user
```

Pendekatan ini dibanding dengan regex extraction atau context injection karena:
- LLM bisa decide sendiri kapan perlu data (tidak selalu perlu query)
- Bisa handle multi-turn (AI bisa tanya klarifikasi)
- Lebih natural: AI yang tentukan parameter, server yang validasi

### Auth Customer: Firebase ID Token

Customer harus login. ID token (`auth.currentUser.getIdToken()`) dikirim via header `Authorization: Bearer <token>` ke `/api/chat`. Server verify via Firebase Auth REST API.

Order ownership diverifikasi dengan mencocokkan `customerDetails.email` di order dengan `email` dari token. Bila beda → return `null` (generic not-found, anti-enumeration).

## Arsitektur

### Komponen

1. **Webhook endpoint** — `src/app/api/midtrans-webhook/route.ts`
   - Terima POST dari Midtrans
   - Verify SHA-512 signature
   - Update order status di Firestore

2. **Status check endpoint** — `src/app/api/check-status/route.ts`
   - Terima POST `{ orderId }`
   - Query Midtrans: `GET https://api.sandbox.midtrans.com/v2/{orderId}/status`
   - Map status → update Firestore
   - Return status terkini

3. **Chat endpoint** (extend) — `src/app/api/chat/route.ts`
   - Verifikasi customer ID token
   - Forward messages + tools ke Ollama
   - Loop: handle tool_call → eksekusi → return ke AI
   - Final response ke client

4. **Client integration** — `src/components/chat/ChatbotWidget.tsx` + `src/app/checkout/success/page.tsx`
   - ChatbotWidget: kirim ID token via header
   - Success page: useEffect panggil `/api/check-status`

### Status Mapping

| Midtrans `transaction_status` | Firestore `status` |
|---|---|
| `capture` (credit card, fraud=accept) | `paid` |
| `settlement` | `paid` |
| `pending` | `pending` |
| `deny` | `failed` |
| `cancel` | `cancelled` |
| `expire` | `failed` |
| `refund` | `refunded` |
| `partial_refund` | `refunded` |

### Tools Schema (Ollama)

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Mendapatkan detail pesanan berdasarkan kode order. Wajib login sebagai customer yang memiliki order.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Kode order (contoh: EVO-1234567890)",
            pattern: "^EVO-[0-9]+$"
          }
        },
        required: ["order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "Mendapatkan daftar produk parfum EVOSTE yang tersedia.",
      parameters: {
        type: "object",
        properties: {
          in_stock_only: {
            type: "boolean",
            description: "Jika true, hanya tampilkan produk yang stoknya > 0",
            default: false
          }
        }
      }
    }
  }
];
```

### System Prompt Update

SYSTEM_PROMPT di-extend untuk mengarahkan AI:

```
Kamu adalah "Evoste Assistant", asisten virtual EVOSTE.

Tugas:
1. Jawab pertanyaan tentang produk — gunakan tool list_products.
2. Cek status pesanan — gunakan tool get_order.
3. Rekomendasi parfum sesuai preferensi user.
4. Arahkan ke katalog (#catalog) atau checkout.

PENTING:
- Selalu panggil tool jika perlu data real-time, jangan mengarang.
- Untuk get_order: minta kode order (format EVO-XXXX) jika user belum memberikan.
- Hasil tool akan diberikan dalam format JSON. Summarize dengan ramah.
- Jika order tidak ditemukan, jawab: "Maaf, saya tidak menemukan order tersebut dalam akun Anda. Mohon cek kembali kode order."
- Privasi: order milik orang lain sama dengan tidak ditemukan.
```

### Data Flow

**Order status update flow:**

```
[Customer bayar di Midtrans]
        ↓
[Midtrans] → POST /api/midtrans-webhook
                    ↓
            Verify signature (SHA-512)
                    ↓
            Update Firestore: orders/{orderId}
                    ↓
[OR]
[Customer] → /checkout/success?orderId=XXX
                    ↓
            useEffect → POST /api/check-status {orderId}
                    ↓
            Server query Midtrans API
                    ↓
            Update Firestore
                    ↓
            Page render status terkini
```

**Chatbot order lookup flow:**

```
[User] → "Cek order EVO-1234567890"
        ↓
[ChatbotWidget] → POST /api/chat
                  Headers: Authorization: Bearer <idToken>
                  Body: { messages: [...] }
        ↓
[/api/chat] → verifyAuth(idToken) → dapet email customer
        ↓
        Forward ke Ollama dengan tools
        ↓
[Ollama] → decide call tool → get_order({order_id: "EVO-1234567890"})
        ↓
[/api/chat] → Admin DB → adminDb.collection("orders").doc(orderId).get()
        ↓
        Verify order.customerDetails.email === auth.email
        ↓
        Return { found: true, order: {...} } atau { found: false }
        ↓
[Ollama] → susun jawaban natural → return ke client
        ↓
[ChatbotWidget] → render jawaban
```

### Pengamanan

1. **Webhook signature**: SHA-512 dari raw body + server key, compare dengan header `X-Signature`. Constant-time comparison.
2. **Polling endpoint**: butuh `orderId` saja, tapi order lookup butuh login customer (sama dengan get_order).
3. **Customer auth**: Bearer ID token di header. Server verify via Firebase Auth.
4. **Order ownership**: selalu cek `customerDetails.email` cocok dengan token email. Return generic null kalau beda.
5. **Idempotency**: skip update kalau `midtransTransactionStatus` lama ≤ `statusUpdatedAt` Firestore.
6. **Rate limiting**: `/api/chat` rate-limit per ID token (best-effort, sederhana).

## File yang Akan Disentuh

**Baru:**
- `src/app/api/midtrans-webhook/route.ts`
- `src/app/api/check-status/route.ts`

**Modifikasi:**
- `src/app/api/chat/route.ts` (tambah tools, auth, loop)
- `src/components/chat/ChatbotWidget.tsx` (kirim ID token)
- `src/app/checkout/success/page.tsx` (panggil check-status)
- `src/services/firebaseAdmin.ts` (jika perlu helper verify token)

## Testing

1. **Webhook test**: POST ke `/api/midtrans-webhook` dengan body + signature valid, invalid signature, expired order.
2. **Status check test**: panggil `/api/check-status` dengan orderId yang baru dibuat.
3. **End-to-end payment**: checkout → bayar di Midtrans sandbox → kembali ke success page → cek Firestore order status berubah ke `paid`.
4. **Chatbot order lookup**: 
   - Tanya "cek order EVO-XXX" (punya sendiri) → dapat info.
   - Tanya "cek order EVO-YYY" (orang lain) → "tidak ditemukan".
   - Tanya tanpa login → ditolak.
5. **Chatbot product lookup**: tanya "produk apa saja?" → AI panggil list_products.
6. **Idempotency**: panggil webhook 2x dengan status sama → Firestore tidak berubah 2x.

## Di Luar Scope

- Status `shipped` dan `delivered` (admin-marked) — perlu admin UI terpisah, di luar scope ini.
- Refund flow — di luar scope.
- Multiple orders in one query — user bisa tanya multiple orders satu-satu.
- Animated chat response (streaming) — di luar scope.
- Rate limiting implementation detail — bakal pakai best-effort sederhana.

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Ollama gpt-oss:120b tidak support tool calling | Fallback: regex detect order ID di message, fetch dulu, inject context |
| Midtrans webhook tidak sampai di localhost | Polling fallback dipanggil dari success page |
| ID token expired saat chat | Widget refresh token otomatis sebelum kirim |
| API rate limit Ollama | Batasi history messages (max 20) |
| Customer share order ID untuk enumerasi | Return generic "tidak ditemukan" untuk semua 404/403 |
