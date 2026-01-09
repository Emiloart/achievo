/** Normalized decoded event row used by projection handlers. */
export type DecodedEventRow = {
  chainId: number;
  contractAddress: string;
  contractKey: string;
  eventName: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  args: Record<string, any>;
  eventId: string;
  removed: boolean;
};
