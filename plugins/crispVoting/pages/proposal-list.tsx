import { useAccount, useBlockNumber } from "wagmi";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import ProposalCard from "../components/proposal";
import { Button, DataList, IconType, ProposalDataListItemSkeleton, type DataListState } from "@aragon/ods";
import { useCanCreateProposal } from "../hooks/useCanCreateProposal";
import Link from "next/link";
import { Else, If, Then } from "@/components/if";
import { PUB_CRISP_VOTING_PLUGIN_ADDRESS, PUB_DEPLOYMENT_BLOCK } from "@/constants";
import { MainSection } from "@/components/layout/main-section";
import { MissingContentView } from "@/components/MissingContentView";
import { ProposalCreatedEvent } from "../hooks/useProposal";
import type { RawAction } from "@/utils/types";
import type { Hex } from "viem";
import { publicClient } from "../utils/client";

const DEFAULT_PAGE_SIZE = 6;

interface ProposalCreatedLog {
  proposalId: bigint;
  creator: string;
  startDate: bigint;
  endDate: bigint;
  metadata: Hex;
  actions: RawAction[];
  allowFailureMap: bigint;
}

export default function Proposals() {
  const { isConnected } = useAccount();
  const canCreate = useCanCreateProposal();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [proposalIds, setProposalIds] = useState<bigint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!publicClient || !blockNumber || !PUB_DEPLOYMENT_BLOCK || !ProposalCreatedEvent) {
      return;
    }

    try {
      const logs = await publicClient
        .getLogs({
          address: PUB_CRISP_VOTING_PLUGIN_ADDRESS,
          event: ProposalCreatedEvent,
          fromBlock: BigInt(PUB_DEPLOYMENT_BLOCK),
          toBlock: blockNumber,
        })
        .catch((err) => {
          console.error("Could not fetch the proposals", err);
        });

      if (!logs || !Array.isArray(logs) || !logs.length) {
        setProposalIds([]);
        return;
      }

      const ids = logs
        .map((log) => {
          const args = log.args as unknown as ProposalCreatedLog;
          return args?.proposalId;
        })
        .filter((id): id is bigint => id !== undefined)
        .reverse();

      setProposalIds(ids);
    } catch (err) {
      console.log("error", err);
      setError(`Could not fetch proposals`);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, blockNumber]);

  useEffect(() => {
    fetchProposals();
  }, [blockNumber, fetchProposals, publicClient]);

  const proposalCount = proposalIds.length;
  const entityLabel = proposalCount === 1 ? "Proposal" : "Proposals";

  let dataListState: DataListState = "idle";
  if (isLoading && !proposalCount) {
    dataListState = "initialLoading";
  } else if (error) {
    dataListState = "error";
  } else if (isLoading) {
    dataListState = "loading";
  }

  return (
    <MainSection narrow>
      <SectionView>
        <h1 className="line-clamp-1 flex flex-1 shrink-0 text-2xl font-normal leading-tight text-neutral-800 md:text-3xl">
          Proposals
        </h1>
        <div className="justify-self-end">
          <If true={isConnected && canCreate}>
            <Link href="#/new">
              <Button iconLeft={IconType.PLUS} size="md" variant="primary">
                Submit Proposal
              </Button>
            </Link>
          </If>
        </div>
      </SectionView>

      <If not={proposalCount}>
        <Then>
          <MissingContentView>
            No proposals have been created yet. Here you will see the available proposals.{" "}
            <If true={canCreate}>Create your first proposal.</If>
          </MissingContentView>
        </Then>
        <Else>
          <DataList.Root
            entityLabel={entityLabel}
            itemsCount={proposalCount}
            pageSize={DEFAULT_PAGE_SIZE}
            state={dataListState}
          >
            <DataList.Container SkeletonElement={ProposalDataListItemSkeleton}>
              {proposalIds.map((proposalId) => (
                // TODO: update with router agnostic ODS DataListItem
                <ProposalCard key={proposalId} proposalId={proposalId} />
              ))}
            </DataList.Container>
            <DataList.Pagination />
          </DataList.Root>
        </Else>
      </If>
    </MainSection>
  );
}

function SectionView({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-row content-center justify-between">{children}</div>;
}
