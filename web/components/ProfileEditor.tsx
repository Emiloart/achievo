"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProfileInfo } from "../hooks/useProfileInfo";
import { uploadFile, ipfsToHttp } from "../lib/ipfs";
import { Badge, Button, Card, CardBody, Section } from "./ui";
import { uiToast } from "./ui/toast";

interface Props {
  profile: ProfileInfo;
  onSaveProfile: (next: Pick<ProfileInfo, "username" | "bio" | "about" | "avatar">) => Promise<void>;
  onSaveDisplayName: (displayName: string) => Promise<void>;
  onClaimUsername: (username: string) => Promise<void>;
  savingProfile?: boolean;
  savingDisplayName?: boolean;
}

const USERNAME_RULES = "3-32 chars, a-z, 0-9, ., _, -, no leading/trailing ., _, -, no repeats.";

function normalizeUsernameInput(input: string) {
  return input.trim().toLowerCase();
}

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
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
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

  useEffect(() => {
    const value = normalizeUsernameInput(form.username || "");
    if (!value) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    if (value === normalizeUsernameInput(profile.username || "")) {
      setUsernameStatus("available");
      setUsernameMessage("Current username");
      return;
    }
    let alive = true;
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/identity/username/availability?username=${encodeURIComponent(value)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.available) {
          setUsernameStatus("available");
          setUsernameMessage("Available");
        } else {
          setUsernameStatus(json.reason === "TAKEN" ? "taken" : "invalid");
          setUsernameMessage(json.reason === "TAKEN" ? "Already taken" : "Not allowed");
        }
      } catch {
        if (!alive) return;
        setUsernameStatus("invalid");
        setUsernameMessage("Unable to check");
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [form.username, profile.username]);

  const usernameChanged = useMemo(() => {
    return normalizeUsernameInput(form.username || "") !== normalizeUsernameInput(profile.username || "");
  }, [form.username, profile.username]);

  const handleClaimUsername = async () => {
    if (!form.username.trim()) {
      uiToast.error("Enter a username");
      return;
    }
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
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
              <input type="file" accept="image/*" onChange={handleAvatar} disabled={uploading} />
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
                <input
                  value={form.displayName}
                  onChange={handleChange("displayName")}
                  className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="e.g. Emeka"
                />
                <p className="text-xs text-textMuted mt-1">Display name is cosmetic and can be changed anytime.</p>
              </div>
              <Button type="submit" variant="secondary" disabled={savingDisplayName}>
                {savingDisplayName ? "Saving..." : "Save display name"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </Section>

      <Section title="Username" description={USERNAME_RULES}>
        <Card>
          <CardBody className="space-y-3">
            <input
              value={form.username}
              onChange={handleChange("username")}
              className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              placeholder="@achvhero"
            />
            {usernameStatus !== "idle" && (
              <Badge variant={usernameStatus === "available" ? "success" : "danger"}>{usernameMessage}</Badge>
            )}
            <Button type="button" disabled={claiming || savingProfile} onClick={handleClaimUsername}>
              {claiming || savingProfile ? "Claiming..." : "Claim / Update username"}
            </Button>
          </CardBody>
        </Card>
      </Section>

      <Section title="Bio">
        <textarea
          value={form.bio}
          onChange={handleChange("bio")}
          className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
          rows={3}
          placeholder="Short punchy summary"
        />
      </Section>

      <Section title="About">
        <textarea
          value={form.about}
          onChange={handleChange("about")}
          className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
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
