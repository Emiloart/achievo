"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, CardBody } from "../../components/ui";

type Kind = "EXPORT" | "PROOF" | "VALIDATION" | "ANCHOR" | "TX";

type Detection = { kind: Kind; id: string; token?: string } | null;

function detectFromInput(value: string): Detection {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
  const target = urlMatch ? urlMatch[0] : trimmed;

  try {
    const parsed = new URL(target.startsWith("http") ? target : `https://example.com/${target}`);
    const path = parsed.pathname;
    const token = parsed.searchParams.get("token") || undefined;

    const exportMatch = path.match(/\/exports\/([^/?#]+)/) || path.match(/\/verify\/export\/([^/?#]+)/);
    if (exportMatch) return { kind: "EXPORT", id: exportMatch[1], token };

    const proofMatch = path.match(/\/proofs\/([^/?#]+)/) || path.match(/\/verify\/proof\/([^/?#]+)/);
    if (proofMatch) return { kind: "PROOF", id: proofMatch[1], token };

    const validationMatch =
      path.match(/\/verify\/validation\/([^/?#]+)/) ||
      path.match(/\/validations\/requests\/([^/?#]+)/) ||
      path.match(/\/validation\/([^/?#]+)/);
    if (validationMatch) return { kind: "VALIDATION", id: validationMatch[1], token };

    const txMatch = path.match(/\/tx\/(0x[0-9a-fA-F]{64})/);
    if (txMatch) return { kind: "TX", id: txMatch[1] };
  } catch {
    // Not a URL, fall through.
  }

  if (trimmed.startsWith("export:")) return { kind: "EXPORT", id: trimmed.replace("export:", "").trim() };
  if (trimmed.startsWith("proof:")) return { kind: "PROOF", id: trimmed.replace("proof:", "").trim() };
  if (trimmed.startsWith("validation:")) return { kind: "VALIDATION", id: trimmed.replace("validation:", "").trim() };
  if (trimmed.startsWith("tx:")) return { kind: "TX", id: trimmed.replace("tx:", "").trim() };
  if (trimmed.startsWith("hash:")) return { kind: "ANCHOR", id: trimmed.replace("hash:", "").trim() };
  if (trimmed.startsWith("anchor:")) return { kind: "ANCHOR", id: trimmed.replace("anchor:", "").trim() };

  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return { kind: "ANCHOR", id: trimmed };

  return null;
}

export default function VerifyPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [manualKind, setManualKind] = useState<Kind>("EXPORT");
  const [error, setError] = useState("");

  const detected = useMemo(() => detectFromInput(value), [value]);

  const handleVerify = () => {
    const target = detected || (value.trim() ? { kind: manualKind, id: value.trim() } : null);
    if (!target?.id) {
      setError("Enter a valid link or id");
      return;
    }
    setError("");
    const tokenParam = target.token ? `?token=${encodeURIComponent(target.token)}` : "";
    if (target.kind === "EXPORT") router.push(`/verify/export/${target.id}${tokenParam}`);
    if (target.kind === "PROOF") router.push(`/verify/proof/${target.id}${tokenParam}`);
    if (target.kind === "VALIDATION") router.push(`/verify/validation/${target.id}${tokenParam}`);
    if (target.kind === "ANCHOR") router.push(`/verify/anchor/${target.id}`);
    if (target.kind === "TX") router.push(`/verify/tx/${target.id}`);
  };

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Badge variant="info">Verification portal</Badge>
        <h1 className="text-3xl font-display text-text">Verify a claim</h1>
        <p className="text-sm text-textMuted">
          Paste an export link, proof id, validation id, anchor hash, or transaction hash to verify authenticity.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a link, ID, or hash"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {!detected && (
            <div className="flex items-center gap-3 text-sm">
              <label className="text-xs text-textMuted">Type</label>
              <select
                value={manualKind}
                onChange={(e) => setManualKind(e.target.value as Kind)}
                className="rounded-full border border-border bg-surface2 px-3 py-2 text-xs"
              >
                <option value="EXPORT">Profile export</option>
                <option value="PROOF">Proof artifact</option>
                <option value="VALIDATION">Validation</option>
                <option value="ANCHOR">Anchor hash</option>
                <option value="TX">Transaction hash</option>
              </select>
            </div>
          )}
          {detected && (
            <div className="text-xs text-textMuted">
              Detected {detected.kind.toLowerCase()} - {detected.id}
            </div>
          )}
          {error && <div className="text-xs text-danger">{error}</div>}
          <Button type="button" onClick={handleVerify}>
            Verify
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
