import { FeedPayload, PartyFeedItemType } from "./feed.types";

export function describeActivity(type: PartyFeedItemType, payload: FeedPayload) {
  switch (type) {
    case "QUEST_CLAIMED": {
      const title = String(payload.title || payload.questTitle || "a quest");
      const xp = Number(payload.xpReward ?? payload.xpGained ?? 0);
      return `Completed quest "${title}" (+${xp} XP)`;
    }
    case "GOAL_VERIFIED": {
      const goalId = payload.goalId ?? payload.id ?? "";
      return goalId ? `Verified goal #${goalId}` : "Verified a goal";
    }
    case "BADGE_MINTED": {
      const badgeId = payload.badgeId ?? payload.id ?? "";
      return badgeId ? `Minted badge #${badgeId}` : "Minted a badge";
    }
    case "STREAK_MILESTONE": {
      const threshold = payload.threshold ?? payload.currentStreak ?? "";
      const xp = Number(payload.xpBonus ?? payload.xpReward ?? 0);
      return threshold ? `Hit ${threshold}-day streak (+${xp} XP)` : `Hit a streak milestone (+${xp} XP)`;
    }
    default:
      return "New activity";
  }
}
