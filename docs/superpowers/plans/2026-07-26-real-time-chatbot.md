# Real-time Chatbot + Order Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Midtrans order status auto-update + chatbot dengan akses real-time ke orders dan products.

**Architecture:** Hybrid webhook + polling untuk payment status. Tool calling dengan Ollama untuk chatbot. Firebase Admin SDK untuk semua server-side queries. Customer ID token untuk auth.

**Tech Stack:** Next.js 15 App Router, TypeScript, Firebase Admin SDK v14, Midtrans Snap, Ollama Cloud (gpt-oss:120b), Firebase Auth (REST API untuk verify token).

## Global Constraints

- **Status mapping**: Midtrans `settlement`/`capture` → `paid`; `deny`/`expire` → `failed`; `cancel` → `cancelled`; `refund`/`partial_refund` → `refunded`.
- **Order ID format**: `EVO-{timestamp}` (misal `EVO-1785042933`).
- **Privacy**: order GET returns `null` untuk not-found atau bukan milik customer (anti-enumeration).
- **Idempotency**: skip update kalau `statusUpdatedAt` di Firestore > timestamp Midtrans notification.
- **Server key**: gunakan `process.env.MIDTRANS_SERVER_KEY` yang sudah ada.
- **Webhook signature**: SHA-512 raw body + server key, compare dengan header `X-Signature` (constant-time).
- **Midtrans env**: `NEXT_PUBLIC_MIDTRANS_USE_PROD=0` untuk sandbox.
- **Firebase Admin**: pakai `getAdminDb()` dari `src/services/firebaseAdmin.ts` (sudah ada).
- **File pattern**: gunakan pattern dari `/api/checkout/route.ts` (existing file) sebagai referensi.
- **Commit**: gunakan co-author `"Co-Authored-By: Claude <noreply@anthropic.com>"`.

---

## Task 1: Midtrans Webhook Endpoint

**Files:**
- Create: `src/app/api/midtrans-webhook/route.ts`

**Interfaces:**
- Consumes: `process.env.MIDTRANS_SERVER_KEY`
- Produces: Updates Firestore `orders/{orderId}` dengan `status`, `statusUpdatedAt`, `midtransTransactionStatus`

- [ ] **Step 1: Create webhook handler skeleton**

```typescript
// src/app/api/midtrans-webhook/route.ts
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/services/firebaseAdmin";

export const dynamic = "force-dynamic";

interface MidtransNotification {
  transaction_status: string;
  order_id: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
}

const STATUS_MAP: Record<string, string> = {
  capture: "paid",
  settlement: "paid",
  pending: "pending",
  deny: "failed",
  cancel: "cancelled",
  expire: "failed",
  refund: "refunded",
  partial_refund: "refunded",
};

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const expected = createHash("sha512")
      .update(body + serverKey)
      .digest("hex");

    if (signature !== expected) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data: MidtransNotification = JSON.parse(body);
    const newFirestoreStatus = STATUS_MAP[data.transaction_status] || "pending";

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(data.order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("[Webhook] Order not found:", data.order_id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Idempotency: skip jika status sudah sama
    const current = orderSnap.data();
    if (current?.status === newFirestoreStatus) {
      return NextResponse.json({ ok: true, status: "no_change" });
    }

    await orderRef.update({
      status: newFirestoreStatus,
      midtransTransactionStatus: data.transaction_status,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      paymentInfo: {
        fraud_status: data.fraud_status || null,
        gross_amount: data.gross_amount || null,
        status_code: data.status_code || null,
      },
    });

    return NextResponse.json({ ok: true, status: newFirestoreStatus });
  } catch (err: any) {
    console.error("[Webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/midtrans-webhook/route.ts
git commit -m "feat: Midtrans webhook endpoint dengan signature verification"
```

---

## Task 2: Check Status Endpoint (Polling Fallback)

**Files:**
- Create: `src/app/api/check-status/route.ts`

**Interfaces:**
- Consumes: POST body `{ orderId: string }`
- Produces: `200 { status, midtransTransactionStatus }` atau error

- [ ] **Step 1: Create check-status handler**

```typescript
// src/app/api/check-status/route.ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/services/firebaseAdmin";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, string> = {
  capture: "paid",
  settlement: "paid",
  pending: "pending",
  deny: "failed",
  cancel: "cancelled",
  expire: "failed",
  refund: "refunded",
  partial_refund: "refunded",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId tidak valid" },
        { status: 400 },
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const baseUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_USE_PROD === "1"
        ? "https://api.midtrans.com"
        : "https://api.sandbox.midtrans.com";

    // Query Midtrans status API
    const auth = Buffer.from(serverKey + ":").toString("base64");
    const res = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[CheckStatus] Midtrans error:", res.status, errBody);
      return NextResponse.json(
        { error: "Gagal cek status ke Midtrans" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const newFirestoreStatus =
      STATUS_MAP[data.transaction_status] || "pending";

    // Update Firestore
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const current = orderSnap.data();
    if (current?.status !== newFirestoreStatus) {
      await orderRef.update({
        status: newFirestoreStatus,
        midtransTransactionStatus: data.transaction_status,
        statusUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      status: newFirestoreStatus,
      midtransTransactionStatus: data.transaction_status,
      fraud_status: data.fraud_status || null,
    });
  } catch (err: any) {
    console.error("[CheckStatus] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/check-status/route.ts
git commit -m "feat: check-status endpoint untuk polling Midtrans"
```

---

## Task 3: Check Status Integration pada Success Page

**Files:**
- Modify: `src/app/checkout/success/page.tsx`

**Interfaces:**
- Consumes: `orderId` query param, `/api/check-status` endpoint
- Produces: Triggers POST ke `/api/check-status` saat page mount

- [ ] **Step 1: Read current success page**

```bash
cat src/app/checkout/success/page.tsx | head -80
```

- [ ] **Step 2: Add useEffect untuk call check-status**

Tambahkan `useEffect` di dalam component `SuccessPage` (setelah `useState` hooks, sebelum main render logic):

```typescript
useEffect(() => {
  if (!orderId) return;
  
  // Cek status real-time saat landing
  fetch("/api/check-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status) {
        setTransactionStatus(data.status);
      }
    })
    .catch((err) => console.error("Gagal cek status:", err));
}, [orderId]);
```

(Pastikan `setTransactionStatus` setter sudah ada di component — kalau variable `transactionStatus` ada tapi setter belum, sesuaikan nama.)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/checkout/success/page.tsx
git commit -m "feat: auto cek status order di success page"
```

---

## Task 4: Firebase Auth Token Verification Helper

**Files:**
- Create: `src/services/auth.ts`

**Interfaces:**
- Consumes: `Authorization: Bearer <idToken>` header
- Produces: `{ uid: string, email: string }` atau throw

- [ ] **Step 1: Create auth helper**

```typescript
// src/services/auth.ts
export interface AuthCustomer {
  uid: string;
  email: string;
}

export async function verifyIdToken(idToken: string): Promise<AuthCustomer> {
  if (!idToken) {
    throw new Error("ID token tidak ditemukan");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API key tidak dikonfigurasi");
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!res.ok) {
    throw new Error("ID token tidak valid");
  }

  const data = await res.json();
  const user = data?.users?.[0];

  if (!user || !user.localId || !user.email) {
    throw new Error("User tidak ditemukan dari token");
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}

export async function getCustomerFromRequest(
  req: Request,
): Promise<AuthCustomer> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error("Authorization header tidak valid");
  }
  return verifyIdToken(match[1]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/auth.ts
git commit -m "feat: helper verify ID token customer"
```

---

## Task 5: Chatbot Tool Definitions

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: `ChatMessage` (existing)
- Produces: `tools` array untuk dikirim ke Ollama

- [ ] **Step 1: Add tools constant di top of file**

Tambahkan setelah `interface OllamaRequestBody` (sekitar baris 37):

```typescript
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_order",
      description:
        "Mendapatkan detail pesanan berdasarkan kode order. Hanya bisa akses order milik customer yang sedang login.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Kode order dalam format EVO-XXX (contoh: EVO-1785042933)",
            pattern: "^EVO-[0-9]+$",
          },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description:
        "Mendapatkan daftar produk parfum EVOSTE yang tersedia di katalog.",
      parameters: {
        type: "object",
        properties: {
          in_stock_only: {
            type: "boolean",
            description:
              "Jika true, hanya tampilkan produk dengan stok > 0. Default false.",
            default: false,
          },
        },
      },
    },
  },
];
```

- [ ] **Step 2: Update SYSTEM_PROMPT**

Replace SYSTEM_PROMPT (line 8-28) dengan:

```typescript
const SYSTEM_PROMPT = `Kamu adalah "Evoste Assistant", asisten virtual resmi dari EVOSTE, brand parfum premium Indonesia dengan tagline "Be Timeless. Craft Your Scent Legacy".

Tugas kamu:
1. Menjawab pertanyaan tentang produk parfum EVOSTE.
   - Untuk info produk real-time (harga, stok, varian baru), gunakan tool list_products.
   - Produk yang tersedia: Citrine Flame, Ivory Bloom, Or du Soir, Oud Legendaire, Midnight Cherry.
2. Mengecek status pesanan customer.
   - Gunakan tool get_order saat customer menyebut kode order (EVO-XXX).
   - Jika order tidak ditemukan atau bukan milik customer, jawab: "Maaf, saya tidak menemukan order tersebut dalam akun Anda. Mohon cek kembali kode order Anda."
3. Membantu proses belanja: arahkan ke katalog (#catalog) atau checkout.
4. Menjelaskan filosofi brand EVOSTE.

PENTING:
- Selalu panggil tool untuk data real-time, jangan mengarang harga/info produk.
- Untuk cek order: minta kode order (format EVO-XXXX) jika user belum memberikan.
- Privasi: order milik orang lain SAMA dengan tidak ditemukan.
- Jika hasil tool menunjukkan "found: false", jawab dengan sopan.

Gaya komunikasi:
- Ramah, hangat, profesional.
- Bahasa Indonesia default.
- Jawaban ringkas (maks 3-4 paragraf).
- Gunakan markdown formatting secukupnya.`;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: tambah tool definitions dan update system prompt"
```

---

## Task 6: Tool Handlers — get_order & list_products

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: tool_call dari Ollama, `customerEmail` (dari auth)
- Produces: tool result JSON

- [ ] **Step 1: Add tool handler functions**

Tambahkan sebelum `export async function POST`:

```typescript
interface OllamaToolCall {
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

async function handleGetOrder(
  args: { order_id: string },
  customerEmail: string,
): Promise<unknown> {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(args.order_id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return { found: false };
  }

  const order = orderSnap.data();
  if (!order || order.customerDetails?.email !== customerEmail) {
    // Anti-enumeration: same response as not found
    return { found: false };
  }

  return {
    found: true,
    order: {
      orderId: order.orderId,
      status: order.status,
      statusUpdatedAt: order.statusUpdatedAt || null,
      items: order.cart?.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.grossAmount,
      shippingAddress: order.customerDetails?.address || null,
      createdAt: order.createdAt || null,
    },
  };
}

async function handleListProducts(
  args: { in_stock_only?: boolean },
): Promise<unknown> {
  const db = getAdminDb();
  let query = db.collection("products");
  const snapshot = await query.get();

  const products = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      description: data.description,
      image: data.image,
    };
  });

  const filtered = args.in_stock_only
    ? products.filter((p) => (p.stock ?? 0) > 0)
    : products;

  return { products: filtered };
}

async function executeToolCall(
  toolCall: OllamaToolCall,
  customerEmail: string,
): Promise<unknown> {
  let args: any;
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    return { error: "Invalid tool arguments" };
  }

  switch (toolCall.function.name) {
    case "get_order":
      return handleGetOrder(args, customerEmail);
    case "list_products":
      return handleListProducts(args);
    default:
      return { error: `Unknown tool: ${toolCall.function.name}` };
  }
}
```

- [ ] **Step 2: Add import getAdminDb to chat route**

Add line at top:
```typescript
import { getAdminDb } from "@/services/firebaseAdmin";
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: tool handlers untuk get_order dan list_products"
```

---

## Task 7: Chat Endpoint — Auth + Tool Call Loop

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: `Authorization: Bearer <idToken>` header, `{ messages }` body
- Produces: `{ message: { role, content } }` (existing)

- [ ] **Step 1: Replace POST function body**

Replace existing `POST` function (line 39-168) dengan:

```typescript
export async function POST(req: Request) {
  // Fail-fast jika API key Ollama tidak ada
  if (!OLLAMA_API_KEY) {
    return NextResponse.json(
      { error: "Layanan chatbot belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Auth customer
  let customer: { uid: string; email: string };
  try {
    const { getCustomerFromRequest } = await import("@/services/auth");
    customer = await getCustomerFromRequest(req);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Silakan login untuk menggunakan chatbot." },
      { status: 401 },
    );
  }

  let body: OllamaRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format request tidak valid." },
      { status: 400 },
    );
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }

  // Sanitasi (existing logic)
  const recentMessages = messages.slice(-20);
  const sanitized: ChatMessage[] = recentMessages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 2000),
    }));

  if (sanitized.length === 0) {
    return NextResponse.json({ error: "Tidak ada pesan valid." }, { status: 400 });
  }

  // Loop: handle tool calls
  const MAX_TOOL_ITERATIONS = 5;
  let conversation: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...sanitized,
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    try {
      const upstream = await fetch(OLLAMA_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OLLAMA_API_KEY}`,
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: conversation,
          tools: TOOLS,
          stream: false,
        }),
        signal: AbortSignal.timeout(25_000),
      });

      if (!upstream.ok) {
        const errBody = await upstream.text().catch(() => "");
        console.error(`[Chat] Ollama error ${upstream.status}:`, errBody);
        if (upstream.status === 429) {
          return NextResponse.json(
            { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
            { status: 429 },
          );
        }
        return NextResponse.json(
          { error: "Maaf, asisten sedang tidak tersedia." },
          { status: 502 },
        );
      }

      const data = await upstream.json();
      const assistantMessage = data?.message;

      if (!assistantMessage) {
        return NextResponse.json(
          { error: "Respons asisten tidak valid." },
          { status: 502 },
        );
      }

      // Check if AI wants to call a tool
      const toolCalls = assistantMessage.tool_calls;
      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        // Append assistant message to conversation
        conversation.push({
          role: "assistant",
          content: assistantMessage.content || "",
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const result = await executeToolCall(toolCall, customer.email);
          conversation.push({
            role: "tool",
            content: JSON.stringify(result),
          });
        }

        // Continue loop — AI will incorporate tool results
        continue;
      }

      // No tool call — this is the final answer
      const reply = assistantMessage.content || "Maaf, saya tidak dapat memberikan jawaban saat ini.";
      return NextResponse.json({
        message: { role: "assistant", content: reply },
      });
    } catch (err: any) {
      const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
      console.error("[Chat] Error:", err);
      return NextResponse.json(
        {
          error: isTimeout
            ? "Respons chatbot terlalu lama. Coba lagi."
            : "Gagal terhubung ke chatbot.",
        },
        { status: isTimeout ? 504 : 502 },
      );
    }
  }

  // Loop exhausted
  return NextResponse.json(
    { error: "Terlalu banyak iterasi tool. Coba lagi dengan pertanyaan lebih spesifik." },
    { status: 500 },
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: chat endpoint auth customer + tool call loop"
```

---

## Task 8: ChatbotWidget — Kirim ID Token

**Files:**
- Modify: `src/components/chat/ChatbotWidget.tsx`

**Interfaces:**
- Consumes: `auth.currentUser.getIdToken()` (existing firebase auth)
- Produces: `Authorization: Bearer <token>` header pada `/api/chat`

- [ ] **Step 1: Add auth import**

Add at top of file:
```typescript
import { auth } from "@/services/firebaseConfig";
```

- [ ] **Step 2: Update sendMessage function**

Find `const res = await fetch("/api/chat", {` (sekitar baris 85) dan replace dengan:

```typescript
let token: string | null = null;
const currentUser = auth.currentUser;
if (currentUser) {
  try {
    token = await currentUser.getIdToken();
  } catch (err) {
    console.error("Gagal mendapatkan ID token:", err);
  }
}

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};
if (token) {
  headers.Authorization = `Bearer ${token}`;
}

const res = await fetch("/api/chat", {
  method: "POST",
  headers,
  body: JSON.stringify({ messages: history }),
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ChatbotWidget.tsx
git commit -m "feat: chatbot kirim ID token customer"
```

---

## Task 9: End-to-End Testing

**Files:**
- Test: Manual E2E flow

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Tunggu "Ready in..." muncul.

- [ ] **Step 2: Test order creation (existing flow)**

1. Buka http://localhost:3000
2. Login sebagai customer
3. Add product ke cart
4. Checkout → lanjut ke Midtrans Sandbox
5. Bayar → kembali ke success page
6. Buka Firestore Console → collection `orders` → cek order baru ada dengan `status: "pending"`

- [ ] **Step 3: Test check-status endpoint**

```bash
# Ganti dengan orderId yang baru dibuat
curl -s -X POST http://localhost:3000/api/check-status \
  -H "Content-Type: application/json" \
  -d '{"orderId": "EVO-XXXXXXXXXX"}'
```

Expected: Response `{ status: "paid", midtransTransactionStatus: "settlement", ... }` (kalau tadi bayar) atau `{ status: "pending" }` (kalau belum bayar).

Verifikasi Firestore: order document `status` field sekarang `paid`.

- [ ] **Step 4: Test success page integration**

1. Buka http://localhost:3000/checkout/success?order_id=EVO-XXXXXXXXXX
2. Buka DevTools → Network tab
3. Seharusnya ada POST ke `/api/check-status`
4. Response 200 dengan status

- [ ] **Step 5: Test chatbot order lookup**

1. Login sebagai customer yang punya order
2. Buka chatbot
3. Tanya: "Cek pesanan EVO-XXXXXXXXXX"
4. Expected: AI jawab dengan detail order (status, items, total)

- [ ] **Step 6: Test chatbot order not found**

1. Tanya: "Cek pesanan EVO-9999999999"
2. Expected: AI jawab "Maaf, saya tidak menemukan order tersebut"

- [ ] **Step 7: Test chatbot product list**

1. Tanya: "Apa saja produk parfum EVOSTE?"
2. Expected: AI panggil list_products, jawab dengan daftar produk dari Firestore

- [ ] **Step 8: Test chatbot without login**

1. Logout
2. Tanya apa saja di chatbot
3. Expected: Response 401 "Silakan login untuk menggunakan chatbot"

- [ ] **Step 9: Test webhook signature verification**

```bash
# Hit webhook tanpa signature
curl -s -X POST http://localhost:3000/api/midtrans-webhook \
  -H "Content-Type: application/json" \
  -d '{"transaction_status":"settlement","order_id":"EVO-XXX"}'
```

Expected: 401 "Invalid signature"

- [ ] **Step 10: Commit any test fixes**

```bash
git add -A
git commit -m "test: end-to-end verification" --allow-empty
```

---

## Task 10: Deploy to Vercel

**Files:**
- Update: Vercel environment variables

- [ ] **Step 1: Verify Vercel env vars**

Pastikan di Vercel Project Settings → Environment Variables ada:
- `FIREBASE_SERVICE_ACCOUNT_KEY` (sudah)
- `MIDTRANS_SERVER_KEY` (sudah)
- `NEXT_PUBLIC_MIDTRANS_USE_PROD` (sudah)
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (sudah)
- `NEXT_PUBLIC_FIREBASE_API_KEY` (sudah)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (sudah)
- dan Firebase env vars lainnya

Tidak ada env var baru yang perlu ditambahkan.

- [ ] **Step 2: Push to git**

```bash
git push origin main
```

- [ ] **Step 3: Wait for Vercel deploy**

Cek Vercel dashboard → Deployments → tunggu status "Ready".

- [ ] **Step 4: Test production**

Ulangi Step 2-8 dari Task 9 di https://evoste-web.vercel.app.

- [ ] **Step 5: Final commit**

```bash
git tag -a v1.0 -m "Real-time chatbot + order status"
git push origin v1.0
```

---

## Notes

- **Order ID format**: `EVO-{Date.now()}` di-generate di `/checkout/page.tsx` line 100.
- **Existing code**: `/api/checkout/route.ts` sudah pakai `getAdminDb()` dari Task 22 (sebelumnya).
- **Midtrans API**: `https://api.sandbox.midtrans.com/v2/{orderId}/status` dengan Basic Auth `serverKey:` (base64).
- **Idempotency check**: di webhook dan check-status, skip update kalau status sama.
- **Fallback order**: Kalau Ollama tidak support tool calling dengan benar, fallback strategy adalah regex detect `EVO-XXX` di message, fetch order, inject ke conversation sebagai context.
