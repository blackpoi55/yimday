type DrawWindow = {
  status: string;
  openAt: Date;
  closeAt: Date;
};

export function isDrawAcceptingTickets(draw: DrawWindow, now = new Date()) {
  return draw.status === "OPEN" && draw.openAt <= now && draw.closeAt >= now;
}

