import * as bitcoin from 'bitcoinjs-lib';

export const mempoolURLs: Record<string, string> = {
  testnet: 'https://mempool.space/testnet4/api',
  bitcoin: 'https://mempool.space/api',
};

export const network = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin;

export const mempoolBaseURL = process.env.MEMPOOL_BASE_URL ?? mempoolURLs[process.env.NETWORK || 'testnet'];

export function getMempoolApiPath(path: string) {
  return mempoolBaseURL + (path.startsWith('/') ? path : '/' + path);
}