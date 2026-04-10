import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  className?: string;
  action?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  eyebrow,
  description,
  className = "",
  action,
  isLoading = false,
  loadingLabel = "Loading",
  children,
}: SectionCardProps) {
  return (
    <section
      aria-busy={isLoading}
      className={`ui-card animate-panel-enter min-h-full ${className}`}
    >
      <div className="relative z-[1] mb-6 flex items-start justify-between gap-4">
        <div className="space-y-3">
          {eyebrow ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.22)]" />
              <p className="ui-kicker">{eyebrow}</p>
            </div>
          ) : null}
          <div>
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em] text-white sm:text-xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-start">
          {isLoading ? (
            <div
              aria-live="polite"
              className="ui-chip ui-chip-live"
            >
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-100/25 border-t-cyan-100" />
              {loadingLabel}
            </div>
          ) : null}
          {action}
        </div>
      </div>
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}
