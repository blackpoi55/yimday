import { DrawStatus } from "@prisma/client";

type DrawWindow = {
  status: DrawStatus | string;
  openAt: Date;
  closeAt: Date;
};

export function getEffectiveDrawStatus(draw: DrawWindow, now = new Date()) {
  if (draw.status === DrawStatus.RESULTED) {
    return DrawStatus.RESULTED;
  }

  if (draw.status === DrawStatus.CLOSED) {
    return DrawStatus.CLOSED;
  }

  if (draw.openAt > now) {
    return DrawStatus.UPCOMING;
  }

  if (draw.closeAt < now) {
    return DrawStatus.CLOSED;
  }

  return DrawStatus.OPEN;
}

export function isDrawAcceptingTickets(draw: DrawWindow, now = new Date()) {
  return getEffectiveDrawStatus(draw, now) === DrawStatus.OPEN;
}
