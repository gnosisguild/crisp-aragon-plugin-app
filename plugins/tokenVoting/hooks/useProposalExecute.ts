import { useState } from "react";
import { useReadContract } from "wagmi";
import { TokenVotingAbi } from "../artifacts/TokenVoting.sol";
import { useRouter } from "next/router";
import { PUB_CHAIN, PUB_TOKEN_VOTING_PLUGIN_ADDRESS } from "@/constants";
import { useTransactionManager } from "@/hooks/useTransactionManager";
import { DaoAbi } from "@/artifacts/DAO.sol";

export function useProposalExecute(proposalId: number) {
  const { reload } = useRouter();
  const [isExecuting, setIsExecuting] = useState(false);

  const {
    data: canExecute,
    isError: isCanVoteError,
    isLoading: isCanVoteLoading,
  } = useReadContract({
    address: PUB_TOKEN_VOTING_PLUGIN_ADDRESS,
    abi: TokenVotingAbi,
    chainId: PUB_CHAIN.id,
    functionName: "canExecute",
    args: [BigInt(proposalId)],
  });

  const { writeContract, isConfirming, isConfirmed } = useTransactionManager({
    onSuccessMessage: "Proposal executed",
    onSuccess() {
      setTimeout(() => reload(), 1000 * 2);
    },
    onErrorMessage: "Could not execute the proposal",
    onErrorDescription: "The proposal may contain actions with invalid operations",
    onError() {
      setIsExecuting(false);
    },
  });

  const executeProposal = () => {
    if (!canExecute) return;
    else if (typeof proposalId === "undefined") return;

    setIsExecuting(true);

    writeContract({
      chainId: PUB_CHAIN.id,
      abi: TokenVotingAbi.concat(DaoAbi as any),
      address: PUB_TOKEN_VOTING_PLUGIN_ADDRESS,
      functionName: "execute",
      args: [BigInt(proposalId)],
    });
  };

  return {
    executeProposal,
    canExecute: !isCanVoteError && !isCanVoteLoading && !isConfirmed && !!canExecute,
    isConfirming: isExecuting || isConfirming,
    isConfirmed,
  };
}
