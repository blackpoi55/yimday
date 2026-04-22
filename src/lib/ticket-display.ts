type TicketLabelInput = {
  id: string;
  customerId: string;
  drawId: string;
  createdAt: Date | string;
};

export function buildTicketDisplayNameMap<T extends TicketLabelInput>(tickets: T[]) {
  const grouped = new Map<string, T[]>();
  const labels = new Map<string, string>();

  for (const ticket of tickets) {
    const key = `${ticket.customerId}:${ticket.drawId}`;
    const current = grouped.get(key) ?? [];
    current.push(ticket);
    grouped.set(key, current);
  }

  for (const [, items] of grouped) {
    items
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((ticket, index) => {
        labels.set(ticket.id, `โพยใบที่ ${index + 1}`);
      });
  }

  return labels;
}

export function getTicketDisplayName(ticketId: string, labels: Map<string, string>, fallback: string) {
  return labels.get(ticketId) ?? fallback;
}

function extractTicketDisplayOrder(label: string) {
  const match = label.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function sortByTicketDisplayName<T extends { id: string }>(items: T[], labels: Map<string, string>) {
  return items.slice().sort((a, b) => {
    const aOrder = extractTicketDisplayOrder(labels.get(a.id) ?? "");
    const bOrder = extractTicketDisplayOrder(labels.get(b.id) ?? "");
    return aOrder - bOrder;
  });
}
