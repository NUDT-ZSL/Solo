import { useLocation, Link } from "react-router-dom";
import { Mountain, Map, Compass, User } from "lucide-react";

const navItems = [
  { path: "/", label: "地图", icon: Map },
  { path: "/explore", label: "探索", icon: Compass },
  { path: "/profile", label: "我的", icon: User },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Mountain className="w-6 h-6 text-forest-500" />
          <span className="text-xl font-display font-bold text-forest-500 hidden sm:inline">
            TrailVerse
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);

            return (
              <Link
                key={path}
                to={path}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200
                  ${
                    isActive
                      ? "text-forest-500"
                      : "text-forest-300 hover:text-forest-500"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
