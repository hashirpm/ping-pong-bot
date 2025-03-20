import { ethers } from "ethers";
import { provider } from "../src/config";
import { State } from "../interface/state";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Load state from Supabase
export async function loadState(): Promise<State> {
  const { data, error } = await supabase
    .from("bot_state")
    .select("state")
    .eq("id", 2)
    .single();

  if (error || !data) {
    const currentBlock = ethers.toNumber(await provider.getBlockNumber());
    const state: State = {
      startingBlock: currentBlock,
      lastProcessedBlock: currentBlock - 1,
      processedTxHashes: [],
    };
    await saveState(state);
    console.log(`Initialized state with startingBlock: ${currentBlock}`);
    return state;
  }

  return data.state as State;
}

// Save state to Supabase
export async function saveState(state: State): Promise<void> {
  const { error } = await supabase
    .from("bot_state")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("id", 2);

  if (error) {
    throw new Error(`Failed to save state: ${error.message}`);
  }
}
