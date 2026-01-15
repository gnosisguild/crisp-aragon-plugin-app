import { Button, Card, Heading } from "@aragon/ods";
import { unixTimestampToDate } from "../../utils/formatProposalDate";
import { VoteOption, type VotingStep } from "../../utils/types";
import { PleaseWaitSpinner } from "@/components/please-wait";
import { useState } from "react";
import VotingStepIndicator from "./voteProgress";

export interface VoteCardProps {
  error?: string;
  voteStartDate: number;
  voteEndDate: number;
  disabled: boolean;
  isLoading: boolean;
  proposalId: bigint;
  votingStep: VotingStep;
  lastActiveStep: VotingStep | null;
  stepMessage: string;
  isCommitteeReady: boolean;
  onClickVote: (voteOption: VoteOption, isMasking?: boolean) => void;
}

export const VoteCard = ({
  error,
  voteStartDate,
  disabled,
  isLoading,
  onClickVote,
  votingStep,
  lastActiveStep,
  stepMessage,
  isCommitteeReady,
}: VoteCardProps) => {
  const [voteOption, setVoteOption] = useState<VoteOption | null>(null);

  return (
    <Card className="flex flex-col gap-y-4 p-6 shadow-neutral">
      <Heading size="h3">CRISP Proposal</Heading>
      <div className="flex flex-col justify-between">
        <p className="text-sm text-critical-500">{error}</p>
      </div>
      <div className="flex flex-col justify-between gap-y-2">
        <p>
          Submit your vote to the CRISP server. Remember that you can override your vote at any time during the voting
          window. Results will be tallied by the Enclave network after the voting period ends.
        </p>
        <br />
        <p>
          In order to reduce the risk of collusion and coercion of this vote, you may choose to mask votes of other DAO
          members. Press Mask to do that.
        </p>
        {isLoading && <VotingStepIndicator step={votingStep} lastActiveStep={lastActiveStep} message={stepMessage} />}
        {voteStartDate &&
          voteStartDate > Math.round(Date.now() / 1000) &&
          `The vote will start on ${unixTimestampToDate(voteStartDate)}`}
        {voteStartDate && voteStartDate < Math.round(Date.now() / 1000) && !isCommitteeReady && (
          <p className="text-md text-warning-500">
            The ciphernode committee is being formed. Voting will be available once the committee is ready.
          </p>
        )}
        <div className="mt-4 flex flex-row gap-x-1">
          <Button
            onClick={() => {
              setVoteOption(VoteOption.Yes);
              onClickVote(VoteOption.Yes);
            }}
            disabled={disabled ? disabled : isLoading}
            size="md"
            variant={disabled ? "tertiary" : "success"}
          >
            {isLoading && voteOption === VoteOption.Yes ? <PleaseWaitSpinner fullMessage="Yes" /> : "Yes"}
          </Button>
          <Button
            onClick={() => {
              setVoteOption(VoteOption.No);
              onClickVote(VoteOption.No);
            }}
            disabled={disabled ? disabled : isLoading}
            size="md"
            variant={disabled ? "tertiary" : "critical"}
          >
            {isLoading && voteOption === VoteOption.No ? <PleaseWaitSpinner fullMessage="No" /> : "No"}
          </Button>
          <Button
            size="md"
            disabled={disabled ? disabled : isLoading}
            variant={disabled ? "tertiary" : "secondary"}
            onClick={() => {
              setVoteOption(VoteOption.Mask);
              onClickVote(VoteOption.Mask);
            }}
          >
            {isLoading && voteOption === VoteOption.Mask ? <PleaseWaitSpinner fullMessage="Mask" /> : "Mask"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
