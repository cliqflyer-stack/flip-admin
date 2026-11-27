interface SpotLike {
  id: string;
  productId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  titleOverride?: string | null | undefined;
  priceOverride?: string | number | null | undefined;
}

/** Saved coordinates are rounded to 4 places and prices come back as strings. */
const fingerprint = (spots: SpotLike[]) =>
  spots
    .map((s) =>
      [
        s.id,
        s.productId,
        ...[s.x, s.y, s.width, s.height].map((n) => n.toFixed(4)),
        s.titleOverride || "",
        s.priceOverride ? Number(s.priceOverride).toFixed(2) : "",
      ].join("|"),
    )
    .sort()
    .join("\n");

/** True when the studio differs from what is stored for the flyer. */
export const hasUnsavedHotspots = (editing: SpotLike[], saved: SpotLike[] | undefined) =>
  fingerprint(editing) !== fingerprint(saved ?? []);
