import { MemberType, Role, type Prisma } from "@prisma/client";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { UsersPageClient } from "@/components/users/users-page-client";
import { requireSession } from "@/lib/auth";
import { buildAgentCustomerWhere } from "@/lib/customer-scope";
import { getUserCompatSettings } from "@/lib/php-compat-store";
import { compatSettingsFromPayoutProfiles, defaultUserCompatSettings } from "@/lib/php-compat-shared";
import { getPayoutProfiles } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";

type UsersPageProps = {
  searchParams?: Promise<{
    tab?: string;
    error?: string;
    scope?: string;
  }>;
};

type AgentMemberScope = "all" | "mine" | "tickets";

type UserRowData = {
  id: string;
  name: string;
  username: string;
  passwordPlain: string | null;
  tableUsername?: string;
  tablePassword?: string;
  phone: string | null;
  role: Role;
  memberType: MemberType | null;
  isSharedMember: boolean;
  ownerAgentId: string | null;
  parentMemberId: string | null;
  managerName: string;
  isActive: boolean;
};

type UserOption = {
  id: string;
  name: string;
};

type AgentMemberRow = {
  id: string;
  name: string;
  memberType: MemberType | null;
  parentMemberId: string | null;
};

type AgentMainMemberGroup = {
  id: string;
  name: string;
  members: AgentMemberRow[];
};

const agentMemberScopeLinks: Array<{ scope: AgentMemberScope; label: string; href: string }> = [
  { scope: "all", label: "สมาชิกทั้งหมด", href: "/dashboard/users" },
  { scope: "mine", label: "เฉพาะสมาชิกของเรา", href: "/dashboard/users?scope=mine" },
  { scope: "tickets", label: "เฉพาะสมาชิกที่มีโพย", href: "/dashboard/users?scope=tickets" },
];

function getAgentMemberScope(value?: string): AgentMemberScope {
  return value === "mine" || value === "tickets" ? value : "all";
}

function buildAgentMemberWhere(agentId: string, scope: AgentMemberScope, currentDrawId?: string | null): Prisma.UserWhereInput {
  if (scope === "mine") {
    return {
      role: Role.CUSTOMER,
      isActive: true,
      OR: [
        { ownerAgentId: agentId },
        {
          ParentMember: {
            ownerAgentId: agentId,
          },
        },
      ],
    };
  }

  if (scope === "tickets") {
    if (!currentDrawId) {
      return {
        id: "__no_open_draw__",
        role: Role.CUSTOMER,
        isActive: true,
      };
    }

    return {
      role: Role.CUSTOMER,
      isActive: true,
      OR: [
        {
          Ticket_Ticket_customerIdToUser: {
            some: {
              agentId,
              drawId: currentDrawId,
            },
          },
        },
        {
          ParentMember: {
            Ticket_Ticket_customerIdToUser: {
              some: {
                agentId,
                drawId: currentDrawId,
              },
            },
          },
        },
      ],
    };
  }

  return buildAgentCustomerWhere(agentId);
}

function decorateDisplayFields(user: UserRowData) {
  let tableUsername = user.username;

  if (user.username.startsWith("__blank__")) {
    tableUsername = "";
  } else if (user.username.startsWith("__display__")) {
    const match = user.username.match(/^__display__(.+?)__/);
    tableUsername = match?.[1] ?? user.username;
  }

  return {
    ...user,
    tableUsername,
    tablePassword: user.passwordPlain ?? "",
  };
}

function normalizeMemberType<T extends { memberType: MemberType | null }>(user: T) {
  return {
    ...user,
    memberType: user.memberType ?? MemberType.MEMBER,
  };
}

function getAgentErrorMessage(error?: string) {
  if (error === "draw-closed") {
    return "ยังไม่อยู่ในช่วงเวลาแทงโพย หรือ งวดถูกปิดรับแล้ว";
  }

  if (error === "member-not-found") {
    return "ไม่พบข้อมูลสมาชิกที่เลือก";
  }

  return null;
}

function AgentMembersTable({ members }: { members: AgentMemberRow[] }) {
  return (
    <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
      <table className="legacy-period-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อ-สกุล</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr key={member.id}>
              <td>{index + 1}</td>
              <td>{member.name}</td>
              <td>
                <div className="flex items-center gap-2">
                  <Link className="legacy-btn-info legacy-icon-btn" href={`/dashboard/users/check-period?customerId=${member.id}`}>
                    <Pencil className="size-14px" />
                  </Link>
                  <Link className="legacy-btn-success legacy-icon-btn" href={`/dashboard/users/${member.id}`}>
                    <Eye className="size-14px" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {members.length === 0 ? (
            <tr>
              <td colSpan={3}>ยังไม่มีสมาชิกในความดูแล</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function AgentMembersPage({
  members,
  mainMemberGroups,
  errorMessage,
  selectedScope,
  currentDrawName,
}: {
  members: AgentMemberRow[];
  mainMemberGroups: AgentMainMemberGroup[];
  errorMessage: string | null;
  selectedScope: AgentMemberScope;
  currentDrawName?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="panel max-w-[920px]">
        <div className="panel-header justify-center">
          <h1 className="text-[22px] font-medium text-[#333]">รายชื่อสมาชิก</h1>
        </div>
        <div className="panel-body space-y-4">
          {errorMessage ? (
            <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">{errorMessage}</div>
          ) : null}
          <div className="legacy-tab-nav">
            {agentMemberScopeLinks.map((item) => (
              <Link key={item.scope} className={selectedScope === item.scope ? "legacy-tab-link active" : "legacy-tab-link"} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          {selectedScope === "tickets" ? (
            <div className="rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-4 py-3 text-sm text-[#31708f]">
              {currentDrawName ? `แสดงเฉพาะสมาชิกที่มีโพยในงวด: ${currentDrawName}` : "ไม่พบงวดปัจจุบันที่เปิดรับโพย"}
            </div>
          ) : null}
          <AgentMembersTable members={members} />
        </div>
      </div>

      {mainMemberGroups.map((group) => (
        <details key={group.id} className="panel max-w-[920px]">
          <summary className="panel-header cursor-pointer list-none">
            <h2 className="text-lg font-medium">{group.name}</h2>
          </summary>
          <div className="panel-body">
            <AgentMembersTable members={group.members} />
          </div>
        </details>
      ))}
    </div>
  );
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedTab = resolvedSearchParams.tab === "staff" ? "staff" : resolvedSearchParams.tab === "client" ? "client" : "member";

  if (session.role === Role.AGENT) {
    const selectedScope = getAgentMemberScope(resolvedSearchParams.scope);
    const currentDraw =
      selectedScope === "tickets"
        ? await prisma.draw.findFirst({
            where: {
              status: "OPEN",
            },
            orderBy: {
              closeAt: "asc",
            },
            select: {
              id: true,
              name: true,
            },
          })
        : null;
    const members = (await prisma.user.findMany({
      where: buildAgentMemberWhere(session.userId, selectedScope, currentDraw?.id),
      select: {
        id: true,
        name: true,
        memberType: true,
        parentMemberId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })).map(normalizeMemberType);

    const regularMembers = members.filter((member) => member.memberType === MemberType.MEMBER);
    const mainMembers = members.filter((member) => member.memberType === MemberType.MAIN_MEMBER);
    const mainMemberGroups = mainMembers.map((mainMember) => ({
      id: mainMember.id,
      name: mainMember.name,
      members: members.filter((member) => member.memberType === MemberType.CLIENT_MEMBER && member.parentMemberId === mainMember.id),
    }));

    return (
      <AgentMembersPage
        errorMessage={getAgentErrorMessage(resolvedSearchParams.error)}
        currentDrawName={currentDraw?.name}
        mainMemberGroups={mainMemberGroups}
        members={regularMembers}
        selectedScope={selectedScope}
      />
    );
  }

  const [customers, clientCustomers, staffs, mainMembers, agents, memberDefaultProfiles, clientDefaultProfiles] = await Promise.all([
    prisma.$queryRaw<UserRowData[]>`
      SELECT
        u.id,
        u.name,
        u.username,
        u."passwordPlain",
        u.phone,
        u.role,
        COALESCE(u."memberType", ${MemberType.MEMBER}::"MemberType") AS "memberType",
        u."isSharedMember",
        u."ownerAgentId",
        u."parentMemberId",
        CASE
          WHEN u."isSharedMember" THEN 'ทุกคน'
          ELSE COALESCE(owner.name, '-')
        END AS "managerName",
        u."isActive"
      FROM "User" u
      LEFT JOIN "User" owner ON owner.id = u."ownerAgentId"
      WHERE u.role = ${Role.CUSTOMER}::"Role"
        AND COALESCE(u."memberType", ${MemberType.MEMBER}::"MemberType") <> ${MemberType.CLIENT_MEMBER}::"MemberType"
      ORDER BY u."createdAt" ASC
    `,
    prisma.$queryRaw<UserRowData[]>`
      SELECT
        u.id,
        u.name,
        u.username,
        u."passwordPlain",
        u.phone,
        u.role,
        COALESCE(u."memberType", ${MemberType.MEMBER}::"MemberType") AS "memberType",
        u."isSharedMember",
        u."ownerAgentId",
        u."parentMemberId",
        COALESCE(parent.name, '-') AS "managerName",
        u."isActive"
      FROM "User" u
      LEFT JOIN "User" parent ON parent.id = u."parentMemberId"
      WHERE u.role = ${Role.CUSTOMER}::"Role"
        AND COALESCE(u."memberType", ${MemberType.MEMBER}::"MemberType") = ${MemberType.CLIENT_MEMBER}::"MemberType"
      ORDER BY u."createdAt" ASC
    `,
    prisma.$queryRaw<UserRowData[]>`
      SELECT
        u.id,
        u.name,
        u.username,
        u."passwordPlain",
        u.phone,
        u.role,
        u."memberType",
        false AS "isSharedMember",
        u."ownerAgentId",
        u."parentMemberId",
        u.username AS "managerName",
        u."isActive"
      FROM "User" u
      WHERE u.role = ${Role.AGENT}::"Role"
      ORDER BY u."createdAt" ASC
    `,
    prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        memberType: MemberType.MAIN_MEMBER,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        role: Role.AGENT,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getPayoutProfiles(Role.AGENT),
    getPayoutProfiles(Role.CUSTOMER),
  ]);

  const activeUsers = (selectedTab === "staff" ? staffs : selectedTab === "client" ? clientCustomers : customers).map(decorateDisplayFields);
  const defaultCompatSettings =
    selectedTab === "member"
      ? compatSettingsFromPayoutProfiles(memberDefaultProfiles)
      : selectedTab === "client"
        ? compatSettingsFromPayoutProfiles(clientDefaultProfiles)
        : defaultUserCompatSettings;

  const userSettings = Object.fromEntries(
    await Promise.all(activeUsers.map(async (user) => [user.id, await getUserCompatSettings(user.id, defaultCompatSettings)] as const)),
  );

  return (
    <UsersPageClient
      agents={agents as UserOption[]}
      defaultCompatSettings={defaultCompatSettings}
      mainMembers={mainMembers as UserOption[]}
      selectedTab={selectedTab}
      userSettings={userSettings}
      users={activeUsers}
    />
  );
}
