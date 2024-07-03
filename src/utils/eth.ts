import { getAddress, isHex, maxUint256 } from 'viem';

export const CRYPTO_KITTIES_CONTRACT_ADDRESS =
  '0x06012c8cf97bead5deae237070f9587f8e7a266d';

export const ETH_GAS_STATION_API_BASE_URL = 'https://ethgasstation.info';
export const ETH_GAS_STATION_GAS_ENDPOINT = `${ETH_GAS_STATION_API_BASE_URL}/json/ethgasAPI.json`;

export const MAX_UINT256 = maxUint256;
export const UNLIMITED_ALLOWANCE_IN_BASE_UNITS = MAX_UINT256;
export const GWEI_IN_WEI = 1000000000n;
export const GWEI_IN_ETH = 1000000000n;

export const ZERO_AMOUNT = 0n;
export const ONE_AMOUNT = 1n;

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES = '0x';
export const BASE_TEN = 10;

export const ONE_NFT_UNIT = ONE_AMOUNT;
export const ZERO_NFT_UNIT = ZERO_AMOUNT;
export const DEFAULT_ERC20_TOKEN_DECIMALS = 18n;

export type Numberish = bigint | number | string;

const isENSAddressFormat = (address: string) => !!address.match(/.+\..+/g);

const getEthPriceInUsd = async (): Promise<number | undefined> => {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  );
  const json = await res.json();
  return json?.ethereum?.usd;
};

export interface ObjectMap<T> {
  [key: string]: T;
}

const arrayToMapWithId = <T extends object>(
  array: T[],
  idKey: keyof T
): ObjectMap<T> => {
  const initialMap: ObjectMap<T> = {};
  return array.reduce((acc, val) => {
    const id = val[idKey] as any;
    acc[id] = val;
    return acc;
  }, initialMap);
};

const isHexAddressFormat = (address: string): boolean => {
  if (!isHex(address)) return false;
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    return false;
  }
  if (
    /^(0x)?[0-9a-f]{40}$/.test(address) ||
    /^(0x)?[0-9A-F]{40}$/.test(address)
  ) {
    return true;
  }
  return true;
};

export function getUrlForFallbackTokenIcon(address: string) {
  let checksummedAddress: string;
  try {
    checksummedAddress = getAddress(address);
  } catch {
    return null;
  }
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksummedAddress}/logo.png`;
}

const getShortenedAddress = (
  address: string,
  start: number = 6,
  end: number = 4
) => {
  const shortenedAddress = `${address.slice(0, start)}...${address.slice(
    -1 * end
  )}`;
  return shortenedAddress;
};

export const toUnitAmount = (amount: bigint, decimals: number) => {
  const unit = BigInt(BASE_TEN) ** BigInt(decimals);

  const unitAmount = amount / unit;

  return unitAmount;
};

const getEtherscanRootUrlForChain = (chainId: number) => {
  if (chainId === 4) {
    return 'https://rinkeby.etherscan.io';
  }
  return 'https://etherscan.io';
};

export const getEtherscanLinkFromTxHash = (txHash: string, chainId: number) => {
  if (!txHash) {
    return undefined;
  }
  const etherscanRoot = getEtherscanRootUrlForChain(chainId);
  const normalizedHash = txHash.replace(/-.*/g, '');
  const etherscanLink = `${etherscanRoot}/tx/${normalizedHash}`;
  return etherscanLink;
};

export const getEtherscanLinkForAccount = (
  account: string,
  chainId: number
) => {
  if (!account) {
    return undefined;
  }
  const etherscanRoot = getEtherscanRootUrlForChain(chainId);
  const normalizedAccount = account.replace(/-.*/g, '');
  const etherscanLink = `${etherscanRoot}/address/${normalizedAccount}`;
  return etherscanLink;
};

export {
  isENSAddressFormat,
  isHexAddressFormat,
  getEthPriceInUsd,
  arrayToMapWithId,
  getShortenedAddress,
};
