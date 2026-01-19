"use client";

import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { Button, Card } from "@aragon/ods";
import { useProposalExecute } from "../../hooks/useProposalExecute";

type WinnerType = "yes" | "no" | "tie";

interface IResult {
  option: string;
  value: string;
}

interface VoteResultCardProps {
  results?: IResult[];
  proposalId: bigint;
  isSignalling?: boolean;
}

export const VoteResultCard = ({ results, proposalId, isSignalling }: VoteResultCardProps) => {
  const { executeProposal, canExecute, isConfirming: isConfirmingExecution } = useProposalExecute(proposalId);

  const [isVisible, setIsVisible] = useState(false);

  const yes = results ? Number(results[0].value) : 0;
  const no = results ? Number(results[1].value) : 0;

  const total = yes + no;

  const yesPercentage = total > 0 ? (yes / total) * 100 : 0;
  const noPercentage = total > 0 ? (no / total) * 100 : 0;

  const winner = useMemo<WinnerType>(() => {
    if (yes > no) return "yes";
    if (no > yes) return "no";
    return "tie";
  }, [yes, no]);

  const config = useMemo(() => {
    switch (winner) {
      case "yes":
        return {
          percentage: yesPercentage,
        };
      case "no":
        return {
          percentage: noPercentage,
        };
      case "tie":
        return {
          percentage: 50,
        };
    }
  }, [noPercentage, winner, yesPercentage]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const votingTextClasses = {
    yes: "text-voting-yes",
    no: "text-voting-no",
    abstain: "text-voting-abstain",
    tie: "text-voting-slate",
  };

  const votingBgClasses = {
    yes: "bg-voting-yes/10 border-voting-yes",
    no: "bg-voting-no/10 border-voting-no",
    abstain: "bg-voting-abstain/10 border-voting-abstain",
    tie: "bg-voting-slate/10 border-voting-slate",
  };

  const textClass = (status: WinnerType) => {
    if (status === winner) return votingTextClasses[winner];
    return votingTextClasses.abstain;
  };

  const bgClass = (status: WinnerType) => {
    if (status === winner) return votingBgClasses[winner];
    return votingBgClasses.abstain;
  };

  if (!config) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-y-4 p-6 shadow-neutral">
      <div
        className={`transition-all delay-100 duration-1000 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <div className="shadow-2xl bg-white/80 border-0 text-center">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <div className="text-center">
                <div
                  className={classNames(`text-lg`, textClass(winner))}
                  style={{
                    fontWeight: 700,
                    color: winner === "tie" ? "#EAB308" : winner === "yes" ? "#10B981" : "#EF4444",
                  }}
                >
                  {config?.percentage.toFixed(0)}%{" "}
                  {winner === "yes" ? "Approval" : winner === "no" ? "Opposition" : "Split"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-center lg:grid-cols-2">
              <div className={`p-4 text-center ${bgClass("yes")}`}>
                <div
                  className={`font-bold text-2xl ${textClass("yes")}`}
                  style={{
                    fontWeight: winner === "yes" ? 700 : winner === "no" ? 700 : 400,
                  }}
                >
                  {yesPercentage}%
                </div>
                <div className={`text-sm ${textClass("yes")}`}>Yes</div>
              </div>

              <div className={`p-4 text-center ${bgClass("no")}`}>
                <div
                  className={`font-bold text-2xl ${textClass("no")}`}
                  style={{
                    fontWeight: winner === "no" ? 700 : winner === "yes" ? 700 : 400,
                  }}
                >
                  {noPercentage}%
                </div>
                <div className={`text-sm ${textClass("no")}`}>No</div>
              </div>
            </div>
          </div>
        </div>
        <div className={`mt-4 text-center`}>
          {canExecute && !isSignalling && (
            <Button size="lg" variant={"success"} disabled={isConfirmingExecution} onClick={executeProposal}>
              Execute proposal
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
