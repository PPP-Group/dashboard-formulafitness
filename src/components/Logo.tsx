import { brand } from "@/lib/brand";

/**
 * The official artwork is white-on-transparent, so it needs the brand navy
 * behind it to be visible on a light surface.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ background: brand.navy, width: size, height: size }}
    >
      {brand.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoSrc}
          alt=""
          width={size * 0.56}
          height={size * 0.65}
          style={{ width: size * 0.56, height: "auto" }}
        />
      ) : (
        <span className="text-xs font-bold text-white">{brand.monogram}</span>
      )}
    </span>
  );
}
