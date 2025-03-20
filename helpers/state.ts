import { ethers } from "ethers";
import { provider, STATE_FILE } from "../src/config";
import * as fs from "fs";
import { State } from "../interface/state";
// Load state from file or initialize if not exists
export async function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    const currentBlock = ethers.toNumber(await provider.getBlockNumber());
    const state: State = {
      startingBlock: currentBlock,
      lastProcessedBlock: currentBlock - 1,
      processedTxHashes: [],
    };
    saveState(state);
    console.log(`Initialized state with startingBlock: ${currentBlock}`);
    return state;
  }
  const data = fs.readFileSync(STATE_FILE, "utf8");
  return JSON.parse(data) as State;
}

// Utility function to save state
export function saveState(state: State): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
