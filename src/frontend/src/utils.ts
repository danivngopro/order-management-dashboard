// Number and currency formatting utilities

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatNumber = (value: number): string => {
  return numberFormatter.format(value);
};

export const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value);
};

export const formatPercent = (value: number): string => {
  return percentFormatter.format(value);
};

export const formatMetric = (value: number, type: "number" | "currency" | "percent" = "number"): string => {
  switch (type) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
};
