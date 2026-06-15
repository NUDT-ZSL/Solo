import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartItem, mockGetCart, mockRemoveFromCart, mockUpdateCartQuantity } from '../../shared/mockApi'
import { eventBus } from '../../shared/eventBus'
import { Artwork } from '../../shared/mockApi'

const CartModule = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const navigate = useNavigate()

  const fetchCart = useCallback(async () => {
    const items = await mockGetCart()
    setCartItems(items)
  }, [])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    const handleAddToCart = (_artwork: Artwork) => {
      fetchCart()
      setIsOpen(true)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 200)
    }

    eventBus.on('addToCart', handleAddToCart)

    return () => {
      eventBus.off('addToCart', handleAddToCart)
    }
  }, [fetchCart])

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.artwork.price * item.quantity,
    0
  )

  const handleToggleCart = () => {
    setIsOpen(!isOpen)
  }

  const handleRemoveItem = async (artworkId: string) => {
    const updatedCart = await mockRemoveFromCart(artworkId)
    setCartItems(updatedCart)
  }

  const handleUpdateQuantity = async (artworkId: string, quantity: number) => {
    if (quantity < 0) return
    const updatedCart = await mockUpdateCartQuantity(artworkId, quantity)
    setCartItems(updatedCart)
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) return
    setIsOpen(false)
    navigate('/checkout')
  }

  return (
    <>
      <button
        className={`cart-icon-btn ${isAnimating ? 'bounce' : ''}`}
        onClick={handleToggleCart}
        aria-label="购物车"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {totalItems > 0 && (
          <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>
        )}
      </button>

      {isOpen && (
        <div className="cart-overlay" onClick={handleToggleCart}>
          <div
            className={`cart-sidebar ${isOpen ? 'open' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-header">
              <h2 className="cart-title">购物车</h2>
              <button
                className="close-btn"
                onClick={handleToggleCart}
                aria-label="关闭"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <p>购物车是空的</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.artwork.id} className="cart-item">
                    <img
                      src={item.artwork.thumbnail}
                      alt={item.artwork.title}
                      className="cart-item-image"
                    />
                    <div className="cart-item-info">
                      <h3 className="cart-item-title">{item.artwork.title}</h3>
                      <p className="cart-item-price">¥{item.artwork.price}</p>
                      <div className="cart-item-quantity">
                        <button
                          className="qty-btn"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.artwork.id,
                              item.quantity - 1
                            )
                          }
                        >
                          -
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.artwork.id,
                              item.quantity + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="remove-item-btn"
                      onClick={() => handleRemoveItem(item.artwork.id)}
                      aria-label="移除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span className="total-label">合计</span>
                  <span className="total-value">¥{totalPrice.toFixed(2)}</span>
                </div>
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                >
                  去结算
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .cart-icon-btn {
          position: relative;
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: #e0e0e0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease-in-out;
        }

        .cart-icon-btn:hover {
          color: #c9a84c;
        }

        .cart-icon-btn.bounce {
          animation: cartBounce 0.2s ease-in-out;
        }

        @keyframes cartBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .cart-icon-btn svg {
          width: 24px;
          height: 24px;
        }

        .cart-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: #c9a84c;
          color: #1a1a2e;
          border-radius: 999px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cart-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cart-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 360px;
          height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .cart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #eee;
          flex-shrink: 0;
        }

        .cart-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease-in-out;
        }

        .close-btn:hover {
          color: #1a1a2e;
        }

        .close-btn svg {
          width: 20px;
          height: 20px;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .cart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #aaa;
        }

        .cart-empty svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
        }

        .cart-empty p {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          margin: 0;
        }

        .cart-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          background: #f5f5f5;
          transition: background 0.2s ease;
        }

        .cart-item:hover {
          background: #eee;
        }

        .cart-item-image {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .cart-item-info {
          flex: 1;
          min-width: 0;
        }

        .cart-item-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cart-item-price {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #c9a84c;
          margin: 0 0 8px 0;
        }

        .cart-item-quantity {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-btn {
          width: 24px;
          height: 24px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fff;
          color: #1a1a2e;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .qty-btn:hover {
          background: #c9a84c;
          border-color: #c9a84c;
          color: #fff;
        }

        .qty-value {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
          min-width: 24px;
          text-align: center;
        }

        .remove-item-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: #ccc;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }

        .remove-item-btn:hover {
          color: #e74c3c;
        }

        .remove-item-btn svg {
          width: 16px;
          height: 16px;
        }

        .cart-footer {
          padding: 20px 24px;
          border-top: 1px solid #eee;
          flex-shrink: 0;
        }

        .cart-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .total-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          color: #666;
        }

        .total-value {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #c9a84c;
        }

        .checkout-btn {
          width: 100%;
          padding: 14px;
          background: #2d3748;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .checkout-btn:hover {
          background: #3d4a5c;
        }

        @media (max-width: 768px) {
          .cart-sidebar {
            width: 100%;
            height: 100%;
            border-radius: 0;
          }
        }
      `}</style>
    </>
  )
}

export default CartModule
