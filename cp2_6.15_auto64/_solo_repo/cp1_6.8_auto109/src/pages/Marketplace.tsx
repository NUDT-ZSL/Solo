import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { CATEGORIES } from "@/types";
import ItemCard from "@/ItemCard";
import { formatPrice } from "@/ItemEngine";
import {
  Search,
  Plus,
  X,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Marketplace() {
  const {
    searchQuery,
    selectedCategory,
    isPublishModalOpen,
    isSuccessModalOpen,
    purchasedItem,
    setSearchQuery,
    setSelectedCategory,
    addItem,
    purchaseItem,
    setPublishModalOpen,
    setSuccessModalOpen,
    getFilteredItems,
  } = useStore();

  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems, searchQuery, selectedCategory, useStore((s) => s.items)]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    category: "其他",
  });

  const handlePublish = () => {
    if (!form.title || !form.price) return;
    addItem({
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      imageUrl:
        form.imageUrl ||
        `https://picsum.photos/seed/${Date.now()}/400/400`,
      category: form.category,
    });
    setForm({ title: "", description: "", price: "", imageUrl: "", category: "其他" });
    setPublishModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="sticky top-0 z-40 glass-nav border-b border-warm-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Sparkles className="text-gold" size={24} />
            <h1 className="text-xl font-bold text-warm-900 font-display">
              时光集市
            </h1>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索闲置好物..."
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-sm text-warm-900 placeholder-warm-400 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPublishModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-white text-sm font-medium shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">发布</span>
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button text-sm text-warm-700 hover:text-warm-900 transition-all duration-300"
            >
              <User size={16} />
              <span className="hidden sm:inline">我的</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                ${
                  selectedCategory === cat
                    ? "bg-gold text-white shadow-md shadow-gold/20"
                    : "glass-badge text-warm-600 hover:text-warm-800 hover:bg-warm-100/60"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-warm-400">
            <Search size={48} className="mb-4 opacity-30" />
            <p className="text-lg mb-2">没有找到相关商品</p>
            <p className="text-sm">没找到？试试换个关键词</p>
          </div>
        ) : (
          <>
            <div className="masonry-grid">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="masonry-item"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <ItemCard item={item} />
                </div>
              ))}
            </div>
            {filteredItems.length < 5 && searchQuery && (
              <p className="text-center text-warm-400 text-sm mt-8 animate-fade-in">
                没找到？试试换个关键词 ✨
              </p>
            )}
          </>
        )}
      </main>

      {isPublishModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPublishModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative glass-modal w-full max-w-lg rounded-2xl p-6 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-warm-900 font-display">
                发布闲置好物
              </h2>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="p-1 rounded-lg hover:bg-warm-100/60 text-warm-400 hover:text-warm-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  商品标题 *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="给你的宝贝起个名字"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-warm-900 placeholder-warm-400 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  描述
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="描述一下你的宝贝..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-warm-900 placeholder-warm-400 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">
                    价格 (¥) *
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-warm-900 placeholder-warm-400 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">
                    分类
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-warm-900 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300"
                  >
                    {CATEGORIES.filter((c) => c !== "全部").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  图片 URL
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="留空将自动生成占位图"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-warm-900 placeholder-warm-400 outline-none focus:ring-2 focus:ring-gold/40 transition-all duration-300"
                />
              </div>

              <button
                onClick={handlePublish}
                disabled={!form.title || !form.price}
                className="w-full py-3 rounded-xl bg-gold text-white font-medium shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                发布商品
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuccessModalOpen && purchasedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSuccessModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative glass-modal w-full max-w-sm rounded-2xl p-6 text-center animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
              <ShoppingBag className="text-gold" size={28} />
            </div>
            <h2 className="text-lg font-bold text-warm-900 font-display mb-2">
              交易成功！
            </h2>
            <p className="text-sm text-warm-600 mb-4">
              你已成功购入「{purchasedItem.title}」
            </p>
            <div className="glass-badge inline-block px-4 py-2 rounded-xl mb-6">
              <span className="text-lg font-bold text-gold">
                {formatPrice(purchasedItem.price)}
              </span>
            </div>
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gold text-white font-medium shadow-md shadow-gold/20 hover:shadow-lg transition-all duration-300"
            >
              继续逛逛
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
