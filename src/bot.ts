import { ethers } from "ethers";
import { loadState, saveState } from "../helpers/state";
import { contract, provider } from "./config";
import { withRetry } from "../helpers/error";
import { State } from "../interface/state";

// Queue to manage block processing
let blockQueue: number[] = [];

// Flag to prevent concurrent queue processing
let isProcessing = false;

/**
 * Processes a single Ping event by sending a corresponding Pong transaction
 * 
 * @param event - The event to process
 * @param state - Current state
 */
async function processPingEvent(event: ethers.EventLog, state: State) {
  console.log("Processing ping event...");

  // Prevent processing of already handled transactions
  const txHash = event.transactionHash;
  if (state.processedTxHashes.includes(txHash)) {
    console.log(`${txHash} is already processed!`);
    return;
  }
  try {
    // Dynamically fetch current gas prices
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    // Send Pong transaction with retry mechanism
    const tx = await withRetry(() => contract.pong(txHash, { gasPrice }));
    await withRetry(() => tx.wait());
    console.log(`Pong sent for ${txHash}, Tx Hash of Pong: ${tx.hash}`);

    // Update processed transactions
    state.processedTxHashes.push(txHash);

    // Save state
    await saveState(state);
  } catch (error: any) {
    console.error(
      `Error in processing the ping event, Tx- ${txHash}: ${error.message}`
    );
  }
}

/**
 * Processes a single block, filter and handle ping events
 * 
 * @param blockNumber - Block number to process
 * @param state - Current state
 */
async function processBlock(blockNumber: number, state: State) {
  // Skip already processed blocks
  if (blockNumber <= state.lastProcessedBlock) return;

  console.log(`Processing block - ${blockNumber}`);
  try {
    // Retrieve Ping events for the specific block
    const events = await withRetry(() =>
      contract.queryFilter(contract.filters.Ping(), blockNumber, blockNumber)
    );
    // Process each event in the block
    for (const event of events) {
      await processPingEvent(event as ethers.EventLog, state);
    }
    // Update last processed block
    state.lastProcessedBlock = blockNumber;
    console.log(`Finished processing the block - ${blockNumber}`);

    // Add a delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error: any) {
    console.error(
      `Error in processing block - ${blockNumber}: ${error.message}`
    );
  }
}

/**
 * Processes block queue in a sequential manner
 * 
 * @param state - Current state
 */
async function processQueue(state: State) {
  // Prevent concurrent queue processing
  if (isProcessing || blockQueue.length === 0) return;
  isProcessing = true;
  try {
    // Process blocks in order
    while (blockQueue.length > 0) {
      const blockNumber = blockQueue.shift()!;
      await processBlock(blockNumber, state);
    }
  } finally {
    // Reset processing flag
    isProcessing = false;
  }
}

/**
 * Initializes and starts the ping event listener bot
 */
async function startBot() {
  console.log("Starting bot...");

  // Load state
  const state = await loadState();

  // Get current block number
  const currentBlock = ethers.toNumber(await provider.getBlockNumber());

  // Add missed blocks to the queue
  for (
    let block = state.lastProcessedBlock + 1;
    block <= currentBlock;
    block++
  ) {
    blockQueue.push(block);
  }

  // Process initial queue
  await processQueue(state);

  // Listen to new blocks
  provider.on("block", async (blockNumber: number) => {
    blockQueue.push(blockNumber);
    await processQueue(state);
  });
}

// Handle errors
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
