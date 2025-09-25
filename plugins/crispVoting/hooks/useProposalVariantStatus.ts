import { useState, useEffect } from "react";
import { Proposal } from "../utils/types";
import { ProposalStatus } from "@aragon/ods";
import { useToken } from "./useToken";

export const useProposalVariantStatus = (proposal: Proposal) => {
  const [status, setStatus] = useState({ variant: "", label: "" });
  const { tokenSupply: totalSupply } = useToken();

  useEffect(() => {
    if (!proposal || !proposal?.parameters || !totalSupply) return;

    const minVotingPower = (totalSupply * BigInt(proposal.parameters.minVotingPower)) / BigInt(1_000_000);
    const totalVotes = proposal.tally.yes + proposal.tally.no;

    if (proposal?.active) {
      setStatus({ variant: "info", label: "Active" });
    } else if (proposal?.executed) {
      setStatus({ variant: "primary", label: "Executed" });
    } else if (totalVotes < minVotingPower) {
      setStatus({ variant: "critical", label: "Low turnout" });
    } else if (proposal.tally.yes > proposal.tally.no) {
      setStatus({ variant: "success", label: "Executable" });
    } else if (proposal.tally.no > proposal.tally.yes) {
      setStatus({ variant: "critical", label: "Defeated" });
    }
  }, [proposal?.tally, proposal?.active, proposal?.executed, proposal?.parameters?.minVotingPower, totalSupply]);

  return status;
};

export const useProposalStatus = (proposal: Proposal) => {
  const [status, setStatus] = useState<ProposalStatus>();
  const { tokenSupply: totalSupply } = useToken();

  useEffect(() => {
    if (!proposal || !proposal?.parameters || !totalSupply) return;

    const minVotingPower = (totalSupply * BigInt(proposal.parameters.minVotingPower)) / BigInt(1_000_000);

    const totalVotes = proposal.tally.yes + proposal.tally.no;

    if (proposal?.active) {
      setStatus(ProposalStatus.ACTIVE);
    } else if (proposal?.executed) {
      setStatus(ProposalStatus.EXECUTED);
    } else if (totalVotes < minVotingPower) {
      setStatus(ProposalStatus.FAILED);
    } else if (proposal.tally.yes > proposal.tally.no) {
      setStatus(ProposalStatus.EXECUTABLE);
    } else if (proposal.tally.no > proposal.tally.yes) {
      setStatus(ProposalStatus.REJECTED);
    } else {
      setStatus(ProposalStatus.PENDING);
    }
  }, [proposal?.tally, proposal?.active, proposal?.executed, proposal?.parameters?.minVotingPower, totalSupply]);

  return status;
};
