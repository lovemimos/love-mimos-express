"use client";

export default function WhatsAppFallbackNotice({ url }: { url: string }) {
  return (
    <p className="mt-2 text-center text-xs text-ink/60">
      Não conseguimos abrir o WhatsApp automaticamente.{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-rose-500 underline">
        Toque aqui para abrir
      </a>
      .
    </p>
  );
}
