export const SELF_ENTRY_NOTE_PREFIX = "[[entry:self]]";

export type ParsedTicketEntryNote = {
  displayNote: string | null;
  isSelfEntry: boolean;
};

export function parseTicketEntryNote(note: string | null | undefined): ParsedTicketEntryNote {
  if (!note) {
    return {
      displayNote: null,
      isSelfEntry: false,
    };
  }

  if (note.startsWith(SELF_ENTRY_NOTE_PREFIX)) {
    const displayNote = note.slice(SELF_ENTRY_NOTE_PREFIX.length).trim();

    return {
      displayNote: displayNote || null,
      isSelfEntry: true,
    };
  }

  return {
    displayNote: note,
    isSelfEntry: false,
  };
}

export function buildTicketEntryNote(note: string | null | undefined, isSelfEntry: boolean) {
  const normalizedNote = note?.trim() || "";

  if (!isSelfEntry) {
    return normalizedNote || null;
  }

  return `${SELF_ENTRY_NOTE_PREFIX}${normalizedNote}`;
}

export function getTicketRecorderLabel(agentName: string, isSelfEntry: boolean) {
  return isSelfEntry ? "คีย์เอง" : agentName;
}
