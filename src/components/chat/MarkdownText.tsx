import { Fragment, ReactNode } from "react";

/**
 * Parser markdown inline sederhana untuk bubble chat.
 * Aman dari XSS karena React otomatis escape string biasa;
 * elemen React yang dikembalikan tidak menerima HTML mentah.
 *
 * Mendukung:
 *   **bold** atau __bold__
 *   *italic* atau _italic_
 *   `inline code`
 *   baris baru → <br>
 */
export default function MarkdownText({
  content,
}: {
  content: string;
}) {
  return <>{parseInline(content)}</>;
}

function parseInline(text: string): ReactNode[] {
  // Pola prioritas: code > bold > italic (code dulu agar tidak ter-parse)
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

  const parts = text.split(pattern);
  return parts
    .filter((part) => part !== undefined && part !== "")
    .map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const code = part.slice(1, -1);
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 bg-gray-200/70 dark:bg-slate-700/70 rounded text-[0.85em] font-mono"
          >
            {code}
          </code>
        );
      }

      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        const inner = part.slice(2, -2);
        return (
          <strong key={idx} className="font-bold">
            {parseInline(inner)}
          </strong>
        );
      }

      if (
        (part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))
      ) {
        const inner = part.slice(1, -1);
        return (
          <em key={idx} className="italic">
            {parseInline(inner)}
          </em>
        );
      }

      // Baris baru jadi <br> agar multi-line tampil rapi
      const lines = part.split("\n");
      return (
        <Fragment key={idx}>
          {lines.map((line, i) => (
            <Fragment key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </Fragment>
          ))}
        </Fragment>
      );
    });
}
