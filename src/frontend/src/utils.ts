// Number and display formatting utilities

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const toNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const formatNumber = (value: unknown): string => {
  return numberFormatter.format(toNumber(value));
};

export const formatCurrency = (value: unknown): string => {
  return currencyFormatter.format(toNumber(value));
};

export const formatCompactCurrency = (value: unknown): string => {
  return compactCurrencyFormatter.format(toNumber(value));
};

export const formatPercent = (value: unknown): string => {
  return percentFormatter.format(toNumber(value));
};

export const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export const formatWarehouse = (warehouse?: string | null): string => {
  if (!warehouse || warehouse === "unassigned") return "Unassigned";
  return warehouse
    .replace(/^warehouse_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
