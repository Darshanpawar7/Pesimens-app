import { Crown } from "lucide-react";

export interface Player {
  id: string;
  name: string;
  score: number;
  isDrawer?: boolean;
  isYou?: boolean;
}

export interface PlayerListProps {
  players?: Player[];
}

export function PlayerList({ players = [] }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a]">
      <div className="border-b border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/80">
        Players <span className="text-white/40">({players.length})</span>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
              p.isYou ? "bg-indigo-500/10" : ""
            }`}
          >
            <span className="w-5 text-center text-xs text-white/40">{i + 1}</span>
            <span className="flex-1 truncate text-white/90">
              {p.name}
              {p.isYou && <span className="ml-1 text-xs text-indigo-400">(you)</span>}
            </span>
            {p.isDrawer && <Crown className="h-4 w-4 text-yellow-400" />}
            <span className="tabular-nums text-white/70">{p.score}</span>
          </li>
        ))}
        {players.length === 0 && (
          <li className="px-2 py-2 text-xs text-white/30">Waiting for players…</li>
        )}
      </ul>
    </div>
  );
}

export default PlayerList;
