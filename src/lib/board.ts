import type { BoardSnapshot, Category, Role } from "./types";

export interface BoardQuery {
  category: Category | "all";
  hotOnly: boolean;
  q: string;
  offset: number;
  limit: number;
}

export function parseBoardQuery(params: URLSearchParams): BoardQuery {
  const category = params.get("category") ?? "Software";
  return {
    category: (["Software", "AI/ML/Data", "Quant", "Hardware", "Product", "all"].includes(category) ? category : "Software") as BoardQuery["category"],
    hotOnly: params.get("hot") !== "0",
    q: (params.get("q") ?? "").trim().slice(0, 80),
    offset: Math.max(0, Number(params.get("offset")) || 0),
    limit: Math.min(100, Math.max(1, Number(params.get("limit")) || 40)),
  };
}

export function queryBoard(board: BoardSnapshot | null, query: BoardQuery): { roles: Role[]; total: number } {
  if (!board) return { roles: [], total: 0 };
  const q = query.q.toLowerCase();
  const matches = board.roles.filter((r) => {
    if (query.category === "Software" ? !r.swe : query.category !== "all" && r.category !== query.category) return false;
    if (query.hotOnly && !r.hot) return false;
    if (q && !r.company.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)) return false;
    return true;
  });
  return { roles: matches.slice(query.offset, query.offset + query.limit), total: matches.length };
}
