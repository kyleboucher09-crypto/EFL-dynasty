export const EFL_LEAGUES = [
  {
    id: 'efl-dynasty',
    name: 'EFL Dynasty',
    shortName: 'EFL',
    sleeperLeagueId: '1313240395462742016',
    active: true,
    acceptingProspects: true,
    claimsEnabled: true,
  },
];

export function findEflLeague(id) {
  return EFL_LEAGUES.find(league => league.id === String(id || '').trim()) || null;
}
