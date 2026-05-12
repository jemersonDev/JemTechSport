// Lista curada de times brasileiros e internacionais.
// Escudos servidos pelo CDN público da api-sports (sem autenticação).
export type Team = {
  id: string;
  name: string;
  country: string;
  badge: string;
};

const apiSports = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;

export const TEAMS: Team[] = [
  // 🇧🇷 Brasileirão Série A
  { id: "br-flamengo", name: "Flamengo", country: "Brasil", badge: apiSports(127) },
  { id: "br-palmeiras", name: "Palmeiras", country: "Brasil", badge: apiSports(121) },
  { id: "br-corinthians", name: "Corinthians", country: "Brasil", badge: apiSports(131) },
  { id: "br-saopaulo", name: "São Paulo", country: "Brasil", badge: apiSports(126) },
  { id: "br-santos", name: "Santos", country: "Brasil", badge: apiSports(128) },
  { id: "br-fluminense", name: "Fluminense", country: "Brasil", badge: apiSports(124) },
  { id: "br-vasco", name: "Vasco da Gama", country: "Brasil", badge: apiSports(133) },
  { id: "br-botafogo", name: "Botafogo", country: "Brasil", badge: apiSports(120) },
  { id: "br-cruzeiro", name: "Cruzeiro", country: "Brasil", badge: apiSports(135) },
  { id: "br-atleticomg", name: "Atlético Mineiro", country: "Brasil", badge: apiSports(1062) },
  { id: "br-gremio", name: "Grêmio", country: "Brasil", badge: apiSports(130) },
  { id: "br-internacional", name: "Internacional", country: "Brasil", badge: apiSports(119) },
  { id: "br-bahia", name: "Bahia", country: "Brasil", badge: apiSports(118) },
  { id: "br-fortaleza", name: "Fortaleza", country: "Brasil", badge: apiSports(154) },
  { id: "br-athleticopr", name: "Athletico Paranaense", country: "Brasil", badge: apiSports(134) },
  { id: "br-bragantino", name: "Red Bull Bragantino", country: "Brasil", badge: apiSports(794) },
  { id: "br-cuiaba", name: "Cuiabá", country: "Brasil", badge: apiSports(1193) },
  { id: "br-goias", name: "Goiás", country: "Brasil", badge: apiSports(152) },
  { id: "br-vitoria", name: "Vitória", country: "Brasil", badge: apiSports(136) },
  { id: "br-juventude", name: "Juventude", country: "Brasil", badge: apiSports(150) },
  { id: "br-criciuma", name: "Criciúma", country: "Brasil", badge: apiSports(140) },
  { id: "br-atleticogo", name: "Atlético Goianiense", country: "Brasil", badge: apiSports(132) },

  // 🇪🇸 La Liga
  { id: "es-realmadrid", name: "Real Madrid", country: "Espanha", badge: apiSports(541) },
  { id: "es-barcelona", name: "Barcelona", country: "Espanha", badge: apiSports(529) },
  { id: "es-atletico", name: "Atlético de Madrid", country: "Espanha", badge: apiSports(530) },
  { id: "es-sevilla", name: "Sevilla", country: "Espanha", badge: apiSports(536) },
  { id: "es-villarreal", name: "Villarreal", country: "Espanha", badge: apiSports(533) },
  { id: "es-valencia", name: "Valencia", country: "Espanha", badge: apiSports(532) },
  { id: "es-realsociedad", name: "Real Sociedad", country: "Espanha", badge: apiSports(548) },
  { id: "es-bilbao", name: "Athletic Bilbao", country: "Espanha", badge: apiSports(531) },

  // 🏴 Premier League
  { id: "en-mancity", name: "Manchester City", country: "Inglaterra", badge: apiSports(50) },
  { id: "en-manunited", name: "Manchester United", country: "Inglaterra", badge: apiSports(33) },
  { id: "en-liverpool", name: "Liverpool", country: "Inglaterra", badge: apiSports(40) },
  { id: "en-chelsea", name: "Chelsea", country: "Inglaterra", badge: apiSports(49) },
  { id: "en-arsenal", name: "Arsenal", country: "Inglaterra", badge: apiSports(42) },
  { id: "en-tottenham", name: "Tottenham", country: "Inglaterra", badge: apiSports(47) },
  { id: "en-newcastle", name: "Newcastle", country: "Inglaterra", badge: apiSports(34) },
  { id: "en-westham", name: "West Ham", country: "Inglaterra", badge: apiSports(48) },
  { id: "en-aston-villa", name: "Aston Villa", country: "Inglaterra", badge: apiSports(66) },

  // 🇮🇹 Serie A
  { id: "it-juventus", name: "Juventus", country: "Itália", badge: apiSports(496) },
  { id: "it-inter", name: "Inter de Milão", country: "Itália", badge: apiSports(505) },
  { id: "it-milan", name: "AC Milan", country: "Itália", badge: apiSports(489) },
  { id: "it-napoli", name: "Napoli", country: "Itália", badge: apiSports(492) },
  { id: "it-roma", name: "Roma", country: "Itália", badge: apiSports(497) },
  { id: "it-lazio", name: "Lazio", country: "Itália", badge: apiSports(487) },

  // 🇩🇪 Bundesliga
  { id: "de-bayern", name: "Bayern de Munique", country: "Alemanha", badge: apiSports(157) },
  { id: "de-dortmund", name: "Borussia Dortmund", country: "Alemanha", badge: apiSports(165) },
  { id: "de-leverkusen", name: "Bayer Leverkusen", country: "Alemanha", badge: apiSports(168) },
  { id: "de-rbleipzig", name: "RB Leipzig", country: "Alemanha", badge: apiSports(173) },

  // 🇫🇷 Ligue 1
  { id: "fr-psg", name: "Paris Saint-Germain", country: "França", badge: apiSports(85) },
  { id: "fr-marseille", name: "Olympique de Marseille", country: "França", badge: apiSports(81) },
  { id: "fr-lyon", name: "Olympique Lyonnais", country: "França", badge: apiSports(80) },
  { id: "fr-monaco", name: "Monaco", country: "França", badge: apiSports(91) },

  // 🇵🇹 Portugal
  { id: "pt-porto", name: "FC Porto", country: "Portugal", badge: apiSports(212) },
  { id: "pt-benfica", name: "Benfica", country: "Portugal", badge: apiSports(211) },
  { id: "pt-sporting", name: "Sporting CP", country: "Portugal", badge: apiSports(228) },

  // 🇳🇱 / 🇸🇦 / 🇦🇷
  { id: "nl-ajax", name: "Ajax", country: "Holanda", badge: apiSports(194) },
  { id: "ar-boca", name: "Boca Juniors", country: "Argentina", badge: apiSports(451) },
  { id: "ar-river", name: "River Plate", country: "Argentina", badge: apiSports(435) },
  { id: "sa-alnassr", name: "Al-Nassr", country: "Arábia Saudita", badge: apiSports(2939) },
  { id: "sa-alhilal", name: "Al-Hilal", country: "Arábia Saudita", badge: apiSports(2938) },

  // Seleções
  { id: "nat-brasil", name: "Seleção Brasileira", country: "Seleção", badge: apiSports(6) },
  { id: "nat-argentina", name: "Seleção Argentina", country: "Seleção", badge: apiSports(26) },
  { id: "nat-portugal", name: "Seleção de Portugal", country: "Seleção", badge: apiSports(27) },
  { id: "nat-franca", name: "Seleção da França", country: "Seleção", badge: apiSports(2) },
  { id: "nat-espanha", name: "Seleção da Espanha", country: "Seleção", badge: apiSports(9) },
];

export function findTeamById(id: string | null | undefined): Team | null {
  if (!id) return null;
  return TEAMS.find((t) => t.id === id) ?? null;
}
