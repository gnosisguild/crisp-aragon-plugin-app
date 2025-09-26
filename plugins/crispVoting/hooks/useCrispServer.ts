import { PUB_CRISP_SERVER_URL } from "@/constants";
import { useState } from "react";
import { EnclaveSDK, FheProtocol } from "@enclave-e3/sdk";
import { zeroAddress } from "viem";
import { usePublicClient } from "wagmi";
import crispCircuit from "../artifacts/crispCircuit.json";

interface CrispServerState {
  isLoading: boolean;
  error: string;
  postVote: (voteOption: bigint) => Promise<void>;
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const postVote = async (voteOption: bigint) => {
    setIsLoading(true);

    try {
      const sdk = new EnclaveSDK({
        publicClient: publicClient as any,
        protocol: FheProtocol.BFV,
        contracts: {
          enclave: zeroAddress,
          ciphernodeRegistry: zeroAddress,
        },
      });
      const data = await sdk.encryptNumberAndGenProof(voteOption, new Uint8Array(1), crispCircuit as any);

      const voteBody = {
        proof: Array.from(data.proof.proof),
        enc_vote_bytes: Array.from(data.encryptedVote),
      };

      const response = await fetch(`${PUB_CRISP_SERVER_URL}/voting/broadcast`, {
        method: "POST",
        body: JSON.stringify(voteBody),
      });

      if (response.status !== 200) {
        setError("Failed to post vote");
      }
    } catch (error: Error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    postVote,
    error,
    isLoading,
  };
}
