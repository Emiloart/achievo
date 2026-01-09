/** Canonical anchor kind numeric codes. */
export const AnchorKinds = {
  PROOF: 1,
  VALIDATION: 2,
  EXPORT: 3,
  SUBMISSION: 4,
} as const;

/** Numeric anchor kind type. */
export type AnchorKind = (typeof AnchorKinds)[keyof typeof AnchorKinds];
/** String label for anchor kind types. */
export type AnchorEntityType = keyof typeof AnchorKinds;

/** Mapping from numeric anchor kind to string label. */
export const AnchorKindLabels: Record<AnchorKind, AnchorEntityType> = {
  [AnchorKinds.PROOF]: "PROOF",
  [AnchorKinds.VALIDATION]: "VALIDATION",
  [AnchorKinds.EXPORT]: "EXPORT",
  [AnchorKinds.SUBMISSION]: "SUBMISSION",
};

/** Converts a numeric anchor kind into its label. */
export function toAnchorKindLabel(kind?: number | null): AnchorEntityType | null {
  if (!kind) return null;
  return AnchorKindLabels[kind as AnchorKind] || null;
}
