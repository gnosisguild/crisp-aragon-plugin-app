import { useState, useEffect } from "react";
import { Address, getAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { MultisigProposal, ApprovedEvent } from "../utils/types";
import { OptimisticMultisigPluginAbi } from "../artifacts/OptimisticMultisigPlugin";
import { PUB_CHAIN } from "@/constants";

const event = getAbiItem({
  abi: OptimisticMultisigPluginAbi,
  name: "Approved",
});

export function useProposalApprovals(pluginAddress: Address, proposalId: string, proposal: MultisigProposal | null) {
  const publicClient = usePublicClient({ chainId: PUB_CHAIN.id });
  const [proposalLogs, setLogs] = useState<ApprovedEvent[]>([]);

  async function getLogs() {
    if (!publicClient || !proposal?.parameters?.snapshotBlock) return;

    const logs = await publicClient.getLogs({
      address: pluginAddress,
      event: event,
      args: {
        proposalId: BigInt(proposalId),
      },
      fromBlock: proposal.parameters.snapshotBlock,
      toBlock: "latest", // TODO: Make this variable between 'latest' and proposal last block
    });

    const newLogs = logs.flatMap((log) => log.args);
    if (newLogs.length > proposalLogs.length) setLogs(newLogs);
  }

  useEffect(() => {
    getLogs();
  }, [!!publicClient, proposal?.parameters?.snapshotBlock]);

  return proposalLogs;
}
