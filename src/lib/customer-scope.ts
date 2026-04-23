import { Role, type Prisma } from "@prisma/client";

export function buildAgentCustomerWhere(agentId: string): Prisma.UserWhereInput {
  return {
    role: Role.CUSTOMER,
    isActive: true,
    OR: [
      { ownerAgentId: agentId },
      {
        Ticket_Ticket_customerIdToUser: {
          some: {
            agentId,
          },
        },
      },
      {
        ParentMember: {
          ownerAgentId: agentId,
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
