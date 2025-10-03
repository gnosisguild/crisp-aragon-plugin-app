import { type Address } from "viem";
import { IProposalResource, type RawAction } from "@/utils/types";

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

type TargetConfig = {
  target: Address;
  operation: number;
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
