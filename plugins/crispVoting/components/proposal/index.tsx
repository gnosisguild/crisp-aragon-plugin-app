import Link from "next/link";
import { Card, ProposalStatus, ProposalDataListItem } from "@aragon/ods";
import { PleaseWaitSpinner } from "@/components/please-wait";
import { useProposal } from "../../hooks/useProposal";
import { useProposalStatus } from "../../hooks/useProposalVariantStatus";
import { useToken } from "../../hooks/useToken";
import { formatEther } from "viem";
import { PUB_TOKEN_SYMBOL } from "@/constants";

const DEFAULT_PROPOSAL_METADATA_TITLE = "(No proposal title)";
const DEFAULT_PROPOSAL_METADATA_SUMMARY = "(The metadata of the proposal is not available)";

type ProposalInputs = {
  proposalId: bigint;
};

export default function ProposalCard(props: ProposalInputs) {
  const { proposal, status: proposalFetchStatus } = useProposal(props.proposalId);

  const { symbol: tokenSymbol } = useToken();
  const proposalStatus = useProposalStatus(proposal!);
  const showLoading = getShowProposalLoading(proposal, proposalFetchStatus);

  const hasVoted = false;

  if (!proposal && showLoading) {
    return (
      <section className="mb-4 w-full">
        <Card className="p-4">
          <span className="xs:px-10 px-4 py-5 md:px-6 lg:px-7">
            <PleaseWaitSpinner fullMessage="Loading proposal..." />
          </span>
        </Card>
      </section>
    );
  } else if (!proposal?.title && !proposal?.summary) {
    return (
      <Link href={`#/proposals/${props.proposalId}`} className="mb-4 w-full">
        <Card className="p-4">
          <span className="xs:px-10 px-4 py-5 md:px-6 lg:px-7">
            <PleaseWaitSpinner fullMessage="Loading metadata..." />
          </span>
        </Card>
      </Link>
    );
  } else if (proposalFetchStatus.metadataReady && !proposal?.title) {
    return (
      <Link href={`#/proposals/${props.proposalId}`} className="mb-4 w-full">
        <Card className="p-4">
          <div className="xl:4/5 overflow-hidden text-ellipsis text-nowrap pr-4 md:w-7/12 lg:w-3/4">
            <h4 className="mb-1 line-clamp-1 text-lg text-neutral-300">
              {Number(props.proposalId) + 1} - {DEFAULT_PROPOSAL_METADATA_TITLE}
            </h4>
            <p className="line-clamp-3 text-base text-neutral-300">{DEFAULT_PROPOSAL_METADATA_SUMMARY}</p>
          </div>
        </Card>
      </Link>
    );
  }

  const tally = proposal?.tally ?? [];
  const options = proposal?.options ?? ["Yes", "No"];
  const totalVotes = Array.from(tally).reduce((sum, count) => sum + (count ?? BigInt(0)), BigInt(0));

  const result = getWinningResult(tally, options, totalVotes, tokenSymbol ?? PUB_TOKEN_SYMBOL);

  return (
    <ProposalDataListItem.Structure
      title={proposal.title}
      summary={proposal.summary}
      href={`#/proposals/${props.proposalId}`}
      voted={hasVoted}
      date={
        [ProposalStatus.ACTIVE, ProposalStatus.ACCEPTED].includes(proposalStatus!) && proposal.parameters.endDate
          ? Number(proposal.parameters.endDate) * 1000
          : undefined
      }
      result={proposalStatus === ProposalStatus.ACTIVE ? undefined : result}
      publisher={{ address: proposal.creator }}
      status={proposalStatus!}
      type={"majorityVoting"}
    />
  );
}

function getWinningResult(
  tally: bigint[],
  options: string[],
  totalVotes: bigint,
  tokenSymbol: string
): { option: string; voteAmount: string; votePercentage: number } {
  if (tally.length === 0 || totalVotes === BigInt(0)) {
    return { option: "", voteAmount: "", votePercentage: 0 };
  }

  let winnerIndex = 0;
  let maxVotes = BigInt(0);

  for (let i = 0; i < tally.length; i++) {
    const count = tally[i] ?? BigInt(0);
    if (count > maxVotes) {
      maxVotes = count;
      winnerIndex = i;
    }
  }

  return {
    option: options[winnerIndex] ?? `Option ${winnerIndex + 1}`,
    voteAmount: `${formatEther(maxVotes)} ${tokenSymbol}`,
    votePercentage: Number((maxVotes * BigInt(10_000)) / totalVotes) / 100,
  };
}

function getShowProposalLoading(
  proposal: ReturnType<typeof useProposal>["proposal"],
  status: ReturnType<typeof useProposal>["status"]
) {
  if (!proposal || status.proposalLoading) return true;
  else if (status.metadataLoading && !status.metadataError) return true;
  else if (!proposal?.title && !status.metadataError) return true;

  return false;
}
