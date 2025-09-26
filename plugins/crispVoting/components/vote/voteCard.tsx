import { Button, Card, Heading } from "@aragon/ods";
import { unixTimestampToDate } from "../../utils/formatProposalDate";
import { VoteOption } from "../../utils/types";
import { PleaseWaitSpinner } from "@/components/please-wait";

export interface VoteCardProps {
  error?: string;
  voteStartDate: number;
  voteOption: VoteOption;
  disabled: boolean;
  isLoading: boolean;
  onClickVote: (voteOption: VoteOption) => void;
}

export const VoteCard = ({ error, voteStartDate, voteOption, disabled, isLoading, onClickVote }: VoteCardProps) => {
  return (
    <Card className="flex flex-col gap-y-4 p-6 shadow-neutral">
      <Heading size="h3">CRISP Proposal</Heading>
      <div className="flex flex-col justify-between">
        <p className="text-sm text-critical-500">{error}</p>
      </div>
      <div className="flex flex-col justify-between gap-y-2">
        <p>
          Submit your vote anonymously <b>using any wallet</b>. Results will be tallied by the Enclave network after the
          voting period ends.
        </p>
        {voteStartDate &&
          voteStartDate > Math.round(Date.now() / 1000) &&
          `The vote will start on ${unixTimestampToDate(voteStartDate)}`}
        <div className="flex flex-row gap-x-1">
          <Button
            onClick={() => onClickVote(VoteOption.Yes)}
            disabled={disabled ? disabled : isLoading}
            size="sm"
            variant={disabled ? "tertiary" : "success"}
          >
            {isLoading && voteOption === VoteOption.Yes ? <PleaseWaitSpinner fullMessage="Yes" /> : "Yes"}
          </Button>
          <Button
            onClick={() => onClickVote(VoteOption.No)}
            disabled={disabled ? disabled : isLoading}
            size="sm"
            variant={disabled ? "tertiary" : "critical"}
          >
            {isLoading && voteOption === VoteOption.No ? <PleaseWaitSpinner fullMessage="No" /> : "No"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
