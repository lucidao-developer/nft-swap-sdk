import { WalletClient } from 'viem';
import { Numberish } from '../../utils/eth';

export type FeeStruct = {
  recipient: `0x${string}`;
  amount: bigint;
  feeData: `0x${string}`;
};

export type FeeStructSerialized = {
  recipient: string;
  amount: string;
  feeData: string;
};

export type PropertyStruct = {
  propertyValidator: `0x${string}`;
  propertyData: `0x${string}`;
};

export type PropertyStructSerialized = {
  propertyValidator: `0x${string}`;
  propertyData: `0x${string}`;
};

export type ERC1155OrderStruct = {
  direction: number;
  maker: `0x${string}`;
  taker: `0x${string}`;
  expiry: bigint;
  nonce: bigint;
  erc20Token: `0x${string}`;
  erc20TokenAmount: bigint;
  fees: FeeStruct[];
  erc1155Token: `0x${string}`;
  erc1155TokenId: bigint;
  erc1155TokenProperties: PropertyStruct[];
  erc1155TokenAmount: bigint;
};

export type ERC1155OrderStructSerialized = {
  direction: number;
  maker: `0x${string}`;
  taker: `0x${string}`;
  expiry: string;
  nonce: string;
  erc20Token: `0x${string}`;
  erc20TokenAmount: string;
  fees: FeeStructSerialized[];
  erc1155Token: `0x${string}`;
  erc1155TokenId: string;
  erc1155TokenProperties: PropertyStructSerialized[];
  erc1155TokenAmount: string;
};

export type ERC721OrderStruct = {
  direction: number;
  maker: `0x${string}`;
  taker: `0x${string}`;
  expiry: bigint;
  nonce: bigint;
  erc20Token: `0x${string}`;
  erc20TokenAmount: bigint;
  fees: FeeStruct[];
  erc721Token: `0x${string}`;
  erc721TokenId: bigint;
  erc721TokenProperties: PropertyStruct[];
};

export type ERC721OrderStructSerialized = {
  direction: number;
  maker: `0x${string}`;
  taker: `0x${string}`;
  expiry: string;
  nonce: string;
  erc20Token: `0x${string}`;
  erc20TokenAmount: string;
  fees: FeeStructSerialized[];
  erc721Token: `0x${string}`;
  erc721TokenId: string;
  erc721TokenProperties: PropertyStructSerialized[];
};

export type UserFacingFeeStruct = {
  recipient: string;
  amount: Numberish;
  feeData?: string;
};

export interface OrderStructOptionsCommon {
  direction: Numberish;
  maker: string;
  taker: string;
  appId: string;
  expiry: Date | number | string;
  nonce: Numberish;
  // erc20Token: string;
  // erc20TokenAmount: Numberish;
  fees: UserFacingFeeStruct[];
  tokenProperties: PropertyStruct[];
}

export interface OrderStructOptionsCommonStrict {
  direction: Numberish;
  // erc20Token: string;
  // erc20TokenAmount: Numberish;
  maker: string;
  appId?: string;
  taker?: string;
  expiry?: Date | number | string;
  nonce?: Numberish;
  fees?: UserFacingFeeStruct[];
  tokenProperties?: PropertyStruct[];
}

export interface Fee {
  recipient: string;
  amount: bigint;
  feeData: string;
}

export interface Property {
  propertyValidator: string;
  propertyData: string;
}

export type NftOrderV4 = ERC1155OrderStruct | ERC721OrderStruct;

export type NftOrderV4Serialized =
  | ERC1155OrderStructSerialized
  | ERC721OrderStructSerialized;

export interface SignedERC721OrderStruct extends ERC721OrderStruct {
  signature: SignatureStruct;
}

export interface SignedERC1155OrderStruct extends ERC1155OrderStruct {
  signature: SignatureStruct;
}

export interface SignedERC721OrderStructSerialized
  extends ERC721OrderStructSerialized {
  signature: SignatureStructSerialized;
}

export interface SignedERC1155OrderStructSerialized
  extends ERC1155OrderStructSerialized {
  signature: SignatureStructSerialized;
}

export type SignedNftOrderV4 =
  | SignedERC721OrderStruct
  | SignedERC1155OrderStruct;

export type SignedNftOrderV4Serialized =
  | SignedERC721OrderStructSerialized
  | SignedERC1155OrderStructSerialized;

export type ECSignature = {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
};

export type SignatureStruct = {
  signatureType: number; // 2 for EIP-712, 4 for PRESIGNED
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
};

export type SignatureStructSerialized = {
  signatureType: number; // 2 for EIP-712, 4 for PRESIGNED
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
};

export interface ApprovalOverrides {
  walletClient: WalletClient;
  approve: boolean;
  approvalOnlyTokenIdIfErc721: boolean;
  exchangeContractAddress: `0x${string}`;
  chainId: number;
  approvalAmount: Numberish;
}

export interface FillOrderOverrides {
  walletClient: WalletClient;
  tokenIdToSellForCollectionOrder?: bigint;
  /**
   * Fill order with native token if possible
   * e.g. If taker asset is WETH, allows order to be filled with ETH
   */
  fillOrderWithNativeTokenInsteadOfWrappedToken: boolean;
}

export interface BuildOrderAdditionalConfig {
  direction: Numberish;
  maker: string;
  taker: string;
  expiry: Numberish;
  nonce: Numberish;
}

export type AvailableSignatureTypesV4 = 'eoa' | 'eip1271';

export interface SigningOptionsV4 {
  signatureType: AvailableSignatureTypesV4; // | 'autodetect' ? and remove autodetectSignatureType maybe?
  autodetectSignatureType: boolean;
}

// Typings for addresses.json file
export interface AddressesForChainV4 {
  exchange: `0x${string}`;
  wrappedNativeToken: `0x${string}`;
}

// User facing
export interface UserFacingERC20AssetDataSerializedV4 {
  tokenAddress: string;
  type: 'ERC20';
  amount: string;
}

export interface UserFacingERC721AssetDataSerializedV4 {
  tokenAddress: string;
  tokenId: string;
  type: 'ERC721';
}

/**
 * Mimic the erc721 duck type
 */
export interface UserFacingERC1155AssetDataSerializedV4 {
  tokenAddress: string;
  tokenId: string;
  type: 'ERC1155';
  amount?: string; // Will default to '1'
}

export type SwappableNftV4 =
  | UserFacingERC721AssetDataSerializedV4
  | UserFacingERC1155AssetDataSerializedV4;

export type SwappableAssetV4 =
  | UserFacingERC20AssetDataSerializedV4
  | UserFacingERC721AssetDataSerializedV4
  | UserFacingERC1155AssetDataSerializedV4;

export interface VerifyOrderOptionsOverrides {
  verifyApproval?: boolean;
  verifyBalance?: boolean;
}
