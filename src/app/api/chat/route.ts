import { NextResponse } from "next/server";

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
  role: "user" | "assistant" | "system";
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

export async function POST(req: Request) {
  // Fail-fast jika API key tidak ada
  if (!OLLAMA_API_KEY) {
    console.error("[Ollama API] OLLAMA_API_KEY tidak dikonfigurasi");
    return NextResponse.json(
      {
        error:
          "Layanan chatbot belum dikonfigurasi. Hubungi administrator.",
      },
      { status: 500 },
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
    return NextResponse.json(
      { error: "Pesan tidak boleh kosong." },
      { status: 400 },
    );
  }

  // Batasi history percakapan agar tidak membengkak
  const recentMessages = messages.slice(-20);

  // Sanitasi pesan: hanya izinkan role user/assistant dan content string
  const sanitized: ChatMessage[] = recentMessages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 2000), // batas per pesan
    }));

  if (sanitized.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada pesan valid untuk diproses." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized],
        stream: false,
      }),
      // Timeout 25 detik (kurang dari default Next.js 30 detik)
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => "");
      console.error(
        `[Ollama API] Upstream error ${upstream.status}:`,
        errorBody,
      );

      if (upstream.status === 429) {
        return NextResponse.json(
          { error: "Terlalu banyak permintaan. Coba lagi sebentar ya." },
          { status: 429 },
        );
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return NextResponse.json(
          { error: "Autentikasi chatbot tidak valid." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Maaf, asisten sedang tidak tersedia. Silakan coba lagi nanti.",
        },
        { status: 502 },
      );
    }

    const data = await upstream.json();

    const reply =
      data?.message?.content ??
      "Maaf, saya tidak dapat memberikan jawaban saat ini.";

    return NextResponse.json({
      message: {
        role: "assistant",
        content: reply,
      },
    });
  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    console.error("[Ollama API] Request failed:", error);

    return NextResponse.json(
      {
        error: isTimeout
          ? "Respons chatbot terlalu lama. Silakan coba lagi."
          : "Gagal terhubung ke layanan chatbot. Coba lagi nanti.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
