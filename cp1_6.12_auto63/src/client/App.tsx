import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import InventoryGrid from './components/InventoryGrid.js'
import ShoppingList from './components/ShoppingList.js'

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  expiryDate: string
  createdAt: number
}

export interface ShoppingItem {
  id: string
  itemId: string
  name: string
  quantity: number
  unit: string
  checked: boolean
  currentStock: number
  createdAt: number
}

type Page = 'inventory' | 'shopping'

function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

function App() {
  const [page, setPage] = useState<Page>('inventory')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/items')
    const data: InventoryItem[] = await res.json()
    setItems(data)
  }, [])

  const fetchShoppingList = useCallback(async () => {
    const res = await fetch('/api/shopping-list')
    const data: ShoppingItem[] = await res.json()
    setShoppingItems(data)
  }, [])

  const debouncedFetchItems = useDebounce(fetchItems, 100)
  const debouncedFetchShopping = useDebounce(fetchShoppingList, 100)

  useEffect(() => {
    fetchItems()
    fetchShoppingList()
  }, [fetchItems, fetchShoppingList])

  useEffect(() => {
    if (page === 'inventory') debouncedFetchItems()
    else debouncedFetchShopping()
  }, [page, debouncedFetchItems, debouncedFetchShopping])

  return (
    <div className="app">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body, html, #root {
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
          color: #fff;
          contain: layout style;
        }

        .nav {
          display: flex;
          gap: 8px;
          max-width: 1200px;
          margin: 0 auto 32px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          contain: layout paint;
        }

        .nav-btn {
          flex: 1;
          padding: 12px 24px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.75);
          font-size: 15px;
          font-weight: 500;
          border-radius: 12px;
          cursor: pointer;
          transition: transform ease-out 200ms, background ease-out 200ms,
            box-shadow ease-out 200ms, color ease-out 200ms;
          position: relative;
        }

        .nav-btn:hover {
          transform: translateY(-2px);
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .nav-btn.active {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          contain: layout paint;
        }

        .page-title {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }

        @keyframes pulse-red {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
            max-height: 200px;
            margin-bottom: 14px;
            padding-top: 18px;
            padding-bottom: 18px;
          }
          to {
            opacity: 0;
            transform: translateX(20px);
            max-height: 0;
            margin-bottom: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 768px) {
          .app {
            padding: 16px;
          }

          .page-title {
            font-size: 22px;
          }

          .nav {
            margin-bottom: 20px;
          }

          .nav-btn {
            padding: 10px 16px;
            font-size: 14px;
          }
        }
      `}</style>

      <nav className="nav" role="navigation" aria-label="主导航">
        <button
          className={`nav-btn ${page === 'inventory' ? 'active' : ''}`}
          onClick={() => setPage('inventory')}
          aria-pressed={page === 'inventory'}
        >
          库存页
        </button>
        <button
          className={`nav-btn ${page === 'shopping' ? 'active' : ''}`}
          onClick={() => setPage('shopping')}
          aria-pressed={page === 'shopping'}
        >
          购物清单
        </button>
      </nav>

      <div className="page-container">
        {page === 'inventory' ? (
          <InventoryGrid
            items={items}
            onItemsChange={fetchItems}
            onShoppingListChange={fetchShoppingList}
          />
        ) : (
          <ShoppingList
            items={shoppingItems}
            onItemsChange={() => {
              fetchShoppingList()
              fetchItems()
            }}
          />
        )}
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

export default App
