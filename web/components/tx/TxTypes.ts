export type TxState = "idle" | "walletPrompt" | "submitted" | "confirming" | "finalized" | "failed" | "reorged" | "unknown";

export type TxErrorType = "rejected" | "reverted" | "unknown";

export type TxError = {
  type: TxErrorType;
  message: string;
};
