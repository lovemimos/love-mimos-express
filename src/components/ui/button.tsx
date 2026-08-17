import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button variants map to the brand tokens defined in tailwind.config.js —
 * never hardcode a hex/color here. See docs/DESIGN_SYSTEM.md §5 for the
 * rationale (e.g. why `whatsapp` is reserved for checkout only).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-rose-500 text-white shadow-lift hover:bg-rose-600",
        secondary: "border-2 border-plum text-plum hover:bg-rose-50",
        ghost: "text-plum hover:bg-rose-50",
        whatsapp: "bg-whatsapp text-white shadow-lift hover:brightness-95",
        link: "text-rose-500 underline-offset-4 hover:underline",
      },
      // Alturas seguem os mínimos de toque confortável de iOS/Android
      // (36/40/44/48px) — exceção deliberada à escala de 8px, que só se
      // aplica a espaçamento de conteúdo, não a alvos de toque. Texto do
      // label é sempre o token Botões (14px, herdado do `text-sm` na base),
      // independente do tamanho — só altura/padding variam.
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
