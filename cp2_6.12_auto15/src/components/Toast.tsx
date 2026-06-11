import { CheckCircle, XCircle, Info } from "lucide-react";
import { useTrailStore } from "@/store/trailStore";

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const borderColorMap = {
  success: "border-l-forest-500",
  error: "border-l-red-500",
  info: "border-l-amber-500",
};

const iconColorMap = {
  success: "text-forest-500",
  error: "text-red-500",
  info: "text-amber-500",
};

export default function Toast() {
  const toasts = useTrailStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const animClass = toast.exiting
          ? "animate-scale-fade-out"
          : "animate-slide-in-right";

        return (
          <div
            key={toast.id}
            className={`glass-panel rounded-lg px-4 py-3 flex items-center gap-3 border-l-4 ${borderColorMap[toast.type]} ${animClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[toast.type]}`} />
            <span className="text-sm text-forest-800">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
