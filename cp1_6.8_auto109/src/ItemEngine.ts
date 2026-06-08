import type { Item } from "@/types";
import { CATEGORIES } from "@/types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function createItem(
  data: Omit<Item, "id" | "status" | "sellerId" | "createdAt">,
  sellerId: string
): Item {
  return {
    ...data,
    id: generateId(),
    status: "在售",
    sellerId,
    createdAt: new Date().toISOString(),
  };
}

export function searchItems(items: Item[], query: string): Item[] {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery)
  );
}

export function filterByCategory(items: Item[], category: string): Item[] {
  if (category === "全部") return items;
  return items.filter((item) => item.category === category);
}

export function getAvailableCategories(): readonly string[] {
  return CATEGORIES;
}

export function isItemAvailable(item: Item): boolean {
  return item.status === "在售";
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return formatDate(dateString);
}
