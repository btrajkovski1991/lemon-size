import type { ReactNode } from "react";

export function InfoCard({
  title,
  text,
  preserveLineBreaks,
}: {
  title: string;
  text: string;
  preserveLineBreaks?: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: "1px solid #e7e7e7",
        background: "white",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          opacity: 0.76,
          marginTop: 8,
          lineHeight: 1.5,
          whiteSpace: preserveLineBreaks ? "pre-line" : "normal",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function Thumb({
  url,
  alt,
  size = 44,
  radius = 10,
}: {
  url?: string | null;
  alt?: string | null;
  size?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        border: "1px solid #e7e7e7",
        background: "#fafafa",
        overflow: "hidden",
        flex: "0 0 auto",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={alt || "image"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
    </div>
  );
}

export function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: wide ? "min(1280px, 96vw)" : "min(980px, 96vw)",
          maxHeight: "90vh",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,.20)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

export function ChartTitleIcon({ title }: { title: string }) {
  const common = { width: 42, height: 42, viewBox: "0 0 48 48", fill: "none" as const };
  const stroke = "#2a2a2a";
  const muted = "#9aa0a6";
  const value = String(title || "").toLowerCase();

  if (value.includes("shoe") || value.includes("sock")) {
    return (
      <svg {...common}>
        <path
          d="M9 30c7 0 12-6 13-10l8 6c3 2 6 3 9 3h2v6H9v-5z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 35h32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (value.includes("tops")) {
    return (
      <svg {...common}>
        <path
          d="M16 14l8-4 8 4 4 8-6 4v20H18V26l-6-4 4-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("bottom")) {
    return (
      <svg {...common}>
        <path
          d="M18 10h12l2 28-7-2-3 8-3-8-7 2 2-28z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("blazer") || value.includes("jacket")) {
    return (
      <svg {...common}>
        <path
          d="M16 12l8-2 8 2 4 10-6 6v14H18V28l-6-6 4-10z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M24 10v32" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (value.includes("dress")) {
    return (
      <svg {...common}>
        <path
          d="M20 10h8l2 8-2 4 6 18H14l6-18-2-4 2-8z"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("bra")) {
    return (
      <svg {...common}>
        <path
          d="M14 22c2-6 8-8 10-8s8 2 10 8"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 22c0 6 2 10 6 10m22-10c0 6-2 10-6 10"
          stroke={muted}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (value.includes("bikini") || value.includes("brief")) {
    return (
      <svg {...common}>
        <path
          d="M16 18c2 4 4 6 8 6s6-2 8-6"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16 18l-2 20h24l-2-20"
          stroke={muted}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (value.includes("pet")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="20" r="8" stroke={stroke} strokeWidth="2" />
        <path d="M16 36c2-6 14-6 16 0" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (value.includes("headwear")) {
    return (
      <svg {...common}>
        <path
          d="M12 28c2-8 8-12 12-12s10 4 12 12"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 28h24v6H12v-6z" stroke={muted} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (value.includes("bracelet")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="10" stroke={stroke} strokeWidth="2" />
        <path d="M18 24h12" stroke={muted} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (value.includes("ring")) {
    return (
      <svg {...common}>
        <circle cx="24" cy="26" r="10" stroke={stroke} strokeWidth="2" />
        <path d="M19 14l5-6 5 6" stroke={muted} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="12" y="12" width="24" height="24" rx="6" stroke={stroke} strokeWidth="2" />
      <path d="M16 20h16M16 26h16M16 32h10" stroke={muted} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
