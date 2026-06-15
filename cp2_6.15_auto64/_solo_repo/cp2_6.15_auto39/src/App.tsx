import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import RecipeModule from './RecipeModule';
import GroceryModule from './GroceryModule';

export default function App() {
  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div className="nav-title">🍳 虚拟厨房</div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            菜谱管理
          </NavLink>
          <NavLink to="/grocery" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            购物清单
          </NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<RecipeModule />} />
        <Route path="/recipe/:id" element={<RecipeModule />} />
        <Route path="/grocery" element={<GroceryModule />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
