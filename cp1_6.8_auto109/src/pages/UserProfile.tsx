import { useState } from "react";
import { useStore } from "@/store/useStore";
import { formatPrice, formatDate, formatRelativeTime } from "@/ItemEngine";
import type { Item, Transaction } from "@/types";
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  ChevronDown,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const CURRENT_USER_ID = "user1";

type TimelineEntry =
  | { type: "item"; data: Item }
  | { type: "transaction"; data: Transaction };

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    在售: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600",
      icon: <CheckCircle2 size={12} />,
    },
    已售出: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-500",
      icon: <AlertCircle size={12} />,
    },
    交易中: {
      bg: "bg-gold/10 border-gold/20",
      text: "text-gold",
      icon: <Clock size={12} />,
    },
  };

  const c = config[status] || config["在售"];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}
    >
      {c.icon}
      {status}
    </span>
  );
}

function TimelineItem({
  entry,
  isLast,
}: {
  entry: TimelineEntry;
  isLast: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isItemEntry = entry.type === "item";
  const item = isItemEntry ? (entry.data as Item) : null;
  const tx = !isItemEntry ? (entry.data as Transaction) : null;

  const title = isItemEntry ? item!.title : tx!.itemTitle;
  const imageUrl = isItemEntry ? item!.imageUrl : tx!.itemImageUrl;
  const price = isItemEntry ? item!.price : tx!.price;
  const status = isItemEntry ? item!.status : tx!.status;
  const date = isItemEntry ? item!.createdAt : tx!.createdAt;
  const description = isItemEntry ? item!.description : undefined;
  const category = isItemEntry ? item!.category : undefined;

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-gold ring-4 ring-gold/10 shrink-0 mt-1.5" />
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-gold/30 to-transparent mt-1" />
        )}
      </div>

      <div className="flex-1 pb-8 min-w-0">
        <div
          className="glass-panel rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3">
            <img
              src={imageUrl}
              alt={title}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-warm-900 truncate">
                  {title}
                </h3>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold text-gold">
                  {formatPrice(price)}
                </span>
                <span className="text-xs text-warm-400">
                  {formatRelativeTime(date)}
                </span>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`text-warm-400 shrink-0 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isExpanded ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-3 border-t border-warm-200/50 space-y-2">
              {description && (
                <p className="text-xs text-warm-600 leading-relaxed">
                  {description}
                </p>
              )}
              {category && (
                <p className="text-xs text-warm-400">
                  分类：{category}
                </p>
              )}
              <p className="text-xs text-warm-400">
                日期：{formatDate(date)}
              </p>
              {!isItemEntry && tx && (
                <p className="text-xs text-warm-400">
                  {tx.buyerId === CURRENT_USER_ID ? "买入" : "卖出"}交易
                </p>
              )}
              {isItemEntry && item && item.soldAt && (
                <p className="text-xs text-warm-400">
                  售出日期：{formatDate(item.soldAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const userItems = useStore((s) => s.getUserItems(CURRENT_USER_ID));
  const userTransactions = useStore((s) => s.getUserTransactions(CURRENT_USER_ID));

  const timeline: TimelineEntry[] = [
    ...userItems.map((item) => ({ type: "item" as const, data: item })),
    ...userTransactions.map((tx) => ({ type: "transaction" as const, data: tx })),
  ].sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );

  const stats = {
    published: userItems.length,
    sold: userItems.filter((i) => i.status === "已售出").length,
    purchased: userTransactions.filter((t) => t.buyerId === CURRENT_USER_ID).length,
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="sticky top-0 z-40 glass-nav border-b border-warm-200/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl glass-button text-warm-600 hover:text-warm-900 transition-all duration-300"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-warm-900 font-display">
            我的时光
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-panel rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg shadow-gold/20">
              时
            </div>
            <div>
              <h2 className="text-lg font-bold text-warm-900">时光旅人</h2>
              <p className="text-sm text-warm-500">在时光集市中寻找宝贝</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-warm-100/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Package size={14} className="text-gold" />
                <span className="text-xl font-bold text-warm-900">{stats.published}</span>
              </div>
              <span className="text-xs text-warm-500">已发布</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-warm-100/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-xl font-bold text-warm-900">{stats.sold}</span>
              </div>
              <span className="text-xs text-warm-500">已售出</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-warm-100/40">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ShoppingBag size={14} className="text-amber-500" />
                <span className="text-xl font-bold text-warm-900">{stats.purchased}</span>
              </div>
              <span className="text-xs text-warm-500">已购入</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="text-gold" size={18} />
            <h2 className="text-base font-bold text-warm-900 font-display">
              时光记录
            </h2>
          </div>

          {timeline.length === 0 ? (
            <div className="text-center py-12 text-warm-400">
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">还没有记录，去集市逛逛吧</p>
            </div>
          ) : (
            <div>
              {timeline.map((entry, index) => (
                <TimelineItem
                  key={`${entry.type}-${entry.data.id}`}
                  entry={entry}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
