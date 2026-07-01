import { cn } from "@/lib/utils";

/**
 * The switalk wordmark: lowercase extrabold ink with the brand-orange dot on
 * the "i". Rendered as text (dotless ı + positioned dot) so it stays crisp at
 * any size — set the size with a text-* class on `className`.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="switalk"
      className={cn(
        "inline-flex select-none items-baseline font-extrabold leading-none tracking-tight text-gray-900",
        className
      )}
    >
      <span aria-hidden="true">sw</span>
      <span aria-hidden="true" className="relative">
        ı
        <span className="absolute left-1/2 top-[0.13em] h-[0.14em] w-[0.14em] -translate-x-1/2 rounded-full bg-brand-500" />
      </span>
      <span aria-hidden="true">talk</span>
    </span>
  );
}
