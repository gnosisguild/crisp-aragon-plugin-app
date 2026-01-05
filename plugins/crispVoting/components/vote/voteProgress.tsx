// SPDX-License-Identifier: LGPL-3.0-only
//
// This file is provided WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.

import React from "react";
import {
  CheckIcon,
  CircleNotchIcon,
  WarningIcon,
  PencilSimpleIcon,
  LockIcon,
  BroadcastIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import type { VotingStep } from "../../utils/types";

type VotingStepIndicatorProps = {
  step: VotingStep;
  message: string;
  lastActiveStep?: VotingStep | null;
};

const steps: { key: VotingStep; label: string; icon: React.ElementType }[] = [
  { key: "signing", label: "Sign", icon: PencilSimpleIcon },
  { key: "encrypting", label: "Encrypt", icon: LockIcon },
  { key: "generating_proof", label: "Proof", icon: ShieldCheckIcon },
  { key: "broadcasting", label: "Broadcast", icon: BroadcastIcon },
];

const VotingStepIndicator: React.FC<VotingStepIndicatorProps> = ({ step, message, lastActiveStep }) => {
  const getStepStatus = (stepKey: VotingStep) => {
    const stepOrder = steps.map((s) => s.key);
    const currentIndex = step === "error" ? stepOrder.indexOf(lastActiveStep ?? "signing") : stepOrder.indexOf(step);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (step === "complete") return "complete";
    if (step === "error") return stepIndex <= currentIndex ? "error" : "pending";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case "complete":
        return {
          circle: "bg-lime-500 border-lime-500 text-white",
          text: "text-lime-600",
          line: "bg-lime-500",
        };
      case "active":
        return {
          circle: "bg-white border-lime-500 text-lime-500 animate-pulse",
          text: "text-lime-600 font-bold",
          line: "bg-slate-200",
        };
      case "error":
        return {
          circle: "bg-red-500 border-red-500 text-white",
          text: "text-red-600",
          line: "bg-red-300",
        };
      default:
        return {
          circle: "bg-white border-slate-300 text-slate-400",
          text: "text-slate-400",
          line: "bg-slate-200",
        };
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center space-y-4 py-4">
      {/* Step indicators */}
      <div className="flex w-full items-center justify-between px-4">
        {steps.map((s, index) => {
          const status = getStepStatus(s.key);
          const styles = getStepStyles(status);
          const Icon = s.icon;

          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${styles.circle}`}>
                  {status === "complete" ? (
                    <CheckIcon size={20} weight="bold" />
                  ) : status === "active" ? (
                    <CircleNotchIcon size={20} weight="bold" className="animate-spin" />
                  ) : status === "error" ? (
                    <WarningIcon size={20} weight="bold" />
                  ) : (
                    <Icon size={20} weight="bold" />
                  )}
                </div>
                <span className={`mt-1 text-xs ${styles.text}`}>{s.label}</span>
              </div>
              {index < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${styles.line}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current step message */}
      <div className="text-center">
        <p className="font-bold text-slate-600/70 text-base uppercase">{message}</p>
      </div>
    </div>
  );
};

export default VotingStepIndicator;
