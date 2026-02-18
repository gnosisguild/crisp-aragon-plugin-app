import { Button, Card, Heading } from "@aragon/ods";
import { unixTimestampToDate } from "../../utils/formatProposalDate";
import type { VotingStep } from "../../utils/types";
import { PleaseWaitSpinner } from "@/components/please-wait";
import { useState } from "react";
import VotingStepIndicator from "./voteProgress";

export interface VoteCardProps {
  error?: string;
  options: string[];
  voteStartDate: number;
  voteEndDate: number;
  disabled: boolean;
  isLoading: boolean;
  proposalId: bigint;
  votingStep: VotingStep;
  lastActiveStep: VotingStep | null;
  stepMessage: string;
  isCommitteeReady: boolean;
  txHash: string | null;
  onClickVote: (voteOption: number) => void;
  onClickMask: () => void;
}

const OPTION_COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#a78bfa", // violet
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#f472b6", // pink
  "#84cc16", // lime
];

function getColor(index: number): string {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

export const VoteCard = ({
  error,
  options,
  voteStartDate,
  disabled,
  isLoading,
  onClickVote,
  onClickMask,
  votingStep,
  lastActiveStep,
  stepMessage,
  isCommitteeReady,
  txHash,
}: VoteCardProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isMasking, setIsMasking] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  const handleVote = () => {
    if (selectedOption === null) return;
    setIsMasking(false);
    setHasVoted(true);
    onClickVote(selectedOption);
  };

  const handleMask = () => {
    setSelectedOption(null);
    setIsMasking(true);
    setHasVoted(true);
    onClickMask();
  };

  const isDisabled = disabled || isLoading;

  return (
    <Card className="flex flex-col gap-y-5 p-6 shadow-neutral">
      <Heading size="h3">Cast your vote</Heading>

      {error && <p className="text-sm text-critical-500">{error}</p>}

      <p className="text-sm text-neutral-500">
        Submit your vote to the CRISP server. You can override your vote at any time during the voting window. Results
        will be tallied by the Enclave network after the voting period ends.
      </p>
      <p className="text-sm text-neutral-500">
        In order to reduce the risk of collusion and coercion of this vote, you may choose to mask votes of other DAO
        members. Press <b>Mask</b> to do that.
      </p>

      {(isLoading || txHash) && (
        <VotingStepIndicator
          step={txHash && !isLoading ? "complete" : votingStep}
          lastActiveStep={lastActiveStep}
          message={txHash && !isLoading ? "Vote submitted successfully!" : stepMessage}
          txHash={txHash}
        />
      )}

      {voteStartDate > Math.round(Date.now() / 1000) && (
        <p className="text-sm text-neutral-400">The vote will start on {unixTimestampToDate(voteStartDate)}</p>
      )}

      {voteStartDate < Math.round(Date.now() / 1000) && !isCommitteeReady && (
        <div className="bg-warning-50 rounded-lg border border-warning-200 px-4 py-3">
          <p className="text-sm text-warning-600">
            The ciphernode committee is being formed. Voting will be available once the committee is ready.
          </p>
        </div>
      )}

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((option, index) => {
          const color = getColor(index);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              type="button"
              disabled={isDisabled}
              onClick={() => setSelectedOption(index)}
              className="group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150"
              style={{
                borderColor: isSelected ? color : "#e5e7eb",
                backgroundColor: isSelected ? `${color}08` : "transparent",
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
            >
              {/* Radio indicator */}
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150"
                style={{
                  borderColor: isSelected ? color : "#d1d5db",
                }}
              >
                {isSelected && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
              </div>

              {/* Color dot + label */}
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span
                  className="text-sm transition-all duration-150"
                  style={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? color : "#6b7280",
                  }}
                >
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
        <Button
          className="w-full"
          size="lg"
          variant="primary"
          disabled={isDisabled || selectedOption === null}
          onClick={handleVote}
        >
          {isLoading && hasVoted && !isMasking ? (
            <PleaseWaitSpinner fullMessage="Submitting..." />
          ) : selectedOption !== null ? (
            `Vote ${options[selectedOption]}`
          ) : (
            "Select an option"
          )}
        </Button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={handleMask}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all duration-150"
          style={{
            color: isDisabled ? "#d1d5db" : "#9ca3af",
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) e.currentTarget.style.color = "#6b7280";
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) e.currentTarget.style.color = "#9ca3af";
          }}
        >
          {isLoading && isMasking ? (
            <PleaseWaitSpinner fullMessage="Masking..." />
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span>Mask vote instead</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
};
