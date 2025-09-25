import { useState, useEffect } from "react";
import { getAbiItem } from "viem";
import { CrispVotingAbi } from "../artifacts/CrispVoting";
import { Proposal, VoteCastEvent } from "../utils/types";
import { usePublicClient } from "wagmi";
import { PUB_CRISP_VOTING_PLUGIN_ADDRESS } from "@/constants";

const event = getAbiItem({ abi: CrispVotingAbi, name: "VoteCast" });

export function useProposalVoteList(proposalId: bigint, proposal: Proposal | null) {
  const publicClient = usePublicClient();
  const [proposalLogs, setLogs] = useState<VoteCastEvent[]>([]);

  async function getLogs() {
    if (!proposal?.parameters?.snapshotBlock) return;
    else if (!publicClient) return;

    const logs = await publicClient.getLogs({
      address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
      event: event,
      args: {
        proposalId,
      },
      fromBlock: proposal.parameters.snapshotBlock,
      toBlock: "latest", // TODO: Make this variable between 'latest' and proposal last block
    });

    const newLogs = logs.flatMap((log) => log.args);
    if (newLogs.length > proposalLogs.length) setLogs(newLogs);
  }

  useEffect(() => {
    getLogs();
  }, [proposalId, proposal?.parameters?.snapshotBlock]);

  return proposalLogs;
}
