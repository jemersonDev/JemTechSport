import type { Player } from "@/components/SoccerField";

/**
 * Sorteio inteligente: distribui linha por skill (snake draft) pra equilibrar.
 * Goleiros são distribuídos um pra cada time. Excedente vira reserva.
 */
export function smartShuffle(
  players: Player[],
  teamSize: number,
): { teamA: Player[]; teamB: Player[]; reserves: Player[] } {
  const maxFieldPerTeam = teamSize - 1; // 1 vaga reservada pro goleiro

  const keepers = players.filter((p) => p.isGoalkeeper);
  const fieldPlayers = players.filter((p) => !p.isGoalkeeper);

  // Ordena linha por skill desc com pequeno embaralhamento dentro do mesmo nível
  const sorted = [...fieldPlayers]
    .map((p) => ({ p, s: (p.skill ?? 2) + Math.random() * 0.5 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  const fieldA: Player[] = [];
  const fieldB: Player[] = [];
  const fieldReserves: Player[] = [];

  // Snake draft: A,B,B,A,A,B,B,A...
  let scoreA = 0;
  let scoreB = 0;
  sorted.forEach((p) => {
    const skill = p.skill ?? 2;
    if (fieldA.length >= maxFieldPerTeam && fieldB.length >= maxFieldPerTeam) {
      fieldReserves.push(p);
      return;
    }
    if (fieldA.length >= maxFieldPerTeam) {
      fieldB.push(p);
      scoreB += skill;
      return;
    }
    if (fieldB.length >= maxFieldPerTeam) {
      fieldA.push(p);
      scoreA += skill;
      return;
    }
    // Coloca no time mais fraco; se empatado, no menor
    if (scoreA < scoreB || (scoreA === scoreB && fieldA.length <= fieldB.length)) {
      fieldA.push(p);
      scoreA += skill;
    } else {
      fieldB.push(p);
      scoreB += skill;
    }
  });

  // Goleiros: 1 pra cada lado, restante vira reserva
  const shuffledKeepers = [...keepers].sort(() => Math.random() - 0.5);
  const keeperA = shuffledKeepers[0] ? [shuffledKeepers[0]] : [];
  const keeperB = shuffledKeepers[1] ? [shuffledKeepers[1]] : [];
  const extraKeepers = shuffledKeepers.slice(2);

  return {
    teamA: [...keeperA, ...fieldA].map((p) => ({ ...p, goals: 0 })),
    teamB: [...keeperB, ...fieldB].map((p) => ({ ...p, goals: 0 })),
    reserves: [...extraKeepers, ...fieldReserves].map((p) => ({ ...p, goals: 0 })),
  };
}
