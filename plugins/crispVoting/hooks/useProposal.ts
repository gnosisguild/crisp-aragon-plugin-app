import { useState, useEffect, useMemo } from "react";
import { useBlockNumber, useReadContract } from "wagmi";
import { CrispVotingAbi } from "../artifacts/CrispVoting";
import { PUB_CRISP_SERVER_URL, PUB_CRISP_VOTING_PLUGIN_ADDRESS } from "@/constants";
import { useMetadata } from "@/hooks/useMetadata";
import { getAbiItem, fromHex } from "viem";
import { publicClient } from "../utils/client";

import type { RawAction, ProposalMetadata } from "@/utils/types";
import type { IRoundDetailsResponse, Proposal, Tally } from "../utils/types";
import type { AbiEvent, Hex } from "viem";
import { CRISP_SERVER_STATE_LITE_ROUTE } from "./useCrispServer";

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
  const [creationEvent, setCreationEvent] = useState<ProposalCreatedLogResponse["args"]>();
  const [metadataUri, setMetadataUri] = useState<string>();
  const { data: blockNumber } = useBlockNumber({ watch: autoRefresh });

  // On-chain proposal data
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

  const [isTallied, setIsTallied] = useState(false);

  // On-chain tally
  const { data: tallyResult, refetch: refetchTally } = useReadContract({
    address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
    abi: CrispVotingAbi,
    functionName: "getTally",
    args: [proposalId],
  });

  const proposalRaw = proposalResult as Proposal | undefined;

  const tally: Tally = useMemo(() => {
    if (!tallyResult) return [];
    const result = tallyResult as { counts?: bigint[] };
    return Array.isArray(result.counts) ? result.counts : [];
  }, [tallyResult]);

  // Auto-refresh on new blocks
  useEffect(() => {
    if (!autoRefresh || !blockNumber) return;
    proposalRefetch();
    refetchTally();
  }, [blockNumber, autoRefresh, proposalRefetch, refetchTally]);

  useEffect(() => {
    if (!proposalRaw?.e3Id) return;

    fetch(`${PUB_CRISP_SERVER_URL}/${CRISP_SERVER_STATE_LITE_ROUTE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round_id: Number(proposalRaw.e3Id.toString()) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: IRoundDetailsResponse | null) => {
        setIsTallied(data?.status === "Finished");
      })
      .catch(() => {});
  }, [proposalRaw?.e3Id, blockNumber]);

  // Fetch creation event (only once when proposal data is available)
  const snapshotBlock = proposalRaw?.parameters?.snapshotBlock;

  useEffect(() => {
    if (!snapshotBlock || !publicClient || creationEvent) return;

    publicClient
      .getLogs({
        address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
        event: ProposalCreatedEvent,
        args: { proposalId },
        fromBlock: snapshotBlock,
      })
      .then((logs) => {
        if (!logs?.length) return;

        const log = logs[0] as unknown as { args: ProposalCreatedLogResponse["args"] };
        setCreationEvent(log.args);
        setMetadataUri(fromHex(log.args.metadata as Hex, "string"));
      })
      .catch((err) => {
        console.error("Could not fetch proposal creation event", err);
      });
  }, [proposalId, snapshotBlock, creationEvent]);

  // JSON metadata
  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
  } = useMetadata<ProposalMetadata>(metadataUri);

  const proposal = useMemo(
    () => arrangeProposalData(proposalRaw, creationEvent, metadata, tally, isTallied),
    [proposalRaw, creationEvent, metadata, tally, isTallied]
  );

  return {
    proposal,
    status: {
      proposalReady: proposalFetchStatus === "idle",
      proposalLoading: proposalFetchStatus === "fetching",
      proposalError,
      metadataReady: !metadataError && !metadataLoading && !!metadata,
      metadataLoading,
      metadataError: metadataError !== undefined,
    },
  };
}

function arrangeProposalData(
  proposalData?: Proposal,
  creationEvent?: ProposalCreatedLogResponse["args"],
  metadata?: ProposalMetadata,
  tally: Tally = [],
  isTallied = false
): Proposal | null {
  if (!proposalData) return null;

  const hasVotes = tally.some((v) => v > 0n);

  return {
    actions: proposalData.actions,
    active: proposalData.parameters.endDate > BigInt(Math.floor(Date.now() / 1000)),
    executed: proposalData.executed,
    parameters: proposalData.parameters,
    tally,
    allowFailureMap: proposalData.allowFailureMap,
    creator: creationEvent?.creator ?? "",
    title: metadata?.title ?? "",
    summary: metadata?.summary ?? "",
    description: metadata?.description ?? "",
    resources: metadata?.resources ?? [],
    e3Id: proposalData.e3Id,
    options: metadata?.options ?? ["Yes", "No"],
    numOptions: metadata?.options?.length ?? 2,
    isTallied: hasVotes || isTallied,
  };
}
