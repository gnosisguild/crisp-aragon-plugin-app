import { CIPHERNODE_REGISTRY_ADDRESS, ENCLAVE_ADDRESS, PUB_CRISP_SERVER_URL } from "@/constants";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { IRoundDetailsResponse } from "../utils/types";
import { hexToBytes } from "viem";
import {
  encryptVoteAndGenerateCRISPInputs,
  generateProofWithReturnValue,
  VotingMode,
  encodeVote,
  encryptVote,
  generateMerkleProof,
  verifyProof,
  hashLeaf,
  generatePublicKey,
} from "@crisp-e3/sdk";

export const CRISP_SERVER_STATE_LITE_ROUTE = "state/lite";

/**
 * State of the Crisp server
 */
interface CrispServerState {
  isLoading: boolean;
  error: string;
  postVote: (voteOption: bigint, e3Id: bigint) => Promise<void>;
  getE3PublicKey: (e3Id: number) => Promise<Uint8Array>;
}

/**
 * Request body for broadcasting a vote to the CRISP server
 */
export interface BroadcastVoteRequest {
  round_id: number;
  enc_vote_bytes: number[];
  proof: number[];
  public_inputs: number[][];
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

  const getE3PublicKey = async (e3Id: number): Promise<Uint8Array> => {
    console.log("e3Id", e3Id);
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

    return Uint8Array.from(data.committee_public_key.map((s) => parseInt(s)));
  };

  const postVote = async (voteOption: bigint, e3Id: bigint) => {
    setIsLoading(true);
    try {
      if (!address) {
        setError("No address found");
        return;
      }

      const message = `Vote for round ${e3Id}`;
      const signature = await signMessageAsync({ message });

      const vote = voteOption === 0n ? { yes: 0n, no: 1n } : { yes: 1n, no: 0n };
      const balance = 1n;

      const publicKey = await getE3PublicKey(Number(e3Id));

      const leaf = hashLeaf(address.toLowerCase(), balance.toString());
      // TODO: get the leaves from the server (pass them from the client).
      const merkleProof = generateMerkleProof(0n, balance, address.toLowerCase(), [
        leaf,
        4720511075913887710172192848636076523165432993226978491435561065722130431597n,
        14131255645332550266535358189863475289290770471998199141522479556687499890181n,
      ]);

      const encodedVote = await encodeVote(vote, VotingMode.GOVERNANCE, balance);
      const encryptedVote = await encryptVote(encodedVote, publicKey);

      const inputs = await encryptVoteAndGenerateCRISPInputs({
        encodedVote,
        publicKey,
        previousCiphertext: encryptedVote,
        signature,
        message,
        merkleData: merkleProof,
        balance,
        slotAddress: address.toLowerCase(),
        isFirstVote: true,
      });

      const { proof } = await generateProofWithReturnValue(inputs);

      // For now we are mocking
      const voteBody: BroadcastVoteRequest = {
        proof: Array.from(proof.proof),
        enc_vote_bytes: Array.from(encryptedVote),
        public_inputs: proof.publicInputs.map((h) => Array.from(hexToBytes(h as `0x${string}`))),
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
    getE3PublicKey,
  };
}
