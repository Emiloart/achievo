"use client";
import { formatAchievoId } from "../lib/userId";
import { useIdentityRegistration } from "../hooks/useIdentity";
import { Badge, Button } from "./ui";

export function IdentityBadge() {
  const { userId, register, isLoading, registering, hasContract } = useIdentityRegistration();

  if (!hasContract) return null;
  if (!userId || userId === 0n) {
    return (
      <Button variant="secondary" size="sm" onClick={register} disabled={registering}>
        {registering ? "Claiming..." : "Claim Achievo ID"}
      </Button>
    );
  }

  const label = formatAchievoId(userId) ?? "ACHUSR-?";

  return <Badge variant="neutral">{isLoading ? "..." : label}</Badge>;
}
