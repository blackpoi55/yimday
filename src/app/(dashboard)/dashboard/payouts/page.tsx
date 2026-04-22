import { Role } from "@prisma/client";
import { PayoutsPageClient } from "@/components/payouts/payouts-page-client";
import { requireSession } from "@/lib/auth";
import { payoutPageRows } from "@/lib/constants";
import { getPayoutProfiles, hasPayoutProfileTable } from "@/lib/payouts";
import { toNumber } from "@/lib/utils";

type PayoutsPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  await requireSession([Role.ADMIN]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedTab = resolvedSearchParams.tab === "client" ? "client" : "member";
  const selectedRole = selectedTab === "client" ? Role.CUSTOMER : Role.AGENT;
  const hasTable = await hasPayoutProfileTable();
  const profiles = await getPayoutProfiles(selectedRole);

  return (
    <PayoutsPageClient
      hasTable={hasTable}
      profiles={payoutPageRows.map((row) => {
        const item = profiles.find((profile) => profile.betType === row.betType);
        const itemId = item && "id" in item ? item.id : undefined;
        return {
          id: itemId,
          label: row.label,
          betType: row.betType,
          payout: toNumber(item?.payout ?? 0),
          commission: toNumber(item?.commission ?? 0),
          role: selectedRole,
        };
      })}
      selectedTab={selectedTab}
    />
  );
}
