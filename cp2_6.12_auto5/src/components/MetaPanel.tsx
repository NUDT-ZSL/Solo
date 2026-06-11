import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export default function MetaPanel() {
  const { title, description, setTitle, setDescription } = useStore();

  return (
    <div className={cn("p-4 space-y-3 border-t", "dark:border-gray-700 border-gray-200")}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Snippet title..."
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm outline-none",
          "dark:bg-dark-editor dark:text-white dark:placeholder-gray-500",
          "bg-light-editor text-gray-900 placeholder-gray-400",
          "border dark:border-gray-600 border-gray-300 focus:border-accent"
        )}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (supports Markdown)..."
        rows={2}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono",
          "dark:bg-dark-editor dark:text-white dark:placeholder-gray-500",
          "bg-light-editor text-gray-900 placeholder-gray-400",
          "border dark:border-gray-600 border-gray-300 focus:border-accent"
        )}
      />
    </div>
  );
}
