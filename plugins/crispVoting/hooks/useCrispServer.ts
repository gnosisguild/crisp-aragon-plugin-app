import { CIPHERNODE_REGISTRY_ADDRESS, ENCLAVE_ADDRESS, PUB_CRISP_SERVER_URL } from "@/constants";
import { useState } from "react";
import { EnclaveSDK, FheProtocol } from "@enclave-e3/sdk";
import { useAccount, usePublicClient } from "wagmi";
import crispCircuit from "../artifacts/crispCircuit.json";
import { IRoundDetailsResponse } from "../utils/types";

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
  public_inputs: string[];
  address: string;
  proof_sem: number[];
}

/**
 * Hook to interact with Crisp server
 * @returns an error, a loading state and a function to cast votes
 */
export function useCrispServer(): CrispServerState {
  const publicClient = usePublicClient();
  const { address } = useAccount();

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

    return Uint8Array.from(data.committee_public_key);
  };

  const postVote = async (voteOption: bigint, e3Id: bigint) => {
    setIsLoading(true);
    try {
      if (!address) {
        setError("No address found");
        return;
      }

      const sdk = new EnclaveSDK({
        publicClient: publicClient as any,
        protocol: FheProtocol.BFV,
        contracts: {
          enclave: ENCLAVE_ADDRESS,
          ciphernodeRegistry: CIPHERNODE_REGISTRY_ADDRESS,
        },
      });

      const publicKey = await getE3PublicKey(Number(e3Id));
      const data = await sdk.encryptNumberAndGenProof(voteOption, Uint8Array.from(publicKey), crispCircuit as any);

      // For now we are mocking
      const voteBody: BroadcastVoteRequest = {
        proof: Array.from(data.proof.proof),
        enc_vote_bytes: Array.from(data.encryptedVote),
        public_inputs: Array.from(data.proof.publicInputs),
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
