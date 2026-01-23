"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProfileInfo } from "../hooks/useProfileInfo";
import { uploadFile, ipfsToHttp } from "../lib/ipfs";
import { Button, Card, CardBody, Input, Section, StatusBadge, Textarea } from "./ui";
import { uiToast } from "./ui";
import { normalizeUsername, USERNAME_RULES, validateUsername } from "../lib/username";

interface Props {
  profile: ProfileInfo;
  onSaveProfile: (next: Pick<ProfileInfo, "username" | "bio" | "about" | "avatar">) => Promise<void>;
  onSaveDisplayName: (displayName: string) => Promise<void>;
  onClaimUsername: (username: string) => Promise<void>;
  savingProfile?: boolean;
  savingDisplayName?: boolean;
}

const USERNAME_RULES_COPY = `Use ${USERNAME_RULES.minLength}-${USERNAME_RULES.maxLength} characters, lowercase a-z, 0-9, and dashes only. No leading, trailing, or consecutive dashes.`;

export function ProfileEditor({
  profile,
  onSaveProfile,
  onSaveDisplayName,
  onClaimUsername,
  savingProfile,
  savingDisplayName,
}: Props) {
  const [form, setForm] = useState(profile);
  const [uploading, setUploading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid" | "unknown" | "current"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleChange =
    (field: keyof ProfileInfo) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await uploadFile(file);
      setForm((prev) => ({ ...prev, avatar: uploaded.uri }));
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDisplayName = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await onSaveDisplayName(form.displayName);
      uiToast.success("Display name updated");
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to update display name");
    }
  };

  const normalizedInput = useMemo(() => normalizeUsername(form.username || "").normalized, [form.username]);
  const normalizedCurrent = useMemo(() => normalizeUsername(profile.username || "").normalized, [profile.username]);
  const usernameValidation = useMemo(() => validateUsername(normalizedInput), [normalizedInput]);

  useEffect(() => {
    if (!normalizedInput) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    if (!usernameValidation.valid) {
      setUsernameStatus("invalid");
      setUsernameMessage("Invalid username format");
      return;
    }
    if (normalizedInput === normalizedCurrent) {
      setUsernameStatus("current");
      setUsernameMessage("Current username");
      return;
    }
    let alive = true;
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/identity/username/availability?username=${encodeURIComponent(normalizedInput)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.available) {
          setUsernameStatus("available");
          setUsernameMessage("Available");
          return;
        }
        if (json.reason === "TAKEN") {
          setUsernameStatus("taken");
          setUsernameMessage("Owned");
          return;
        }
        if (json.reason === "RESERVED") {
          setUsernameStatus("taken");
          setUsernameMessage("Reserved");
          return;
        }
        setUsernameStatus("invalid");
        setUsernameMessage("Not allowed");
      } catch {
        if (!alive) return;
        setUsernameStatus("unknown");
        setUsernameMessage("Unable to confirm right now");
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [normalizedCurrent, normalizedInput, usernameValidation.valid]);

  const usernameChanged = useMemo(() => normalizedInput !== normalizedCurrent, [normalizedCurrent, normalizedInput]);

  const handleClaimUsername = async () => {
    if (!form.username.trim()) {
      uiToast.error("Enter a username");
      return;
    }
    if (usernameStatus === "checking") {
      uiToast.error("Checking availability. Please wait.");
      return;
    }
    if (usernameStatus === "current") {
      uiToast.success("Username already set");
      return;
    }
    if (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "unknown") {
      uiToast.error("Choose a valid username");
      return;
    }
    setClaiming(true);
    try {
      await onClaimUsername(form.username);
      uiToast.success("Username updated");
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to claim username");
    } finally {
      setClaiming(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const safeUsername = usernameChanged ? profile.username : form.username;
      await onSaveProfile({ username: safeUsername, bio: form.bio, about: form.about, avatar: form.avatar });
      uiToast.success("Profile updated");
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to save profile");
    }
  };

  const avatarSrc = ipfsToHttp(form.avatar);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarSrc]);

  return (
    <div className="space-y-6">
      <Section title="Identity" description="Update how you appear across Achievo.">
        <Card>
          <CardBody className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-surface2">
              {avatarSrc && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <label className="text-textMuted">Profile Picture (IPFS)</label>
              <Input type="file" accept="image/*" onChange={handleAvatar} disabled={uploading} />
              {form.avatar && <code className="text-xs break-all">{form.avatar}</code>}
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="Display name">
        <Card>
          <CardBody>
            <form onSubmit={handleSaveDisplayName} className="space-y-3">
              <div>
                <label className="text-sm text-textMuted">Display Name</label>
                <Input value={form.displayName} onChange={handleChange("displayName")} placeholder="e.g. Emeka" />
                <p className="text-xs text-textMuted mt-1">Display name is cosmetic and can be changed anytime.</p>
              </div>
              <Button type="submit" variant="secondary" disabled={savingDisplayName}>
                {savingDisplayName ? "Saving..." : "Save display name"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </Section>

      <Section title="Username" description={USERNAME_RULES_COPY}>
        <Card>
          <CardBody className="space-y-3">
            <Input value={form.username} onChange={handleChange("username")} placeholder="@achvhero" />
            {usernameStatus !== "idle" && (
              <StatusBadge
                tone={
                  usernameStatus === "available" || usernameStatus === "current"
                    ? "success"
                    : usernameStatus === "checking"
                      ? "info"
                      : usernameStatus === "unknown"
                        ? "warning"
                        : "danger"
                }
              >
                {usernameMessage}
              </StatusBadge>
            )}
            {normalizedInput && <div className="text-xs text-textMuted">Normalized: @{normalizedInput}</div>}
            <Button type="button" disabled={claiming || savingProfile} onClick={handleClaimUsername}>
              {claiming || savingProfile ? "Claiming..." : "Claim / Update username"}
            </Button>
          </CardBody>
        </Card>
      </Section>

      <Section title="Bio">
        <Textarea value={form.bio} onChange={handleChange("bio")} rows={3} placeholder="Short punchy summary" />
      </Section>

      <Section title="About">
        <Textarea
          value={form.about}
          onChange={handleChange("about")}
          rows={5}
          placeholder="Long-form story, milestones, favorite achievements"
        />
      </Section>

      <Button type="button" disabled={savingProfile || uploading} onClick={handleSaveProfile}>
        {savingProfile || uploading ? "Saving..." : "Save on-chain profile"}
      </Button>
    </div>
  );
}
