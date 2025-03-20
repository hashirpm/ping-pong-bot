import { ethers } from "ethers";

import { loadState, saveState } from "./helpers/state";
import { contract, provider } from "./config";
import { withRetry } from "./helpers/error";

// Process a ping event
async function processPingEvent(event: ethers.EventLog) {
  console.log("Processing ping event");
  const state = await loadState();
  const txHash = event.transactionHash;
  // Check if the event has already been processed
  if (state.processedTxHashes.includes(txHash)) {
    console.log(`Skipping already processed event: ${txHash}`);
    return;
  }

  console.log(`Processing ping event - ${txHash}`);
  const tx = await withRetry(() => contract.pong(txHash));
  await withRetry(() => tx.wait());
  console.log(`Pong sent for ${txHash}, Tx Hash of Pong: ${tx.hash}`);

  state.processedTxHashes.push(txHash);
  saveState(state);
}

// Process all ping events in a block
async function processBlock(blockNumber: number) {
  const state = await loadState();
  if (blockNumber <= state.lastProcessedBlock) return;

  console.log(`Processing block ${blockNumber}`);

  // Get all Ping events in the block
  const events = await withRetry(() =>
    contract.queryFilter(contract.filters.Ping(), blockNumber, blockNumber)
  );
  // Iterate through each ping event
  for (const event of events) {
    await processPingEvent(event as ethers.EventLog);
  }

  state.lastProcessedBlock = blockNumber;
  saveState(state);
  console.log(`Finished processing block ${blockNumber}`);
}

// Start the bot
async function startBot() {
  console.log("Starting bot...");
  const state = await loadState();
  // Check and process all blocks since the last processed block
  const currentBlock = ethers.toNumber(await provider.getBlockNumber());
  for (
    let block = state.lastProcessedBlock + 1;
    block <= currentBlock;
    block++
  ) {
    await processBlock(block);
  }

  // Listen to new blocks and call processBlock function
  provider.on("block", async (blockNumber: number) => {
    try {
      await processBlock(blockNumber);
    } catch (error: any) {
      console.error(`Error processing block ${blockNumber}: ${error.message}`);
    }
  });
}

// Start the bot and catch errors if any
startBot().catch((error) => {
  console.error(`Bot crashed: ${error.message}`);
  process.exit(1);
});
