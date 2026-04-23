type LegacyTicketFormatInput = {
  betType: string;
  number: string;
  amount: number;
  activeType?: string | null;
};

function canonicalDigits(value: string) {
  return value.split("").sort().join("");
}

export function formatLegacyTicketEntry({
  betType,
  number,
  amount,
  activeType = null,
}: LegacyTicketFormatInput) {
  const amountText = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (activeType === "TWO_TOD") {
    return `บ:${canonicalDigits(number)}=*${amountText}`;
  }

  if (activeType === "THREE_TOD" || betType === "THREE_TOD") {
    return `บ:${canonicalDigits(number)}=*${amountText}`;
  }

  switch (betType) {
    case "TWO_TOP":
    case "THREE_STRAIGHT":
    case "RUN_TOP":
      return `บ:${number}=${amountText}`;
    case "TWO_BOTTOM":
    case "THREE_BOTTOM":
    case "RUN_BOTTOM":
      return `ล:${number}=${amountText}`;
    case "FRONT_THREE":
      return `น:${number}=${amountText}`;
    case "BACK_THREE":
      return `ท:${number}=${amountText}`;
    default:
      return `${number}=${amountText}`;
  }
}
