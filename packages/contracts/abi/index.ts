// Generated by script/export-abis.ts
import MinterAbi from './Minter.json';
import PhytCardsAbi from './PhytCards.json';
import ExecutorAbi from './Executor.json';

export { MinterAbi, PhytCardsAbi, ExecutorAbi };

export const BASE_RPC_URL = process.env.BASE_RPC_URL!;

export const deployedAddresses = {
  MINTER: process.env.MINTER_ADDRESS,
  PHYT_CARDS: process.env.PHYT_CARDS_ADDRESS,
  EXECUTOR: process.env.EXECUTOR_ADDRESS,
} as const;