import getUnixTime from 'date-fns/getUnixTime';
import { v4 } from 'uuid';
import warning from 'tiny-warning';
import invariant from 'tiny-invariant';
import padEnd from 'lodash/padEnd';
import padStart from 'lodash/padStart';
import { NULL_ADDRESS, Numberish } from '../../utils/eth';
import { UnexpectedAssetTypeError } from '../error';
import type {
  ECSignature,
  ERC721OrderStruct,
  ERC721OrderStructSerialized,
  ERC1155OrderStruct,
  ERC1155OrderStructSerialized,
  NftOrderV4,
  OrderStructOptionsCommon,
  OrderStructOptionsCommonStrict,
  SignedNftOrderV4,
  SignedNftOrderV4Serialized,
  SwappableAssetV4,
  UserFacingERC20AssetDataSerializedV4,
  UserFacingERC721AssetDataSerializedV4,
  UserFacingERC1155AssetDataSerializedV4,
  ApprovalOverrides,
} from './types';
import { ApprovalStatus, TransactionOverrides } from '../common/types';
import {
  ERC721ORDER_STRUCT_NAME,
  ERC721ORDER_STRUCT_ABI,
  ERC1155ORDER_STRUCT_NAME,
  ERC1155ORDER_STRUCT_ABI,
  FEE_ABI,
  PROPERTY_ABI,
  ETH_ADDRESS_AS_ERC20,
} from './constants';
import {
  erc20Abi,
  erc721Abi,
  hexToBytes,
  PublicClient,
  slice,
  WalletClient,
  zeroAddress,
} from 'viem';
import { erc1155Abi } from '../../abis/erc1155';

// Some arbitrarily high number.
// TODO(johnrjj) - Support custom ERC20 approval amounts
export const MAX_APPROVAL = 2n ** 118n;

// Weird issue with bigint and approvals...need to look into it, adding buffer.
const MAX_APPROVAL_WITH_BUFFER = MAX_APPROVAL - 100000000000000000n;

export const signOrderWithEoaWallet = async (
  order: NftOrderV4,
  walletClient: WalletClient,
  chainId: number,
  exchangeContractAddress: `0x${string}`
) => {
  if ((order as ERC1155OrderStruct).erc1155Token) {
    const domain = {
      chainId: chainId,
      verifyingContract: exchangeContractAddress,
      name: 'ZeroEx',
      version: '1.0.0',
    };
    const types = {
      [ERC1155ORDER_STRUCT_NAME]: ERC1155ORDER_STRUCT_ABI,
      Fee: FEE_ABI,
      Property: PROPERTY_ABI,
    };

    const rawSignatureFromEoaWallet = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'ERC1155Order',
      message: order,
      account: walletClient.account || zeroAddress,
    });

    return rawSignatureFromEoaWallet;
  }

  if ((order as ERC721OrderStruct).erc721Token) {
    const domain = {
      chainId: chainId,
      verifyingContract: exchangeContractAddress,
      name: 'ZeroEx',
      version: '1.0.0',
    };
    const types = {
      [ERC721ORDER_STRUCT_NAME]: ERC721ORDER_STRUCT_ABI,
      Fee: FEE_ABI,
      Property: PROPERTY_ABI,
    };
    const value = order;

    const rawSignatureFromEoaWallet = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'ERC721Order',
      message: order,
      account: walletClient.account || zeroAddress,
    });

    return rawSignatureFromEoaWallet;
  }

  warning(!order, 'Unknown order type');
  throw new Error(`Unknown order type`);
};

export const preSignOrder = async (
  order: NftOrderV4,
  walletClient: WalletClient,
  chainId: number,
  exchangeContractAddress: `0x${string}`
) => {
  if ((order as ERC1155OrderStruct).erc1155Token) {
    const domain = {
      chainId: chainId,
      verifyingContract: exchangeContractAddress,
      name: 'ZeroEx',
      version: '1.0.0',
    };
    const types = {
      [ERC1155ORDER_STRUCT_NAME]: ERC1155ORDER_STRUCT_ABI,
      Fee: FEE_ABI,
      Property: PROPERTY_ABI,
    };

    const rawSignatureFromEoaWallet = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'ERC1155Order',
      message: order,
      account: walletClient.account || zeroAddress,
    });

    return rawSignatureFromEoaWallet;
  }

  if ((order as ERC721OrderStruct).erc721Token) {
    const domain = {
      chainId: chainId,
      verifyingContract: exchangeContractAddress,
      name: 'ZeroEx',
      version: '1.0.0',
    };
    const types = {
      [ERC721ORDER_STRUCT_NAME]: ERC721ORDER_STRUCT_ABI,
      Fee: FEE_ABI,
      Property: PROPERTY_ABI,
    };

    const rawSignatureFromEoaWallet = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'ERC721Order',
      message: order,
      account: walletClient.account || zeroAddress,
    });

    return rawSignatureFromEoaWallet;
  }

  warning(!order, 'Unknown order type');
  throw new Error(`Unknown order type`);
};

export const checkIfContractWallet = async (
  publicClient: PublicClient,
  walletAddress: `0x${string}`
): Promise<boolean> => {
  let isContractWallet: boolean = false;
  if (publicClient) {
    let walletCode = await publicClient.getCode({ address: walletAddress });
    // Wallet Code returns '0x' if no contract address is associated with
    // Note: Lazy loaded contract wallets will show 0x initially, so we fall back to feature detection
    if (walletCode && walletCode !== '0x') {
      isContractWallet = true;
    }
  }

  return isContractWallet;
};

/**
 *
 * @param walletAddress Owner of the asset
 * @param exchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param provider
 * @returns
 */
export const getApprovalStatus = async (
  walletAddress: `0x${string}`,
  exchangeProxyAddressForAsset: `0x${string}`,
  asset: SwappableAssetV4,
  publicClient: PublicClient,
  // ERC20 approval amount manual setting. Not used for ERC721/1155s.
  approvalAmount: Numberish = MAX_APPROVAL_WITH_BUFFER
): Promise<ApprovalStatus> => {
  switch (asset.type) {
    case 'ERC20':
      // ETH (ERC20 representation) requires no approvals, we can shortcut here
      if (asset.tokenAddress.toLowerCase() === ETH_ADDRESS_AS_ERC20) {
        return {
          contractApproved: true,
        };
      }
      const erc20Allowance = await publicClient.readContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'allowance',
        abi: erc20Abi,
        args: [walletAddress, exchangeProxyAddressForAsset],
      });

      const hasEnoughApproval = erc20Allowance >= BigInt(approvalAmount);
      return {
        contractApproved: hasEnoughApproval,
      };
    case 'ERC721':
      const erc721ApprovalForAllPromise = publicClient.readContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'isApprovedForAll',
        abi: erc721Abi,
        args: [walletAddress, exchangeProxyAddressForAsset],
      });
      const erc721ApprovedAddressForIdPromise = publicClient.readContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'getApproved',
        abi: erc721Abi,
        args: [BigInt(asset.tokenId)],
      });

      const [erc721ApprovalForAll, erc721ApprovedAddressForId] =
        await Promise.all([
          erc721ApprovalForAllPromise,
          erc721ApprovedAddressForIdPromise,
        ]);
      const tokenIdApproved =
        erc721ApprovedAddressForId.toLowerCase() ===
        exchangeProxyAddressForAsset.toLowerCase();
      return {
        contractApproved: erc721ApprovalForAll ?? false,
        tokenIdApproved: tokenIdApproved,
      };
    case 'ERC1155':
      const erc1155ApprovalForAll = await publicClient.readContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'isApprovedForAll',
        abi: erc1155Abi,
        args: [walletAddress, exchangeProxyAddressForAsset],
      });

      return {
        contractApproved: erc1155ApprovalForAll ?? false,
      };
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

/**
 * @param exchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param signer Signer, must be a signer not a provider, as signed transactions are needed to approve
 * @param approve Optional, can specify to unapprove asset when set to false
 * @returns
 */
export const approveAsset = async (
  exchangeProxyAddressForAsset: `0x${string}`,
  asset: SwappableAssetV4,
  walletClient: WalletClient,
  txOverrides: Partial<TransactionOverrides> = {},
  approvalOverrides?: Partial<ApprovalOverrides>
) => {
  const approve = approvalOverrides?.approve ?? true;

  switch (asset.type) {
    case 'ERC20':
      const approvalAmount = BigInt(
        approvalOverrides?.approvalAmount ?? MAX_APPROVAL
      );
      return walletClient.writeContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'approve',
        abi: erc20Abi,
        args: [exchangeProxyAddressForAsset, approve ? approvalAmount : 0n],
        chain: walletClient.chain,
        account: walletClient.account || zeroAddress,
        ...txOverrides,
      } as any);
    case 'ERC721':
      // If consumer prefers only to approve the tokenId, only approve tokenId
      if (approvalOverrides?.approvalOnlyTokenIdIfErc721) {
        return walletClient.writeContract({
          address: asset.tokenAddress as `0x${string}`,
          functionName: 'approve',
          abi: erc721Abi,
          args: [exchangeProxyAddressForAsset, BigInt(asset.tokenId)],
          chain: walletClient.chain,
          account: walletClient.account || zeroAddress,
          ...txOverrides,
        } as any);
      }
      // Otherwise default to approving entire contract
      return walletClient.writeContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'setApprovalForAll',
        abi: erc721Abi,
        args: [exchangeProxyAddressForAsset, approve],
        chain: walletClient.chain,
        account: walletClient.account || zeroAddress,
        ...txOverrides,
      } as any);
    case 'ERC1155':
      // ERC1155s can only approval all
      return walletClient.writeContract({
        address: asset.tokenAddress as `0x${string}`,
        functionName: 'setApprovalForAll',
        abi: erc1155Abi,
        args: [exchangeProxyAddressForAsset, approve],
        chain: walletClient.chain,
        account: walletClient.account || zeroAddress,
        ...txOverrides,
      } as any);
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

// Parse a hex signature returned by an RPC call into an `ECSignature`.
export function parseRawSignature(rawSignature: `0x${string}`): ECSignature {
  const hexSize = hexToBytes(rawSignature).length;
  if (hexSize !== 65) {
    throw new Error(
      `Invalid signature length, expected 65, got ${hexSize}.\n"Raw signature: ${rawSignature}"`
    );
  }
  // Some providers encode V as 0,1 instead of 27,28.
  const VALID_V_VALUES = [0, 1, 27, 28];
  // Some providers return the signature packed as V,R,S and others R,S,V.
  // Try to guess which encoding it is (with a slight preference for R,S,V).
  // let v = parseInt(rpcSig.slice(-2), 16);
  let v = parseInt(rawSignature.slice(-2), 16);

  if (VALID_V_VALUES.includes(v)) {
    // Format is R,S,V
    v = v >= 27 ? v : v + 27;
    return {
      r: slice(rawSignature, 0, 32),
      s: slice(rawSignature, 32, 64),
      v,
    };
  }
  // Format should be V,R,S
  // v = parseInt(rpcSig.slice(2, 4), 16);
  v = parseInt(rawSignature.slice(2, 4), 16);
  if (!VALID_V_VALUES.includes(v)) {
    throw new Error(
      `Cannot determine RPC signature layout from V value: "${rawSignature}"`
    );
  }
  v = v >= 27 ? v : v + 27;
  return {
    v,
    r: slice(rawSignature, 1, 33),
    s: slice(rawSignature, 33, 65),
  };
}

export const INFINITE_EXPIRATION_TIMESTAMP_SEC = BigInt(2524604400);

export const generateErc721Order = async (
  nft: UserFacingERC721AssetDataSerializedV4,
  erc20: UserFacingERC20AssetDataSerializedV4,
  orderData: Partial<OrderStructOptionsCommon> & OrderStructOptionsCommonStrict
): Promise<ERC721OrderStructSerialized> => {
  let expiry = INFINITE_EXPIRATION_TIMESTAMP_SEC.toString();
  if (orderData.expiry) {
    // If number or string is provided, assume given as unix timestamp
    if (
      typeof orderData.expiry === 'number' ||
      typeof orderData.expiry === 'string'
    ) {
      expiry = orderData.expiry.toString();
    } else {
      // If date is provided, convert to unix timestamp
      expiry = getUnixTime(orderData.expiry).toString();
    }
  }
  const erc721Order: ERC721OrderStructSerialized = {
    erc721Token: nft.tokenAddress.toLowerCase() as `0x${string}`,
    erc721TokenId: nft.tokenId,
    direction: parseInt(orderData.direction.toString()), // KLUDGE(johnrjj) - There's some footgun here when only doing orderData.direction.toString(), need to parseInt it
    erc20Token: erc20.tokenAddress.toLowerCase() as `0x${string}`,
    erc20TokenAmount: erc20.amount,
    maker: orderData.maker.toLowerCase() as `0x${string}`,
    // Defaults not required...
    erc721TokenProperties:
      orderData.tokenProperties?.map((property) => ({
        propertyData: property.propertyData,
        propertyValidator: property.propertyValidator,
      })) ?? [],
    fees:
      orderData.fees?.map((x) => {
        return {
          amount: x.amount.toString(),
          recipient: x.recipient.toLowerCase(),
          feeData: x.feeData?.toString() ?? '0x',
        };
      }) ?? [],
    expiry: expiry,
    nonce: orderData.nonce?.toString() ?? (await generateRandomV4OrderNonce()),
    taker: (orderData.taker?.toLowerCase() ?? NULL_ADDRESS) as `0x${string}`,
  };

  return erc721Order;
};

export const generateErc1155Order = async (
  nft: UserFacingERC1155AssetDataSerializedV4,
  erc20: UserFacingERC20AssetDataSerializedV4,
  orderData: Partial<OrderStructOptionsCommon> & OrderStructOptionsCommonStrict
): Promise<ERC1155OrderStructSerialized> => {
  let expiry = INFINITE_EXPIRATION_TIMESTAMP_SEC.toString();
  if (orderData.expiry) {
    // If number or string is provided, assume given as unix timestamp
    if (
      typeof orderData.expiry === 'number' ||
      typeof orderData.expiry === 'string'
    ) {
      expiry = orderData.expiry.toString();
    } else {
      // If date is provided, convert to unix timestamp
      expiry = getUnixTime(orderData.expiry).toString();
    }
  }
  const erc1155Order: ERC1155OrderStructSerialized = {
    erc1155Token: nft.tokenAddress.toLowerCase() as `0x${string}`,
    erc1155TokenId: nft.tokenId,
    erc1155TokenAmount: nft.amount ?? '1',
    direction: parseInt(orderData.direction.toString(10)), // KLUDGE(johnrjj) - There's some footgun here when only doing orderData.direction.toString(), need to parseInt it
    erc20Token: erc20.tokenAddress.toLowerCase() as `0x${string}`,
    erc20TokenAmount: erc20.amount,
    maker: orderData.maker.toLowerCase() as `0x${string}`,
    // Defaults not required...
    erc1155TokenProperties:
      orderData.tokenProperties?.map((property) => ({
        propertyData: property.propertyData.toString() as `0x${string}`,
        propertyValidator: property.propertyValidator,
      })) ?? [],
    fees:
      orderData.fees?.map((fee) => {
        return {
          amount: fee.amount.toString(),
          recipient: fee.recipient.toLowerCase(),
          feeData: fee.feeData?.toString() ?? '0x',
        };
      }) ?? [],
    expiry: expiry,
    nonce: orderData.nonce?.toString() ?? (await generateRandomV4OrderNonce()),
    taker: (orderData.taker?.toLowerCase() ?? NULL_ADDRESS) as `0x${string}`,
  };

  return erc1155Order;
};

// Number of digits in base 10 128bit nonce
// floor(log_10(2^128 - 1)) + 1
export const ONE_TWENTY_EIGHT_BIT_LENGTH = 39;

// Max nonce digit length in base 10
// floor(log_10(2^256 - 1)) + 1
export const TWO_FIFTY_SIX_BIT_LENGTH = 78;

const checkIfStringContainsOnlyNumbers = (val: string) => {
  const onlyNumbers = /^\d+$/.test(val);
  return onlyNumbers;
};

export const RESERVED_APP_ID_PREFIX = '1001';
const RESERVED_APP_ID_PREFIX_DIGITS = RESERVED_APP_ID_PREFIX.length;

export const DEFAULT_APP_ID = '314159';

export const verifyAppIdOrThrow = (appId: string) => {
  const isCorrectLength =
    appId.length <= ONE_TWENTY_EIGHT_BIT_LENGTH - RESERVED_APP_ID_PREFIX_DIGITS;
  const hasOnlyNumbers = checkIfStringContainsOnlyNumbers(appId);
  invariant(isCorrectLength, 'appId must be 39 digits or less');
  invariant(
    hasOnlyNumbers,
    'appId must be numeric only (no alpha or special characters, only numbers)'
  );
};

/**
 * Generates a 256bit nonce.
 * The format:
 *   First 128bits:  ${SDK_PREFIX}${UNIX_TIMESTAMP}00 (right padded zeroes to fill)
 *   Second 128bits: ${RANDOM_GENERATED_128BIT_ORDER_HASH}
 * @returns 128bit nonce as string (0x orders can handle up to 256 bit nonce)
 */
export const generateRandomV4OrderNonce = async (): Promise<string> => {
  const order128 = padStart(
    generateRandom128BitNumber(),
    ONE_TWENTY_EIGHT_BIT_LENGTH,
    '0'
  );
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const date = await (
    await fetch('https://worldtimeapi.org/api/timezone/' + tz)
  ).json();
  const sdkPrefixWithOrderTimestamp = padEnd(
    `${RESERVED_APP_ID_PREFIX}${Math.round(
      new Date(date.utc_datetime).getTime() / 1000
    )}`,
    ONE_TWENTY_EIGHT_BIT_LENGTH,
    '0'
  );
  const final256BitNonce = `${sdkPrefixWithOrderTimestamp}${order128}`;
  invariant(
    final256BitNonce.length <= TWO_FIFTY_SIX_BIT_LENGTH,
    'Invalid nonce size'
  );
  return final256BitNonce;
};

// uuids are 128bits
export const generateRandom128BitNumber = (base = 10): string => {
  const hex = '0x' + v4().replace(/-/g, '');
  const value = BigInt(hex);
  const valueBase10String = value.toString(base); // don't convert this to a number, will lose precision
  return valueBase10String;
};

export const serializeNftOrder = (
  signedOrder: SignedNftOrderV4
): SignedNftOrderV4Serialized => {
  if ('erc721Token' in signedOrder) {
    return {
      ...signedOrder,
      direction: parseInt(signedOrder.direction.toString()),
      expiry: signedOrder.expiry.toString(),
      nonce: signedOrder.nonce.toString(),
      erc20TokenAmount: signedOrder.erc20TokenAmount.toString(),
      fees: signedOrder.fees.map((fee) => ({
        ...fee,
        amount: fee.amount.toString(),
        feeData: fee.feeData.toString(),
      })),
      erc721TokenId: signedOrder.erc721TokenId.toString(),
    };
  } else if ('erc1155Token' in signedOrder) {
    return {
      ...signedOrder,
      direction: parseInt(signedOrder.direction.toString()),
      expiry: signedOrder.expiry.toString(),
      nonce: signedOrder.nonce.toString(),
      erc20TokenAmount: signedOrder.erc20TokenAmount.toString(),
      fees: signedOrder.fees.map((fee) => ({
        ...fee,
        amount: fee.amount.toString(),
        feeData: fee.feeData.toString(),
      })),
      erc1155TokenAmount: signedOrder.erc1155TokenAmount.toString(),
      erc1155TokenId: signedOrder.erc1155TokenId.toString(),
    };
  } else {
    console.log(
      'unknown order format type (not erc721 and not erc1155',
      signedOrder
    );
    throw new Error('Unknown asset type');
  }
};
