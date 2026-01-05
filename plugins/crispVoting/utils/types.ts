import { type Address } from "viem";
import type { IProposalResource, RawAction } from "@/utils/types";

export type ProposalInputs = {
  proposalId: bigint;
};

export enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export type ProposalParameters = {
  startDate: bigint;
  endDate: bigint;
  snapshotBlock: bigint;
  minVotingPower: bigint;
};

export type Tally = {
  yes: bigint;
  no: bigint;
};

export type MetadataResource = {
  name: string;
  url: string;
};

export type Proposal = {
  active: boolean;
  executed: boolean;
  parameters: ProposalParameters;
  tally: Tally;
  actions: RawAction[];
  allowFailureMap: bigint;
  creator: string;
  title: string;
  summary: string;
  description: string;
  resources: IProposalResource[];
  e3Id: bigint;
};

export type ProposalMetadata = {
  title: string;
  summary: string;
  resources: MetadataResource[];
  description: string;
};

export type VoteCastResponse = {
  args: VoteCastEvent[];
};

export type VoteCastEvent = {
  voter: Address;
  proposalId: bigint;
  voteOption: number;
  votingPower: bigint;
};

//  event VoteCast(
//   uint32 indexed dstEid,
//   uint256 indexed proposalRef,
//   address indexed voter,
//   Tally voteOptions
// );
export type VoteCastRelayEvent = {
  dstEid: number;
  proposalRef: bigint;
  voter: Address;
  voteOptions: Tally;
};

export type VoteCastRelayResponse = {
  args: VoteCastRelayEvent[];
};

///  event VotesReceived(uint256 proposalId,uint256 votingChainId,address plugin,IVoteContainer.Tally votes);
export type VotesReceivedEvent = {
  proposalId: bigint;
  votingChainId: bigint;
  plugin: Address;
  votes: Tally;
};

export type VotesReceivedResponse = {
  args: VotesReceivedEvent[];
};

export enum VoteOption {
  Yes,
  No,
  Abstain,
}

/**
 * Interface representing the details of a specific round returned by the CRISP server
 */
export interface IRoundDetailsResponse {
  id: string;
  chain_id: string;
  enclave_address: string;
  status: string;
  vote_count: string;
  start_time: string;
  duration: string;
  expiration: string;
  start_block: string;
  committee_public_key: number[];
  emojis: [string, string];
  token_address: string;
  balance_threshold: string;
}

export type VotingStep =
  | "idle"
  | "signing"
  | "encrypting"
  | "generating_proof"
  | "broadcasting"
  | "confirming"
  | "complete"
  | "error";
