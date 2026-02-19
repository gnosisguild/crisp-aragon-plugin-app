"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Heading } from "@aragon/ods";
import { useProposalExecute } from "../../hooks/useProposalExecute";

interface IResult {
  option: string;
  value: string;
}

interface VoteResultCardProps {
  results?: IResult[];
  proposalId: bigint;
  isSignalling?: boolean;
  isTallied?: boolean;
}

const OPTION_COLORS = [
  "#22c55e", // green  - yes / option 1
  "#ef4444", // red    - no / option 2
  "#a78bfa", // violet - abstain / option 3
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#f472b6", // pink
  "#84cc16", // lime
];

function getColor(index: number): string {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

export const VoteResultCard = ({ results, proposalId, isSignalling, isTallied = true }: VoteResultCardProps) => {
  const { executeProposal, canExecute, isConfirming: isConfirmingExecution } = useProposalExecute(proposalId);
  const [isVisible, setIsVisible] = useState(false);

  const parsedResults = useMemo(() => {
    if (!results) return [];
    return results.map((r, idx) => ({
      option: r.option,
      value: Number(r.value),
      index: idx,
    }));
  }, [results]);

  const total = useMemo(() => {
    return parsedResults.reduce((sum, r) => sum + r.value, 0);
  }, [parsedResults]);

  const resultsWithPercentage = useMemo(() => {
    return parsedResults
      .map((r) => ({
        ...r,
        percentage: total > 0 ? (r.value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [parsedResults, total]);

  const winner = useMemo(() => {
    if (total === 0) return null;
    const sorted = [...parsedResults].sort((a, b) => b.value - a.value);
    if (sorted.length < 2) return sorted[0] ?? null;
    // tie check
    if (sorted[0].value === sorted[1].value) return null;
    return sorted[0];
  }, [parsedResults, total]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!results || results.length === 0) {
    return null;
  }

  if (!isTallied) {
    return (
      <Card className="flex flex-col gap-y-5 p-6 shadow-neutral">
        <Heading size="h3">Results</Heading>
        <div className="flex flex-col items-center gap-3 py-4">
          <svg className="animate-spin text-primary-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="text-center text-sm text-neutral-500">
            Results are being tallied by the Enclave network. This may take a few minutes.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-y-5 p-6 shadow-neutral">
      <div className={`transition-all duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        {/* Header */}
        <Heading size="h3">Results</Heading>

        <div className="mt-4 flex flex-col gap-3">
          {/* Stacked bar */}
          {total > 0 ? (
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
              {resultsWithPercentage.map((result) => (
                <div
                  key={result.index}
                  className="transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.max(result.percentage, 0.5)}%`,
                    backgroundColor: getColor(result.index),
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-3 w-full rounded-full bg-neutral-100" />
          )}

          {/* Option rows */}
          <div className="flex flex-col gap-1">
            {resultsWithPercentage.map((result) => {
              const isWinner = winner?.index === result.index;
              return (
                <div
                  key={result.index}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: isWinner ? `${getColor(result.index)}08` : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getColor(result.index) }}
                    />
                    <span
                      className="truncate text-sm"
                      style={{
                        fontWeight: isWinner ? 600 : 400,
                        color: isWinner ? getColor(result.index) : "#6b7280",
                      }}
                    >
                      {result.option}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <span className="text-xs tabular-nums" style={{ color: "#9ca3af" }}>
                      {result.value.toLocaleString()}
                    </span>
                    <span
                      className="min-w-[3rem] text-sm font-semibold tabular-nums"
                      style={{
                        color: isWinner ? getColor(result.index) : "#6b7280",
                      }}
                    >
                      {result.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-1 border-t border-neutral-100 pt-3 text-center">
            {total === 0 ? (
              <span className="font-medium text-xs text-neutral-400">No votes were cast</span>
            ) : winner ? (
              <span className="font-medium text-xs" style={{ color: getColor(winner.index) }}>
                {winner.option} won with{" "}
                {resultsWithPercentage.find((r) => r.index === winner.index)?.percentage.toFixed(1)}%
              </span>
            ) : (
              <span className="font-medium text-xs text-neutral-400">Tied — no clear winner</span>
            )}
          </div>
        </div>

        {/* Execute Button */}
        {canExecute && !isSignalling && (
          <div className="mt-4">
            <Button
              className="w-full"
              size="lg"
              variant="success"
              disabled={isConfirmingExecution}
              onClick={executeProposal}
            >
              Execute proposal
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
