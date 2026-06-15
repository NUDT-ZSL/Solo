import { cn } from "@/lib/utils";

export default function Footer() {
  return (
    <footer
      className={cn(
        "h-10 flex items-center justify-center text-xs border-t",
        "dark:bg-dark-bg dark:text-gray-500 dark:border-gray-700",
        "bg-light-bg text-gray-400 border-gray-200"
      )}
    >
      © 2026 CodeSnap. All rights reserved.
    </footer>
  );
}
