export enum QuestEventType {
  DAILY_LOGIN = "DAILY_LOGIN",
  GOAL_CREATED = "GOAL_CREATED",
  GOAL_VERIFIED = "GOAL_VERIFIED",
  BADGE_MINTED = "BADGE_MINTED",
}

export type RecordQuestEventParams = {
  achusrId: string;
  eventType: QuestEventType;
  eventDate?: Date;
  metadata?: {
    refType?: string;
    refId?: string | number;
  };
};
