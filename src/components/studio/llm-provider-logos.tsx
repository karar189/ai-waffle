import { cn } from "@/utils";

export type LlmLogoId = "openai" | "claude" | "deepseek" | "gemini" | "grok";

type LogoProps = {
  id: LlmLogoId;
  className?: string;
};

/** Official-style provider marks for the Studio block palette and canvas nodes. */
export function LlmProviderLogo({ id, className }: LogoProps) {
  const common = cn("size-full shrink-0", className);

  switch (id) {
    case "openai":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            fill="currentColor"
            d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.91 6.051 6.051 0 0 0 6.515 2.9A5.986 5.986 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.998-2.9 6.056 6.056 0 0 0-.747-7.073zm-9.022 12.608a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.778-2.758a.795.795 0 0 0 .393-.681V9.334l2.02 1.169a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.495 4.494zm-9.661-4.125a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.758a.771.771 0 0 0 .781 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.814 3.354-2.02 1.169a.076.076 0 0 1-.071 0l-4.83-2.787A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.863-3.37 2.015-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.677a.79.79 0 0 0-.407-.667zm2.01-3.023-.142-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.376-3.454l-.142.08L8.704 5.459a.795.795 0 0 0-.393.681zm1.098-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
          />
        </svg>
      );
    case "claude":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            fill="#D97757"
            d="M4.709 16.82 2.25 12.21l2.459-4.61h2.918l-1.53 2.87 1.53 2.87H4.709zm14.582 0h-2.918l1.53-2.87-1.53-2.87h2.918l2.459 4.61-2.459 4.61zM8.88 16.82 6.42 12.21l2.46-4.61h2.4l-1.53 2.87 1.53 2.87H8.88zm6.24 0h-2.4l1.53-2.87-1.53-2.87h2.4l2.46 4.61-2.46 4.61zM12 7.18l-1.23 2.31H12l1.23-2.31H12z"
          />
        </svg>
      );
    case "deepseek":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#4D6BFE" />
          <path
            fill="#fff"
            d="M12 5.5c-2.8 0-5.2 1.8-6 4.3-.2.7-.3 1.4-.3 2.2 0 3.9 3.1 7 7 7 .8 0 1.5-.1 2.2-.3 2.5-.8 4.3-3.2 4.3-6 0-4-3.2-7.2-7.2-7.2zm-2.8 6.8c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7zm5.6 0c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7zm-2.8 3.2c-1.5 0-2.8-.7-3.5-1.8.3-.2.7-.3 1.1-.3 1 .7 2.2 1.1 3.4 1.1s2.4-.4 3.4-1.1c.4 0 .8.1 1.1.3-.7 1.1-2 1.8-3.5 1.8z"
          />
        </svg>
      );
    case "gemini":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <defs>
            <linearGradient id="wt-gemini" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C7DFF" />
              <stop offset="35%" stopColor="#6C5CE7" />
              <stop offset="70%" stopColor="#C026D3" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wt-gemini)"
            d="M12 2.25 14.35 9.65 22 12l-7.65 2.35L12 21.75 9.65 14.35 2 12l7.65-2.35L12 2.25z"
          />
        </svg>
      );
    case "grok":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#0A0A0A" />
          <path
            fill="#fff"
            stroke="#fff"
            strokeWidth="0.4"
            d="M6.5 7.5h2.8l2.1 3.3 2.1-3.3H16l-3.8 5.7L16.2 18h-2.8l-2.3-3.6L8.7 18H6l3.9-5.8L6.5 7.5z"
          />
        </svg>
      );
  }
}
