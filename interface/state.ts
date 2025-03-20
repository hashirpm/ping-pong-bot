// State interface
export interface State {
  startingBlock: number;
  lastProcessedBlock: number;
  processedTxHashes: string[];
}