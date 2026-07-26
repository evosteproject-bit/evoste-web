import { NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:120b";
const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? "https://ollama.com/api/chat";

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

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

interface OllamaRequestBody {
  messages: ChatMessage[];
}

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
