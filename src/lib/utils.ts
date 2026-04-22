import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(amount) ? 0 : amount);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy HH:mm", { locale: th });
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy", { locale: th });
}

export function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

export function getString(formDataValue: FormDataEntryValue | null) {
  return typeof formDataValue === "string" ? formDataValue.trim() : "";
}

export function buildCode(prefix: string) {
  const now = new Date();
  const compact = `${now.getFullYear().toString().slice(-2)}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}${`${now.getHours()}`.padStart(2, "0")}${`${now.getMinutes()}`.padStart(2, "0")}${`${now.getSeconds()}`.padStart(2, "0")}`;
  const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${compact}-${entropy}`;
}

export function createDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`);
}
