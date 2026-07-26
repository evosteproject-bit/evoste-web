"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/services/firebaseConfig";
import MarkdownText from "./MarkdownText";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Apa itu EVOSTE?",
  "Rekomendasi parfum untuk sehari-hari",
  "Parfum apa yang cocok untuk malam hari?",
  "Berapa harga Ivory Bloom?",
];

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Halo! 👋 Saya Evoste Assistant. Ada yang bisa saya bantu tentang koleksi parfum EVOSTE hari ini?",
  },
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll ke pesan terbaru setiap kali daftar berubah
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  // Fokus input saat popup dibuka
  useEffect(() => {
    if (open) {
      // Sedikit tunda agar animasi tidak konflik
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const pendingMessage: Message = {
      id: `pending-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setInput("");
    setIsSending(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Respons tidak valid dari server.");
      }

      const reply: string =
        data?.message?.content ??
        "Maaf, saya tidak dapat memberikan jawaban saat ini.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMessage.id
            ? { ...m, content: reply, pending: false }
            : m,
        ),
      );
    } catch (err) {
      const errorText =
        err instanceof Error
          ? err.message
          : "Tidak dapat terhubung ke chatbot. Coba lagi.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMessage.id
            ? { ...m, content: errorText, pending: false, error: true }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    if (isSending) return;
    setMessages(initialMessages);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-24">
      <AnimatePresence>
        {open && (
          <motion.div
            key="chatbot-popup"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 right-0 w-[calc(100vw-3rem)] sm:w-96 h-[560px] max-h-[calc(100vh-9rem)] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-sm font-orbitron tracking-wide">
                    EVOSTE ASSISTANT
                  </h3>
                  <p className="text-xs text-cyan-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                    Online · Powered by Ollama
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  disabled={isSending}
                  title="Mulai ulang percakapan"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Tutup"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/40"
            >
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}

              {messages.length <= 1 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                    Coba tanyakan:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        disabled={isSending}
                        className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-full hover:border-blue-500 dark:hover:border-cyan-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shrink-0"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ketik pertanyaanmu..."
                  disabled={isSending}
                  className="flex-1 resize-none px-3 py-2.5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-400 max-h-32 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isSending || input.trim().length === 0}
                  className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Kirim pesan"
                >
                  {isSending ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity={0.3}
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
                Tekan Enter untuk kirim · Shift+Enter untuk baris baru
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all ${
          open
            ? "bg-gray-700 dark:bg-slate-700"
            : "bg-gradient-to-br from-blue-600 to-cyan-500 dark:from-cyan-500 dark:to-blue-600"
        }`}
        aria-label={open ? "Tutup chatbot" : "Buka chatbot"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </motion.svg>
          )}
        </AnimatePresence>

        {!open && messages.length > 1 && (
          <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
            {messages.filter((m) => m.role === "user").length}
          </span>
        )}
      </motion.button>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.pending) {
    return (
      <div className="flex justify-start">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <TypingDots />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-600 dark:bg-cyan-500 text-white rounded-tr-sm"
            : message.error
              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 rounded-tl-sm"
              : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-700 rounded-tl-sm"
        }`}
      >
        {isUser ? message.content : <MarkdownText content={message.content} />}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
