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

export function ChartTitleIcon({ title, size = 42 }: { title: string; size?: number }) {
  const value = String(title || "").toLowerCase();
  let iconSrc: string | null = null;

  if (value.includes("shoe")) iconSrc = "/Icon/shoes.svg";
  else if (value.includes("sock")) iconSrc = "/Icon/socks.svg";
  else if (value.includes("top") || value.includes("t-shirt") || value.includes("shirt")) iconSrc = "/Icon/t-shirt.svg";
  else if (value.includes("bottom")) iconSrc = "/Icon/bottoms.svg";
  else if (value.includes("blazer")) iconSrc = "/Icon/blazer.svg";
  else if (value.includes("jacket")) iconSrc = "/Icon/jacket.svg";
  else if (value.includes("dress")) iconSrc = "/Icon/dress.svg";
  else if (value.includes("bra")) iconSrc = "/Icon/bra.svg";
  else if (value.includes("bikini")) iconSrc = "/Icon/bikini.svg";
  else if (value.includes("brief")) iconSrc = "/Icon/briefs.svg";
  else if (value.includes("headwear") || value.includes("beanie") || value.includes("hat")) iconSrc = "/Icon/beanie.svg";
  else if (value.includes("bracelet")) iconSrc = "/Icon/bracelet.svg";
  else if (value.includes("ring")) iconSrc = "/Icon/ring.svg";
  else if (value.includes("necklace")) iconSrc = "/Icon/necklace.svg";

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size, display: "block", objectFit: "contain" }}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="12" y="12" width="24" height="24" rx="6" stroke="#2a2a2a" strokeWidth="2" />
      <path d="M16 20h16M16 26h16M16 32h10" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
