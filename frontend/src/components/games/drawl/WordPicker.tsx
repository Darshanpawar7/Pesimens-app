import { Pencil } from "lucide-react";

export interface WordPickerProps {
  open?: boolean;
  words?: [string, string, string] | string[];
  onPick?: (word: string) => void;
}

export function WordPicker({
  open = true,
  words = ["mountain", "spaceship", "guitar"],
  onPick,
}: WordPickerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2 text-white">
          <Pencil className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold">Pick a word to draw</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {words.slice(0, 3).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onPick?.(w)}
              className="group rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-4 py-6 text-center transition hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-indigo-500/5"
            >
              <span className="block text-lg font-semibold text-white group-hover:text-indigo-300">
                {w}
              </span>
              <span className="mt-1 block text-xs text-white/40">
                {w.length} letters
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WordPicker;
