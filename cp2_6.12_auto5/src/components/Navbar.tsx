import { Code2, Plus, Sun, Moon } from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { theme, toggleTheme, resetCode } = useStore();

  return (
    <nav
      className={cn(
        "h-14 flex items-center justify-between px-6 border-b z-50",
        "dark:bg-dark-navbar dark:border-gray-700",
        "bg-light-navbar border-gray-200"
      )}
    >
      <div className="flex items-center gap-2">
        <Code2 className="w-6 h-6 dark:text-accent text-blue-600" />
        <span className="text-lg font-bold dark:text-white text-gray-900">CodeSnap</span>
      </div>

      <button
        onClick={resetCode}
        className={cn(
          "btn-scale flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
          "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
          "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        <Plus className="w-4 h-4" />
        New Snippet
      </button>

      <button
        onClick={toggleTheme}
        className={cn(
          "btn-scale flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
          "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </nav>
  );
}
