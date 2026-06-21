import { useEffect, type ReactNode } from "react";
import { Home, Mail, Phone, ExternalLink } from "lucide-react";
import type { PublicBillBranding } from "@/lib/share";

const DEFAULT_BRANDING: PublicBillBranding = {
  platformName: "Roomly",
  websiteUrl: "https://rent.otipu.com",
  footerText: "© Roomly · Secure shared household bills",
  supportEmail: "hello@otipu.com",
  supportPhone: "",
  logoUrl: "",
  faviconUrl: "",
};

export function resolvePublicBranding(raw?: Partial<PublicBillBranding> | null): PublicBillBranding {
  return {
    ...DEFAULT_BRANDING,
    ...raw,
    platformName: raw?.platformName?.trim() || DEFAULT_BRANDING.platformName,
    websiteUrl: raw?.websiteUrl?.trim() || DEFAULT_BRANDING.websiteUrl,
    footerText: raw?.footerText?.trim() || DEFAULT_BRANDING.footerText,
  };
}

export interface SocialShareMeta {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
}

export function usePublicBillMeta(branding: PublicBillBranding, share?: SocialShareMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    const ogTitle = share?.title
      ? `${share.title} · ${branding.platformName}`
      : `${branding.platformName} — Shared Bill`;
    document.title = ogTitle;

    const created: HTMLMetaElement[] = [];
    const setMeta = (key: string, value: string, property = false) => {
      if (!value) return;
      const selector = property
        ? `meta[property="${key}"]`
        : `meta[name="${key}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        if (property) el.setAttribute("property", key);
        else el.setAttribute("name", key);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute("content", value);
    };

    if (share?.description) {
      setMeta("description", share.description);
      setMeta("og:description", share.description, true);
      setMeta("twitter:description", share.description);
    }
    if (share?.title) {
      setMeta("og:title", share.title, true);
      setMeta("twitter:title", share.title);
    }
    setMeta("og:site_name", branding.platformName, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", share?.imageUrl ? "summary_large_image" : "summary");
    if (share?.url) {
      setMeta("og:url", share.url, true);
    }
    const image = share?.imageUrl || branding.logoUrl;
    if (image) {
      setMeta("og:image", image, true);
      setMeta("twitter:image", image);
    }

    let link: HTMLLinkElement | null = null;
    if (branding.faviconUrl) {
      link = document.querySelector("link[rel='icon']") ?? document.createElement("link");
      link.rel = "icon";
      link.href = branding.faviconUrl;
      if (!link.parentNode) document.head.appendChild(link);
    }

    return () => {
      document.title = prevTitle;
      created.forEach((el) => el.remove());
      if (link && branding.faviconUrl) link.remove();
    };
  }, [
    branding.platformName,
    branding.faviconUrl,
    branding.logoUrl,
    share?.title,
    share?.description,
    share?.url,
    share?.imageUrl,
  ]);
}

function BrandMark({ branding, size = "md" }: { branding: PublicBillBranding; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 32 : size === "lg" ? 44 : 36;
  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.platformName}
        style={{ height: dim, maxWidth: size === "sm" ? 100 : 140 }}
        className="object-contain flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: dim,
        height: dim,
        background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
        boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
      }}
    >
      <Home size={size === "sm" ? 14 : size === "lg" ? 20 : 16} className="text-white" />
    </div>
  );
}

export function PublicBillBrandHeader({
  branding: raw,
  subtitle,
  onBack,
  actions,
}: {
  branding: PublicBillBranding;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  const branding = resolvePublicBranding(raw);
  const homeUrl = branding.websiteUrl || DEFAULT_BRANDING.websiteUrl!;

  return (
    <div
      className="no-print sticky top-0 z-10"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(79,70,229,0.12)",
        boxShadow: "0 1px 12px rgba(79,70,229,0.06)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-95"
              style={{ background: "#F1F5F9", color: "#64748B" }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <a
            href={homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 min-w-0 no-underline group"
          >
            <BrandMark branding={branding} size="sm" />
            <div className="min-w-0">
              <div
                className="truncate group-hover:underline"
                style={{ fontWeight: 800, color: "#4F46E5", fontSize: "14px", letterSpacing: "-0.2px" }}
              >
                {branding.platformName}
              </div>
              <div className="truncate" style={{ color: "#64748B", fontSize: "10px" }}>
                {subtitle ?? "Shared Bill"}
              </div>
            </div>
          </a>
        </div>
        {actions && <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}

export function PublicBillFooter({
  branding: raw,
  billMeta,
  currency = "USD",
}: {
  branding: PublicBillBranding;
  billMeta?: { createdAt?: string; validUntil?: string };
  currency?: string;
}) {
  const branding = resolvePublicBranding(raw);
  const homeUrl = branding.websiteUrl || DEFAULT_BRANDING.websiteUrl!;

  return (
    <footer
      className="text-center py-6 px-4 space-y-4"
      style={{ borderTop: "1px solid rgba(79,70,229,0.08)", background: "rgba(255,255,255,0.6)" }}
    >
      <a
        href={homeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-col items-center gap-2 no-underline group"
      >
        <BrandMark branding={branding} size="lg" />
        <span
          className="group-hover:underline"
          style={{ fontWeight: 800, color: "#4F46E5", fontSize: "16px", letterSpacing: "-0.3px" }}
        >
          {branding.platformName}
        </span>
      </a>

      {branding.footerText && (
        <p style={{ color: "#64748B", fontSize: "12px", maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
          {branding.footerText}
        </p>
      )}

      {(branding.supportEmail || branding.supportPhone) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2" style={{ fontSize: "12px" }}>
          {branding.supportEmail && (
            <a
              href={`mailto:${branding.supportEmail}`}
              className="inline-flex items-center gap-1.5 no-underline"
              style={{ color: "#4F46E5", fontWeight: 600 }}
            >
              <Mail size={13} />
              {branding.supportEmail}
            </a>
          )}
          {branding.supportPhone && (
            <a
              href={`tel:${branding.supportPhone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 no-underline"
              style={{ color: "#4F46E5", fontWeight: 600 }}
            >
              <Phone size={13} />
              {branding.supportPhone}
            </a>
          )}
        </div>
      )}

      {billMeta && (
        <p style={{ color: "#94A3B8", fontSize: "11px" }}>
          {billMeta.createdAt && <>Generated {billMeta.createdAt}</>}
          {billMeta.createdAt && billMeta.validUntil && " · "}
          {billMeta.validUntil && <>Valid until {billMeta.validUntil}</>}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2" style={{ fontSize: "11px", color: "#CBD5E1" }}>
        <span>All amounts in {currency}</span>
        <span>·</span>
        <a
          href={homeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 no-underline"
          style={{ color: "#94A3B8" }}
        >
          Visit {hostnameFromUrl(homeUrl)}
          <ExternalLink size={10} />
        </a>
      </div>
    </footer>
  );
}
