export interface StockCountEntry {
  toy_id: string;
  toy_name: string;
  opening_balance: number;
  produced_quantity: number;
  closing_balance: number;
  notes: string;
  isModified?: boolean;
}

export interface StockHistoryData {
  date: string;
  toy_id: string;
  toy_name: string;
  opening_balance: number;
  produced_quantity: number;
  closing_balance: number;
}

export type StockLevel = "low" | "medium" | "high";

export function calculateStockLevel(
  currentStock: number,
  averageStock: number
): StockLevel {
  if (averageStock === 0) return "medium";
  
  const ratio = currentStock / averageStock;
  if (ratio < 0.5) return "low";
  if (ratio > 1.5) return "high";
  return "medium";
}

export function calculateStockVelocity(
  stockHistory: StockHistoryData[],
  toyId: string
): number {
  const toyData = stockHistory.filter((item) => item.toy_id === toyId);
  if (toyData.length < 2) return 0;

  const latest = toyData[toyData.length - 1];
  const earliest = toyData[0];
  const days = toyData.length;

  return (latest.closing_balance - earliest.closing_balance) / days;
}

export function calculateAverageStock(
  stockHistory: StockHistoryData[],
  toyId: string
): number {
  const toyData = stockHistory.filter((item) => item.toy_id === toyId);
  if (toyData.length === 0) return 0;

  const total = toyData.reduce((sum, item) => sum + item.closing_balance, 0);
  return Math.round(total / toyData.length);
}

export function calculateDaysOfStock(
  currentStock: number,
  velocity: number
): number | null {
  if (velocity >= 0) return null; // Stock is increasing
  return Math.round(currentStock / Math.abs(velocity));
}

export function getTrendDirection(velocity: number): "up" | "down" | "stable" {
  if (velocity > 1) return "up";
  if (velocity < -1) return "down";
  return "stable";
}

export function getStockLevelColor(level: StockLevel): string {
  switch (level) {
    case "low":
      return "hsl(0 84% 60%)"; // destructive
    case "medium":
      return "hsl(38 60% 72%)"; // accent
    case "high":
      return "hsl(120 60% 50%)"; // success green
  }
}

export function getStockLevelLabel(level: StockLevel): string {
  switch (level) {
    case "low":
      return "Low Stock";
    case "medium":
      return "Normal";
    case "high":
      return "High Stock";
  }
}

export function calculateTotalStats(entries: StockCountEntry[]) {
  return entries.reduce(
    (acc, entry) => ({
      totalOpening: acc.totalOpening + entry.opening_balance,
      totalProduced: acc.totalProduced + entry.produced_quantity,
      totalClosing: acc.totalClosing + entry.closing_balance,
    }),
    { totalOpening: 0, totalProduced: 0, totalClosing: 0 }
  );
}
