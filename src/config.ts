import { ethers } from "ethers";
import path from "path";
import { ABI } from "./abi";
import * as dotenv from "dotenv";

dotenv.config();

// Configuration
const CONTRACT_ADDRESS = "0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// Initialize provider, signer, and contract
export const alchemyProvider = new ethers.AlchemyProvider("sepolia", ALCHEMY_API_KEY);
const infuraProvider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
);
export const provider = new ethers.FallbackProvider([
  alchemyProvider,
  infuraProvider,
]);
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
export const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// Path to state file
export const STATE_FILE = path.join(__dirname, "../data/state.json");