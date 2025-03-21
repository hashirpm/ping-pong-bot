import { ethers } from "ethers";
import { loadState, saveState } from "../helpers/state";
import { contract, provider } from "./config";
import { withRetry } from "../helpers/error";
import { State } from "../interface/state";

let blockQueue: number[] = [];
let isProcessing = false;

// Process a ping event
async function processPingEvent(event: ethers.EventLog, state: State) {
  console.log("Processing ping event...");
  const txHash = event.transactionHash;
  if (state.processedTxHashes.includes(txHash)) {
    console.log(`${txHash} is already processed!`);
    return;
  }
  try {
    console.log(`Processing ping event - ${txHash}`);
    const tx = await withRetry(() => contract.pong(txHash));
    await withRetry(() => tx.wait());
    console.log(`Pong sent for ${txHash}, Tx Hash of Pong: ${tx.hash}`);
    state.processedTxHashes.push(txHash);
  } catch (error: any) {
    console.error(
      `Error in processing the ping event, Tx- ${txHash}: ${error.message}`
    );
  }
}

// Process all ping events in a block
async function processBlock(blockNumber: number, state: State) {
  if (blockNumber <= state.lastProcessedBlock) return;

  console.log(`Processing block - ${blockNumber}`);
  try {
    const events = await withRetry(() =>
      contract.queryFilter(contract.filters.Ping(), blockNumber, blockNumber)
    );
    for (const event of events) {
      await processPingEvent(event as ethers.EventLog, state);
    }
    state.lastProcessedBlock = blockNumber;
    await saveState(state);
    console.log(`Finished processing the block - ${blockNumber}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error: any) {
    console.error(`Error in processing block - ${blockNumber}: ${error.message}`);
  }
}

// Process the queue one by one
async function processQueue(state: State) {
  if (isProcessing || blockQueue.length === 0) return;
  isProcessing = true;
  try {
    while (blockQueue.length > 0) {
      const blockNumber = blockQueue.shift()!;
      await processBlock(blockNumber, state);
    }
  } finally {
    isProcessing = false;
  }
}

// Start the bot
async function startBot() {
  console.log("Starting bot...");
  const state = await loadState();
  const currentBlock = ethers.toNumber(await provider.getBlockNumber());

  // Add missed blocks to the queue
  for (
    let block = state.lastProcessedBlock + 1;
    block <= currentBlock;
    block++
  ) {
    blockQueue.push(block);
  }

  await processQueue(state);

  // Listen to new blocks
  provider.on("block", async (blockNumber: number) => {
    blockQueue.push(blockNumber);
    await processQueue(state);
  });
}

//Handle errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message, error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Invoke the bot
startBot().catch((error) => {
  console.error(`Bot crashed: ${error.message}`);
});
