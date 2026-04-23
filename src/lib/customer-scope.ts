import { Role, type Prisma } from "@prisma/client";

export function buildAgentCustomerWhere(agentId: string): Prisma.UserWhereInput {
  return {
    role: Role.CUSTOMER,
    isActive: true,
    OR: [
      { isSharedMember: true },
      { ownerAgentId: agentId },
      {
        isSharedMember: false,
        ownerAgentId: null,
        parentMemberId: null,
      },
      {
        Ticket_Ticket_customerIdToUser: {
          some: {
            agentId,
          },
        },
      },
      {
        ParentMember: {
          isSharedMember: true,
        },
      },
      {
        ParentMember: {
          ownerAgentId: agentId,
        },
      },
      {
        ParentMember: {
          isSharedMember: false,
          ownerAgentId: null,
          parentMemberId: null,
        },
      },
      {
        ParentMember: {
          Ticket_Ticket_customerIdToUser: {
            some: {
              agentId,
            },
          },
        },
      },
    ],
  };
}
