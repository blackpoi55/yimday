import type { Prisma } from "@prisma/client";
import { SELF_ENTRY_NOTE_PREFIX } from "@/lib/ticket-entry-source";

export function buildAgentRecordedTicketWhere(agentId: string): Prisma.TicketWhereInput {
  return {
    agentId,
    OR: [
      { note: null },
      {
        note: {
          not: {
            startsWith: SELF_ENTRY_NOTE_PREFIX,
          },
        },
      },
    ],
  };
}
