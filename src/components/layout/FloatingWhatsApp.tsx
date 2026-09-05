import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/5531992615667"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Love Mimos pelo WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] sm:bottom-6 sm:right-6"
    >
      <MessageCircle aria-hidden="true" size={28} />
    </a>
  );
}
