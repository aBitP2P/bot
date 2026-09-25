import * as bitcoin from 'bitcoinjs-lib';

const MEMPOOL_URLS_MAINNET = [
  process.env.MEMPOOL_API_BASE_URL || 'https://mempool.space/api',
  'https://mempool.emzy.de/api',
  'https://mempool.bullbitcoin.com/api'
];

const MEMPOOL_URLS_TESTNET = [
  process.env.MEMPOOL_API_BASE_URL || 'https://mempool.space/testnet4/api'
];

export const network = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin;

const baseUrls = process.env.NETWORK === 'testnet' ? MEMPOOL_URLS_TESTNET : MEMPOOL_URLS_MAINNET;

export const mempoolBaseURL = baseUrls[0]!.replace(/\/api$/, "");

export async function fetchMempool(path: string, options?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  let lastError: any;

  for (const baseUrl of baseUrls) {
    try {
      const url = baseUrl + cleanPath;
      const res = await fetch(url, options);
      
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      
      throw new Error(`HTTP Error ${res.status}`);
    } catch (error) {
      console.warn(`[Fallback] Mempool API falló en ${baseUrl}. Intentando siguiente...`);
      lastError = error;
      continue;
    }
  }

  throw new Error(`Todas las URLs de Mempool fallaron. Último error: ${lastError?.message}`);
}