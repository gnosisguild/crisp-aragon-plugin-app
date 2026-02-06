import { useState, useEffect } from "react";
import { ProposalStatus } from "@aragon/ods";
import { useToken } from "./useToken";

import type { Proposal } from "../utils/types";

/** Sum all counts in the tally array. */
function getTotalVotes(tally: bigint[]): bigint {
  let sum = 0n;

  for (let i = 0; i < tally.length; i += 1) {
    sum += tally[i] ?? 0n;
  }

  return sum;
}

/**
 * Mirrors the contract's _canExecute logic:
 * - 2-3 options: quorum + counts[0] > counts[1]
 * - 4+ options: quorum only
 */
function hasPassed(tally: bigint[], numOptions: number): boolean {
  const totalVotes = getTotalVotes(tally);
  if (totalVotes === 0n) return false;

  if (numOptions <= 3) {
    return (tally[0] ?? BigInt(0)) > (tally[1] ?? BigInt(0));
  }
  return true;
}

/**
 * For 2-3 options, the proposal is rejected when no >= yes.
 * For 4+ options, there's no concept of "rejected" — it either
 * meets quorum or has low turnout.
 */
function isRejected(tally: bigint[], numOptions: number): boolean {
  if (numOptions <= 3) {
    return (tally[1] ?? BigInt(0)) >= (tally[0] ?? BigInt(0));
  }
  return false;
}

export const useProposalVariantStatus = (proposal: Proposal) => {
  const [status, setStatus] = useState({ variant: "", label: "" });
  const { tokenSupply: totalSupply } = useToken();

  useEffect(() => {
    if (!proposal || !proposal?.parameters || !totalSupply) return;

    const tally: bigint[] = Array.isArray(proposal.tally) ? proposal.tally : [];
    const numOptions = proposal.numOptions ?? tally.length;
    const totalVotes = getTotalVotes(tally);
    const minVotingPower = (totalSupply * BigInt(proposal.parameters.minVotingPower)) / BigInt(100);

    if (proposal?.active) {
      setStatus({ variant: "info", label: "Active" });
    } else if (proposal?.executed) {
      setStatus({ variant: "primary", label: "Executed" });
    } else if (totalVotes === 0n) {
      setStatus({ variant: "critical", label: "Low turnout" });
    } else if (totalVotes < minVotingPower) {
      setStatus({ variant: "critical", label: "Low turnout" });
    } else if (hasPassed(tally, numOptions) && proposal.actions.length > 0) {
      setStatus({ variant: "success", label: "Executable" });
    } else if (hasPassed(tally, numOptions) && proposal.actions.length === 0) {
      setStatus({ variant: "success", label: "Passed" });
    } else if (isRejected(tally, numOptions)) {
      setStatus({ variant: "critical", label: "Rejected" });
    } else {
      setStatus({ variant: "critical", label: "Low turnout" });
    }
  }, [
    proposal,
    proposal?.tally,
    proposal?.active,
    proposal?.executed,
    proposal?.parameters?.minVotingPower,
    totalSupply,
  ]);

  return status;
};

export const useProposalStatus = (proposal: Proposal) => {
  const [status, setStatus] = useState<ProposalStatus>();
  const { tokenSupply: totalSupply } = useToken();

  useEffect(() => {
    if (!proposal || !proposal?.parameters || !totalSupply) return;

    const tally = proposal.tally ?? [];
    const numOptions = proposal.numOptions ?? tally.length;
    const totalVotes = getTotalVotes(tally);
    const minVotingPower = (totalSupply * BigInt(proposal.parameters.minVotingPower)) / BigInt(100);

    if (proposal?.active) {
      setStatus(ProposalStatus.ACTIVE);
    } else if (proposal?.executed) {
      setStatus(ProposalStatus.EXECUTED);
    } else if (totalVotes === 0n) {
      setStatus(ProposalStatus.FAILED);
    } else if (totalVotes < minVotingPower) {
      setStatus(ProposalStatus.FAILED);
    } else if (hasPassed(tally, numOptions) && proposal.actions.length > 0) {
      setStatus(ProposalStatus.EXECUTABLE);
    } else if (hasPassed(tally, numOptions) && proposal.actions.length === 0) {
      setStatus(ProposalStatus.ACCEPTED);
    } else if (isRejected(tally, numOptions)) {
      setStatus(ProposalStatus.REJECTED);
    } else {
      setStatus(ProposalStatus.PENDING);
    }
  }, [
    proposal,
    proposal?.tally,
    proposal?.active,
    proposal?.executed,
    proposal?.parameters?.minVotingPower,
    totalSupply,
  ]);

  return status;
};
