import { PUB_CRISP_SERVER_URL, PUB_TOKEN_ADDRESS } from "@/constants";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import type { IRoundDetailsResponse } from "../utils/types";
import { encodeSolidityProof, SIGNATURE_MESSAGE, SIGNATURE_MESSAGE_HASH, generateVoteProof } from "@crisp-e3/sdk";
import { iVotesAbi } from "../artifacts/iVotes";
import { publicClient } from "../utils/client";

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
}

/**
 * Request body for broadcasting a vote to the CRISP server
 */
export interface BroadcastVoteRequest {
  round_id: number;
  encoded_proof: string;
  address: string;
  proof_sem: number[];
}

/**
 * Hook to interact with Crisp server
 * @returns an error, a loading state and a function to cast votes
 */
export function useCrispServer(): CrispServerState {
  const { address } = useAccount();

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

  const postVote = async (voteOption: bigint, e3Id: bigint) => {
    setIsLoading(true);
    try {
      if (!address) {
        setError("No address found");
        return;
      }

      // get the merkle leaves
      const merkleLeaves = await getTokenHoldersHashes(Number(e3Id));

      const signature = await signMessageAsync({ message: SIGNATURE_MESSAGE });

      console.log("e3Id", e3Id);
      const roundState = await getRoundState(Number(e3Id));
      const blockNumber = BigInt(roundState.start_block) - 1n;

      console.log("got round state");
      console.log("roundState", roundState);

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

      const vote = voteOption === 0n ? { yes: 0n, no: adjustedBalance } : { yes: adjustedBalance, no: 0n };

      // const publicKey = await getE3PublicKey(Number(e3Id));

      console.log({
        merkleLeaves,
        publicKey: new Uint8Array(roundState.committee_public_key),
        balance: adjustedBalance,
        vote,
        signature,
        messageHash: SIGNATURE_MESSAGE_HASH,
      });

      const proof = await generateVoteProof({
        merkleLeaves,
        publicKey: new Uint8Array(roundState.committee_public_key),
        balance: adjustedBalance,
        vote,
        signature,
        messageHash: SIGNATURE_MESSAGE_HASH,
      });

      const encodedProof = encodeSolidityProof(proof);

      // For now we are mocking
      const voteBody: BroadcastVoteRequest = {
        encoded_proof: encodedProof,
        address: address as string,
        proof_sem: Array.from([]),
        round_id: Number(e3Id),
      };

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
    } catch (error) {
      console.error("Error posting vote", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    postVote,
    error,
    isLoading,
    getTokenHoldersHashes,
  };
}
