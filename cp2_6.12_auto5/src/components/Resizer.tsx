import { useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export default function Resizer() {
  const setLeftWidth = useStore((s) => s.setLeftWidth);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const container = document.getElementById("main-content");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(percentage, 30), 80);
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [setLeftWidth]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "hidden md:block w-1 cursor-col-resize relative group",
        "dark:bg-gray-700 bg-gray-300",
        "hover:bg-accent active:bg-accent",
        "transition-colors duration-200"
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
