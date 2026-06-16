import React, { useState, useEffect } from 'react';
import { Plus, Menu, X, ChefHat, ShoppingCart, Calendar } from 'lucide-react';
import MemberCard from './components/MemberCard';
import InventoryList from './components/InventoryList';
import MealCalendar from './components/MealCalendar';
import ShoppingList from './components/ShoppingList';
import type {
  FamilyMember,
  InventoryItem,
  MealSlot,
  Recipe,
  ShoppingCategory,
  ShoppingListResponse,
} from './types';

type ViewMode = 'calendar' | 'shopping';

const App: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [shoppingData, setShoppingData] = useState<ShoppingListResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', age: '', preferences: '', allergens: '' });
  const [newInventory, setNewInventory] = useState({ name: '', quantity: '', unit: '克', expiryDate: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersRes, inventoryRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/inventory'),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (inventoryRes.ok) setInventory(await inventoryRes.json());
    } catch (e) {
      console.error('加载数据失败', e);
    }
  };

  const addMember = async () => {
    if (!newMember.name || !newMember.age) return;
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMember.name,
          age: parseInt(newMember.age),
          preferences: newMember.preferences.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 5),
          allergens: newMember.allergens.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const member = await res.json();
        setMembers([...members, member]);
        setNewMember({ name: '', age: '', preferences: '', allergens: '' });
        setShowMemberForm(false);
      }
    } catch (e) {
      console.error('添加成员失败', e);
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (res.ok) setMembers(members.filter((m) => m.id !== id));
    } catch (e) {
      console.error('删除成员失败', e);
    }
  };

  const addInventory = async () => {
    if (!newInventory.name || !newInventory.quantity || !newInventory.expiryDate) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newInventory.name,
          quantity: parseFloat(newInventory.quantity),
          unit: newInventory.unit,
          expiryDate: newInventory.expiryDate,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setInventory([...inventory, item].sort((a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        ));
        setNewInventory({ name: '', quantity: '', unit: '克', expiryDate: '' });
        setShowInventoryForm(false);
      }
    } catch (e) {
      console.error('添加库存失败', e);
    }
  };

  const deleteInventory = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) setInventory(inventory.filter((i) => i.id !== id));
    } catch (e) {
      console.error('删除库存失败', e);
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members, inventory }),
      });
      if (res.ok) {
        setMealPlan(await res.json());
        setViewMode('calendar');
      }
    } catch (e) {
      console.error('生成食谱失败', e);
    } finally {
      setLoading(false);
    }
  };

  const generateShoppingList = async () => {
    if (mealPlan.length === 0) {
      alert('请先生成一周食谱');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlan, inventory }),
      });
      if (res.ok) {
        setShoppingData(await res.json());
        setViewMode('shopping');
      }
    } catch (e) {
      console.error('生成购物清单失败', e);
    } finally {
      setLoading(false);
    }
  };

  const updateMeal = (slotId: string, recipe: Recipe) => {
    setMealPlan(
      mealPlan.map((slot) => {
        if (slot.id !== slotId) return slot;
        const allAllergens = [...new Set(members.flatMap((m) => m.allergens))];
        const hasAllergen = recipe.ingredients.some((ing) =>
          allAllergens.some((a) => ing.name.includes(a))
        );
        const warnings: string[] = [];
        if (hasAllergen) warnings.push('含有过敏原成分');
        
        return { ...slot, recipe, warnings, alternatives: slot.alternatives.filter((a) => a.id !== recipe.id) };
      })
    );
  };

  const moveMeal = (fromSlotId: string, toSlotId: string) => {
    setMealPlan(
      mealPlan.map((slot) => {
        if (slot.id === fromSlotId) return { ...slot, recipe: null, warnings: [] };
        if (slot.id === toSlotId) {
          const fromSlot = mealPlan.find((s) => s.id === fromSlotId);
          return { ...slot, recipe: fromSlot?.recipe || null, warnings: fromSlot?.warnings || [] };
        }
        return slot;
      })
    );
  };

  const togglePurchased = (categoryName: string, itemId: string) => {
    if (!shoppingData) return;
    setShoppingData({
      ...shoppingData,
      categories: shoppingData.categories.map((cat) =>
        cat.name === categoryName
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, purchased: !item.purchased } : item
              ),
            }
          : cat
      ),
    });
  };

  const toggleCategory = (categoryName: string) => {
    if (!shoppingData) return;
    setShoppingData({
      ...shoppingData,
      categories: shoppingData.categories.map((cat) =>
        cat.name === categoryName ? { ...cat, collapsed: !cat.collapsed } : cat
      ),
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#0f0f1a', borderColor: '#222' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <button
              className="hidden lg:block p-2 text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <ChefHat size={28} className="text-purple-400" />
              <h1 className="text-xl font-bold text-white">智能家庭膳食规划</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={viewMode === 'calendar' ? { backgroundColor: '#2a2a3e' } : {}}
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">食谱日历</span>
            </button>
            <button
              onClick={() => setViewMode('shopping')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'shopping'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={viewMode === 'shopping' ? { backgroundColor: '#2a2a3e' } : {}}
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">购物清单</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto flex">
        <aside
          className={`${
            sidebarOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
          } hidden lg:block flex-shrink-0 border-r transition-all duration-300`}
          style={{ borderColor: '#222' }}
        >
          <div className="p-6 space-y-8" style={{ width: 380 }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">家庭成员</h2>
                <button
                  onClick={() => setShowMemberForm(!showMemberForm)}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} /> 添加
                </button>
              </div>

              {showMemberForm && (
                <div className="fade-in mb-4 p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1a1a2e' }}>
                  <input
                    type="text"
                    placeholder="姓名"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    placeholder="年龄"
                    value={newMember.age}
                    onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    placeholder="偏好标签（逗号分隔，最多5个）"
                    value={newMember.preferences}
                    onChange={(e) => setNewMember({ ...newMember, preferences: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    placeholder="过敏原（逗号分隔）"
                    value={newMember.allergens}
                    onChange={(e) => setNewMember({ ...newMember, allergens: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={addMember}
                    className="w-full py-2 text-white rounded-lg text-sm gradient-btn transition-transform hover:scale-105"
                  >
                    确认添加
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {members.map((member) => (
                  <MemberCard key={member.id} member={member} onDelete={deleteMember} />
                ))}
                {members.length === 0 && (
                  <div className="text-gray-500 text-sm w-full text-center py-8">
                    暂无家庭成员，请添加
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">食材库存</h2>
                <button
                  onClick={() => setShowInventoryForm(!showInventoryForm)}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} /> 添加
                </button>
              </div>

              {showInventoryForm && (
                <div className="fade-in mb-4 p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1a1a2e' }}>
                  <input
                    type="text"
                    placeholder="食材名称"
                    value={newInventory.name}
                    onChange={(e) => setNewInventory({ ...newInventory, name: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="数量"
                      value={newInventory.quantity}
                      onChange={(e) => setNewInventory({ ...newInventory, quantity: e.target.value })}
                      className="flex-1 px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none text-sm"
                    />
                    <select
                      value={newInventory.unit}
                      onChange={(e) => setNewInventory({ ...newInventory, unit: e.target.value })}
                      className="px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none text-sm"
                    >
                      <option value="克">克</option>
                      <option value="个">个</option>
                      <option value="毫升">毫升</option>
                      <option value="片">片</option>
                      <option value="瓣">瓣</option>
                      <option value="根">根</option>
                    </select>
                  </div>
                  <input
                    type="date"
                    value={newInventory.expiryDate}
                    onChange={(e) => setNewInventory({ ...newInventory, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={addInventory}
                    className="w-full py-2 text-white rounded-lg text-sm gradient-btn transition-transform hover:scale-105"
                  >
                    确认添加
                  </button>
                </div>
              )}

              <InventoryList items={inventory} onDelete={deleteInventory} />
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: '#222' }}>
              <button
                onClick={generateMealPlan}
                disabled={loading}
                className="w-full text-white font-medium rounded-full gradient-btn transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: 200, height: 48, margin: '0 auto' }}
              >
                {loading ? '生成中...' : '生成一周食谱'}
              </button>
              <button
                onClick={generateShoppingList}
                disabled={loading || mealPlan.length === 0}
                className="w-full py-3 text-white font-medium rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                style={{
                  width: 200,
                  border: '2px solid #667eea',
                  backgroundColor: 'transparent',
                }}
              >
                生成购物清单
              </button>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className="absolute left-0 top-0 bottom-0 overflow-y-auto scrollbar-thin"
              style={{ width: 320, backgroundColor: '#0f0f1a' }}
            >
              <div className="p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">家庭成员</h2>
                  <button
                    onClick={() => setShowMemberForm(!showMemberForm)}
                    className="text-purple-400 text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {showMemberForm && (
                  <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1a1a2e' }}>
                    <input
                      placeholder="姓名"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="年龄"
                      value={newMember.age}
                      onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <input
                      placeholder="偏好标签"
                      value={newMember.preferences}
                      onChange={(e) => setNewMember({ ...newMember, preferences: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <input
                      placeholder="过敏原"
                      value={newMember.allergens}
                      onChange={(e) => setNewMember({ ...newMember, allergens: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <button
                      onClick={addMember}
                      className="w-full py-2 text-white rounded-lg text-sm gradient-btn"
                    >
                      添加
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {members.map((m) => (
                    <MemberCard key={m.id} member={m} onDelete={deleteMember} />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">食材库存</h2>
                  <button
                    onClick={() => setShowInventoryForm(!showInventoryForm)}
                    className="text-purple-400 text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {showInventoryForm && (
                  <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1a1a2e' }}>
                    <input
                      placeholder="食材名称"
                      value={newInventory.name}
                      onChange={(e) => setNewInventory({ ...newInventory, name: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="数量"
                        value={newInventory.quantity}
                        onChange={(e) => setNewInventory({ ...newInventory, quantity: e.target.value })}
                        className="flex-1 px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <select
                        value={newInventory.unit}
                        onChange={(e) => setNewInventory({ ...newInventory, unit: e.target.value })}
                        className="px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                      >
                        <option value="克">克</option>
                        <option value="个">个</option>
                        <option value="毫升">毫升</option>
                      </select>
                    </div>
                    <input
                      type="date"
                      value={newInventory.expiryDate}
                      onChange={(e) => setNewInventory({ ...newInventory, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <button
                      onClick={addInventory}
                      className="w-full py-2 text-white rounded-lg text-sm gradient-btn"
                    >
                      添加
                    </button>
                  </div>
                )}
                <InventoryList items={inventory} onDelete={deleteInventory} />

                <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: '#222' }}>
                  <button
                    onClick={() => { generateMealPlan(); setMobileMenuOpen(false); }}
                    disabled={loading}
                    className="w-full text-white font-medium rounded-full gradient-btn mx-auto"
                    style={{ width: 200, height: 48 }}
                  >
                    生成一周食谱
                  </button>
                  <button
                    onClick={() => { generateShoppingList(); setMobileMenuOpen(false); }}
                    disabled={mealPlan.length === 0}
                    className="w-full py-3 text-white font-medium rounded-full mx-auto"
                    style={{ width: 200, border: '2px solid #667eea' }}
                  >
                    生成购物清单
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 min-w-0">
          <div className="fade-in">
            {viewMode === 'calendar' ? (
              <MealCalendar
                mealPlan={mealPlan}
                onUpdateMeal={updateMeal}
                onMoveMeal={moveMeal}
              />
            ) : (
              shoppingData && (
                <ShoppingList
                  categories={shoppingData.categories}
                  total={shoppingData.total}
                  saved={shoppingData.saved}
                  onTogglePurchased={togglePurchased}
                  onToggleCategory={toggleCategory}
                />
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
