import { useState } from "react";
import type { Item } from "@/types";
import { formatPrice, formatRelativeTime } from "@/ItemEngine";
import { useStore } from "@/store/useStore";
import { ShoppingBag, Tag } from "lucide-react";

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const purchaseItem = useStore((s) => s.purchaseItem);
  const goldenGlowId = useStore((s) => s.goldenGlowId);

  const isGlowing = goldenGlowId === item.id;
  const isSold = item.status === "已售出";

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSold) return;
    purchaseItem(item.id);
  };

  return (
    <div
      className={`item-card group relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-300 ease-out
        ${isHovered ? "-translate-y-2 scale-[1.03] shadow-2xl" : "shadow-lg"}
        ${isGlowing ? "golden-glow" : ""}
        ${isSold ? "opacity-75" : ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover blur-xl scale-110 opacity-40"
          loading="lazy"
        />
      </div>

      <div className="glass-panel relative flex flex-col">
        <div className="relative overflow-hidden rounded-t-2xl">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-48 object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className="glass-badge inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full">
              <Tag size={12} />
              {item.category}
            </span>
          </div>
          {isSold && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="glass-badge px-4 py-1.5 text-sm font-semibold text-red-300 rounded-full border border-red-400/30">
                已售出
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2">
          <h3 className="text-base font-semibold text-warm-900 truncate">
            {item.title}
          </h3>
          <p className="text-xs text-warm-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-bold text-gold">{formatPrice(item.price)}</span>
            <span className="text-xs text-warm-400">{formatRelativeTime(item.createdAt)}</span>
          </div>

          {!isSold && (
            <button
              onClick={handlePurchase}
              className={`mt-2 w-full py-2 px-4 rounded-xl text-sm font-medium
                transition-all duration-300 ease-out
                flex items-center justify-center gap-2
                ${
                  isHovered
                    ? "bg-gold/90 text-white shadow-md shadow-gold/30 translate-y-0 opacity-100"
                    : "bg-gold/20 text-gold border border-gold/30 opacity-0 translate-y-2"
                }
              `}
            >
              <ShoppingBag size={14} />
              立即购买
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
