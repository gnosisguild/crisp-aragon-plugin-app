import { PUB_CRISP_SERVER_URL, PUB_TOKEN_ADDRESS } from "@/constants";
import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import type { IRoundDetailsResponse, VotingStep } from "../utils/types";
import { encodeSolidityProof, SIGNATURE_MESSAGE, SIGNATURE_MESSAGE_HASH } from "@crisp-e3/sdk";
import { iVotesAbi } from "../artifacts/iVotes";
import { publicClient } from "../utils/client";
import { useAlerts } from "@/context/Alerts";
import { crispSdk } from "../utils/crispSdk";

export const CRISP_SERVER_STATE_LITE_ROUTE = "state/lite";
export const CRISP_SERVER_STATE_TOKEN_HOLDERS = "state/token-holders";

/**
 * State of the Crisp server
 */
interface CrispServerState {
  isLoading: boolean;
  error: string;
  postVote: (voteOption: bigint, e3Id: bigint) => Promise<void>;
  getTokenHoldersHashes: (e3Id: number) => Promise<bigint[]>;
  votingStep: VotingStep;
  lastActiveStep: VotingStep | null;
  stepMessage: string;
}

/**
 * Request body for broadcasting a vote to the CRISP server
 */
export interface BroadcastVoteRequest {
  round_id: number;
  encoded_proof: string;
  address: string;
}

/**
 * Hook to interact with Crisp server
 * @returns an error, a loading state and a function to cast votes
 */
export function useCrispServer(): CrispServerState {
  const { address } = useAccount();
  const { addAlert } = useAlerts();

  const [votingStep, setVotingStep] = useState<VotingStep>("idle");
  const [lastActiveStep, setLastActiveStep] = useState<VotingStep | null>(null);
  const [stepMessage, setStepMessage] = useState<string>("");

  const { signMessageAsync } = useSignMessage();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const getRoundState = async (e3Id: number): Promise<IRoundDetailsResponse> => {
    const response = await fetch(`${PUB_CRISP_SERVER_URL}/${CRISP_SERVER_STATE_LITE_ROUTE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ round_id: e3Id }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching round data: ${response.statusText}`);
    }

    const data = (await response.json()) as IRoundDetailsResponse;

    return data;
  };

  const getTokenHoldersHashes = async (e3Id: number): Promise<bigint[]> => {
    const response = await fetch(`${PUB_CRISP_SERVER_URL}/${CRISP_SERVER_STATE_TOKEN_HOLDERS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ round_id: e3Id }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching token holder hashes: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((s: string) => BigInt(`0x${s}`));
  };

  const resetVotingState = useCallback(() => {
    setVotingStep("idle");
    setLastActiveStep(null);
    setStepMessage("");
    setIsLoading(false);
  }, []);

  const postVote = async (voteOption: bigint, e3Id: bigint) => {
    setIsLoading(true);
    try {
      if (!address) {
        setError("No address found");
        return;
      }

      // Step 1: Signing
      setVotingStep("signing");
      setLastActiveStep("signing");
      setStepMessage("Please sign the message in your wallet...");

      // get the merkle leaves
      const merkleLeaves = await getTokenHoldersHashes(Number(e3Id));

      const signature = await signMessageAsync({ message: SIGNATURE_MESSAGE });

      const roundState = await getRoundState(Number(e3Id));
      const blockNumber = BigInt(roundState.start_block) - 1n;

      const balance = await publicClient.readContract({
        address: PUB_TOKEN_ADDRESS,
        abi: iVotesAbi,
        functionName: "getPastVotes",
        args: [address as `0x${string}`, blockNumber],
      });

      const decimals = await publicClient.readContract({
        address: PUB_TOKEN_ADDRESS,
        abi: iVotesAbi,
        functionName: "decimals",
      });

      const adjustedBalance = balance / 10n ** BigInt(decimals / 2);

      const vote = voteOption === 0n ? { yes: adjustedBalance, no: 0n } : { yes: 0n, no: adjustedBalance };

      // Step 2: Encrypting vote
      setVotingStep("encrypting");
      setLastActiveStep("encrypting");
      setStepMessage("");

      const proof = await crispSdk.generateVoteProof({
        merkleLeaves,
        publicKey: new Uint8Array(roundState.committee_public_key),
        balance: adjustedBalance,
        vote,
        signature,
        messageHash: SIGNATURE_MESSAGE_HASH,
        e3Id: Number(e3Id),
        slotAddress: address as string,
      });

      // Step 3: Generating proof
      setVotingStep("generating_proof");
      setLastActiveStep("generating_proof");

      // small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      const encodedProof = encodeSolidityProof(proof);

      // For now we are mocking
      const voteBody: BroadcastVoteRequest = {
        encoded_proof: encodedProof,
        address: address as string,
        round_id: Number(e3Id),
      };

      // Step 4: Broadcasting
      setVotingStep("broadcasting");
      setLastActiveStep("broadcasting");

      const response = await fetch(`${PUB_CRISP_SERVER_URL}/voting/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voteBody),
      });

      if (response.status !== 200) {
        setError("Failed to post vote");
      }

      setVotingStep("complete");
      setStepMessage(`Vote submitted successfully!'`);

      addAlert("Vote successfully posted", { timeout: 3000, type: "success" });
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      resetVotingState();
    }
  };

  return {
    postVote,
    error,
    isLoading,
    getTokenHoldersHashes,
    votingStep,
    lastActiveStep,
    stepMessage,
  };
}
