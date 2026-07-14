import { TEAMS, type Team } from "./teams";

export type TeamSlot = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";

export type TeamMeta = {
  name?: string | null;
  emoji?: string | null;
  badge?: string | null;
  teamId?: string | null;
};

export type TeamNamesMap = Partial<Record<TeamSlot, TeamMeta>>;

export const SLOT_ORDER: TeamSlot[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function defaultLabel(slot: TeamSlot) {
  return `Time ${slot}`;
}

export function getTeamMeta(map: TeamNamesMap | null | undefined, slot: TeamSlot): {
  label: string;
  displayName: string;
  emoji: string | null;
  badge: string | null;
  isCustom: boolean;
} {
  const raw = (map ?? {})[slot];
  const custom = raw?.name?.trim() || null;
  return {
    label: custom || defaultLabel(slot),
    displayName: custom || defaultLabel(slot),
    emoji: raw?.emoji || null,
    badge: raw?.badge || null,
    isCustom: !!(custom || raw?.emoji || raw?.badge),
  };
}

export function searchTeams(q: string, limit = 6): Team[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const nq = norm(t);
  return TEAMS.filter((team) => norm(team.name).includes(nq)).slice(0, limit);
}

export const QUICK_EMOJIS = [
  "⚽","🔥","💥","👑","🦁","🐺","🦅","🐯","🐉","🦈",
  "⚡","🚀","🌟","💎","🏆","🥇","🎯","🛡️","⚔️","💀",
  "🇧🇷","🇦🇷","🇵🇹","🇪🇸","🇮🇹","🟢","🔵","🔴","⚫","⚪",
];
