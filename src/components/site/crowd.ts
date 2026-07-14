export type CrowdStatus = "Dead" | "Slow" | "Busy" | "Packed";

/** Maps a crowd status to its semantic token color and fill percentage. */
export const CROWD_META: Record<
  CrowdStatus,
  { colorVar: string; label: string; defaultFill: number }
> = {
  Dead: { colorVar: "var(--dead)", label: "DEAD", defaultFill: 12 },
  Slow: { colorVar: "var(--slow)", label: "SLOW", defaultFill: 38 },
  Busy: { colorVar: "var(--busy)", label: "BUSY", defaultFill: 68 },
  Packed: { colorVar: "var(--packed)", label: "PACKED", defaultFill: 96 },
};
