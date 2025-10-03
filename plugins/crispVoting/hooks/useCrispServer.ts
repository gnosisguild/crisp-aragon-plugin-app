import { CIPHERNODE_REGISTRY_ADDRESS, ENCLAVE_ADDRESS, PUB_CRISP_SERVER_URL } from "@/constants";
import { useState } from "react";
import { EnclaveSDK, FheProtocol } from "@enclave-e3/sdk";
import { hexToBytes, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import crispCircuit from "../artifacts/crispCircuit.json";

/**
 * State of the Crisp server
 */
interface CrispServerState {
  isLoading: boolean;
  error: string;
  postVote: (voteOption: bigint, e3Id: bigint) => Promise<void>;
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

      const publicKey = await sdk.getE3PublicKey(e3Id);
      const data = await sdk.encryptNumberAndGenProof(voteOption, hexToBytes(publicKey), crispCircuit as any);

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
        body: JSON.stringify(voteBody),
      });

      if (response.status !== 200) {
        setError("Failed to post vote");
      }
    } catch (error) {
      console.error("Error posting vote", error);
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
