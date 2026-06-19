import { Home } from "lucide-react";

const SITE_URL = "https://rent.otipu.com";
const PARENT_URL = "https://otipu.com";
const SUPPORT_EMAIL = "hello@otipu.com";

interface SiteFooterProps {
  variant?: "app" | "landing";
}

export function SiteFooter({ variant = "app" }: SiteFooterProps) {
  const isLanding = variant === "landing";

  return (
    <footer
      className={isLanding ? "py-10 border-t" : "py-4 px-4 lg:px-8 border-t mt-auto"}
      style={{
        borderColor: isLanding ? "rgba(79,70,229,0.08)" : "var(--border)",
        background: isLanding ? "white" : "var(--card)",
      }}
    >
      <div className={`${isLanding ? "max-w-6xl mx-auto px-5" : ""} flex flex-col sm:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <Home size={14} className="text-white" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "13px", color: isLanding ? "#0F0D2A" : "var(--foreground)" }}>
              Roomly
            </span>
            <span style={{ fontSize: "11px", color: isLanding ? "#94A3B8" : "var(--muted-foreground)", marginLeft: 6 }}>
              by{" "}
              <a
                href={PARENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4F46E5", fontWeight: 600 }}
              >
                Otipu
              </a>
            </span>
          </div>
        </div>

        <div className="text-center sm:text-right" style={{ fontSize: "11px", color: isLanding ? "#94A3B8" : "var(--muted-foreground)", lineHeight: 1.7 }}>
          <p>
            © {new Date().getFullYear()}{" "}
            <a href={PARENT_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#4F46E5" }}>
              Otipu
            </a>
            . All rights reserved.
          </p>
          <p>
            <a href={SITE_URL} style={{ color: "#64748B" }}>
              rent.otipu.com
            </a>
            {" · "}
            Support:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#4F46E5" }}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export { SITE_URL, PARENT_URL, SUPPORT_EMAIL };
