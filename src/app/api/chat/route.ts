import { NextResponse } from "next/server";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:120b";
const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? "https://ollama.com/api/chat";

const SYSTEM_PROMPT = `Kamu adalah "Evoste Assistant", asisten virtual resmi dari EVOSTE, brand parfum premium Indonesia dengan tagline "Be Timeless. Craft Your Scent Legacy".

Tugas kamu:
1. Menjawab pertanyaan tentang produk parfum EVOSTE dengan ramah dan informatif.
2. Rekomendasi parfum berdasarkan preferensi pengguna dari 5 varian:
   - Citrine Flame (Rp 390.000): Fresh, fruity, woody. Bergamot, apple, plum, cedarwood.
   - Ivory Bloom (Rp 290.000): Floral elegan. Lychee, rhubarb, saffron, Turkish rose.
   - Or du Soir (Rp 350.000): Hangat, sensual. Coffee, amaretto, vanilla bourbon.
   - Oud Legendaire (Rp 270.000): Tropis misterius. Passion fruit, mango, pineapple.
   - Midnight Cherry (Rp 350.000): Bold, daring. Cherry liqueur, almond, bergamot.
3. Membantu proses belanja: arahkan pengguna ke halaman katalog (#catalog) atau checkout.
4. Menjelaskan filosofi brand EVOSTE: setiap tetes adalah cerita, jejak yang tak terlupakan.

Gaya komunikasi:
- Ramah, hangat, dan profesional.
- Gunakan Bahasa Indonesia sebagai default.
- Jawaban ringkas (maksimal 3-4 paragraf).
- Gunakan formatting markdown secukupnya untuk强调 (bold pada nama produk, harga, atau istilah penting).
- Jika tidak tahu, arahkan ke kontak via Instagram @andyalfian21.

JANGAN mengarang harga atau informasi produk yang tidak ada di daftar di atas.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OllamaRequestBody {
  messages: ChatMessage[];
}

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
