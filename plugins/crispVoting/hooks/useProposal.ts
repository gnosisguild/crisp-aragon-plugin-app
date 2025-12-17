import { useState, useEffect } from "react";
import { useBlockNumber, usePublicClient, useReadContract } from "wagmi";
import { AbiEvent, Hex, fromHex, getAbiItem } from "viem";
import { CrispVotingAbi } from "../artifacts/CrispVoting";
import { RawAction, ProposalMetadata } from "@/utils/types";
import { Proposal, ProposalParameters, Tally } from "../utils/types";
import { PUB_CRISP_VOTING_PLUGIN_ADDRESS } from "@/constants";
import { useMetadata } from "@/hooks/useMetadata";
import { publicClient } from "../utils/client";

type ProposalCreatedLogResponse = {
  args: {
    actions: RawAction[];
    allowFailureMap: bigint;
    creator: string;
    endDate: bigint;
    startDate: bigint;
    metadata: string;
    proposalId: bigint;
  };
};

export const ProposalCreatedEvent = getAbiItem({
  abi: CrispVotingAbi,
  name: "ProposalCreated",
}) as AbiEvent;

export function useProposal(proposalId: bigint, autoRefresh = false) {
  const [proposalCreationEvent, setProposalCreationEvent] = useState<ProposalCreatedLogResponse["args"]>();
  const [metadataUri, setMetadataUri] = useState<string>();
  const { data: blockNumber } = useBlockNumber();
  // Proposal on-chain data
  const {
    data: proposalResult,
    error: proposalError,
    fetchStatus: proposalFetchStatus,
    refetch: proposalRefetch,
  } = useReadContract({
    address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
    abi: CrispVotingAbi,
    functionName: "getProposal",
    args: [proposalId],
  });

  const { data: tallyResult, refetch: refetchTally } = useReadContract({
    address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
    abi: CrispVotingAbi,
    functionName: "getTally",
    args: [proposalId],
  });

  const proposalRaw = proposalResult as Proposal;
  const tally = tallyResult as Tally;

  useEffect(() => {
    if (autoRefresh) refetchTally();
  }, [blockNumber]);

  useEffect(() => {
    if (autoRefresh) proposalRefetch();
  }, [blockNumber]);

  // Creation event
  useEffect(() => {
    if (!proposalResult || !publicClient) return;

    try {
      publicClient
        .getLogs({
          address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
          event: ProposalCreatedEvent,
          args: {
            proposalId,
          },
          fromBlock: proposalRaw.parameters.snapshotBlock,
        })
        .then((logs) => {
          if (!logs || !logs.length) throw new Error("No creation logs");

          const log: ProposalCreatedLogResponse = logs[0] as any;
          setProposalCreationEvent(log.args);
          setMetadataUri(fromHex(log.args.metadata as Hex, "string"));
        })
        .catch((err) => {
          console.error("Could not fetch the proposal details", err);
        });
    } catch (err) {
      console.error("Could not fetch the proposal details", err);
    }
  }, [proposalRaw?.tally.yes, proposalRaw?.tally.no, !!publicClient]);

  // JSON metadata
  const {
    data: metadataContent,
    isLoading: metadataLoading,
    error: metadataError,
  } = useMetadata<ProposalMetadata>(metadataUri);

  const proposal = arrangeProposalData(proposalRaw, proposalCreationEvent, metadataContent, tally);

  return {
    proposal,
    status: {
      proposalReady: proposalFetchStatus === "idle",
      proposalLoading: proposalFetchStatus === "fetching",
      proposalError,
      metadataReady: !metadataError && !metadataLoading && !!metadataContent,
      metadataLoading,
      metadataError: metadataError !== undefined,
    },
  };
}

// Helpers
function arrangeProposalData(
  proposalData?: Proposal,
  creationEvent?: ProposalCreatedLogResponse["args"],
  metadata?: ProposalMetadata,
  tally?: Tally
): Proposal | null {
  if (!proposalData) return null;

  return {
    actions: proposalData.actions,
    active: proposalData.parameters.endDate > BigInt(Math.floor(Date.now() / 1000)),
    executed: proposalData.executed,
    parameters: proposalData.parameters,
    tally: proposalData.tally || tally,
    allowFailureMap: proposalData.allowFailureMap,
    creator: creationEvent?.creator || "",
    title: metadata?.title || "",
    summary: metadata?.summary || "",
    description: metadata?.description || "",
    resources: metadata?.resources || [],
    e3Id: proposalData.e3Id,
  };
}
