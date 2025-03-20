// Contract ABI 
export const ABI = [
  {
    anonymous: false,
    inputs: [],
    name: "Ping",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_txHash", type: "bytes32" }],
    name: "pong",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];