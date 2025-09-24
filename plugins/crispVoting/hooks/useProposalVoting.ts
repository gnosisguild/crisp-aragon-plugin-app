import { CrispVotingAbi } from "../artifacts/CrispVoting";
import { useRouter } from "next/router";
import { PUB_CRISP_VOTING_PLUGIN_ADDRESS } from "@/constants";
import { useTransactionManager } from "@/hooks/useTransactionManager";

export function useProposalVoting(proposalIdx: number) {
  const { reload } = useRouter();

  const {
    writeContract,
    status: votingStatus,
    isConfirming,
    isConfirmed,
  } = useTransactionManager({
    onSuccessMessage: "Vote registered",
    onSuccess: reload,
    onErrorMessage: "Could not submit the vote",
  });

  const voteProposal = (votingOption: number, autoExecute: boolean = false) => {
    writeContract({
      abi: CrispVotingAbi,
      address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
      functionName: "vote",
      args: [BigInt(proposalIdx), votingOption, autoExecute],
    });
  };

  return {
    voteProposal,
    status: votingStatus,
    isConfirming,
    isConfirmed,
  };
}
