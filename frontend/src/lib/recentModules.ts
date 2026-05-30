export interface RecentModule {
  name: string;
  path: string;
}

const KEY = "recentModules";

export function addRecentModule(name: string, path: string) {
  const existing: RecentModule[] = JSON.parse(
    localStorage.getItem(KEY) || "[]"
  );

  const filtered = existing.filter(
    (item) => item.path !== path
  );

  filtered.unshift({ name, path });

  localStorage.setItem(
    KEY,
    JSON.stringify(filtered.slice(0, 5))
  );
}

export function getRecentModules(): RecentModule[] {
  return JSON.parse(
    localStorage.getItem(KEY) || "[]"
  );
}