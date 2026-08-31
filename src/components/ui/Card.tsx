import { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Extra props pass through to the <section>, so a card can be made clickable
 * (role, tabIndex, onClick) without every caller re-implementing the shell.
 */
export function Card({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
