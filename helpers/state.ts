import { ethers } from "ethers";
import { provider, STATE_FILE } from "../src/config";
import * as fs from "fs";
import { State } from "../interface/state";
import path from "path";

// Ensure the data folder exists
 function ensureDataFolder() {
   const dataDir = path.dirname(STATE_FILE);
   if (!fs.existsSync(dataDir)) {
     fs.mkdirSync(dataDir, { recursive: true });
   }
 }
 
// Load state from file or create if not exists
export async function loadState() {
  ensureDataFolder();
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

// Save state to file
export async function saveState(state: State) {
   fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
