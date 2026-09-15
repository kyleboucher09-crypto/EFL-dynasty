import json
from datetime import datetime, timezone
import requests

LEAGUE_ID = "1313240395462742016"
BASE = "https://api.sleeper.app/v1"


def get(path):
    r = requests.get(f"{BASE}{path}", timeout=30)
    r.raise_for_status()
    return r.json()


def team_name(user):
    meta = (user or {}).get("metadata") or {}
    return meta.get("team_name") or (user or {}).get("display_name") or "Unknown"


def iso_ms(value):
    if not value:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()

state = get("/state/nfl")
league = get(f"/league/{LEAGUE_ID}")
users = get(f"/league/{LEAGUE_ID}/users")
rosters = get(f"/league/{LEAGUE_ID}/rosters")

users_by_id = {u.get("user_id"): u for u in users}
team_by_roster = {}
for roster in rosters:
    rid = roster.get("roster_id")
    owner = users_by_id.get(roster.get("owner_id"))
    team_by_roster[rid] = team_name(owner)

current_week = int(state.get("week") or 1)
completed_week = max(1, current_week - 1)
matchups = get(f"/league/{LEAGUE_ID}/matchups/{completed_week}")

groups = {}
for row in matchups:
    mid = row.get("matchup_id")
    groups.setdefault(mid, []).append(row)

matchup_summary = []
for mid, rows in sorted(groups.items(), key=lambda x: (x[0] is None, x[0])):
    teams = []
    for row in sorted(rows, key=lambda r: r.get("roster_id") or 0):
        rid = row.get("roster_id")
        teams.append({
            "roster_id": rid,
            "team": team_by_roster.get(rid, f"Roster {rid}"),
            "points": row.get("points"),
        })
    matchup_summary.append({"matchup_id": mid, "teams": teams})

raw_transactions = []
for week in sorted(set([completed_week, current_week])):
    try:
        rows = get(f"/league/{LEAGUE_ID}/transactions/{week}")
    except Exception:
        rows = []
    for tx in rows:
        if tx.get("status") == "complete":
            tx = dict(tx)
            tx["sleeper_week"] = week
            raw_transactions.append(tx)

player_ids = set()
for tx in raw_transactions:
    for bucket in (tx.get("adds") or {}, tx.get("drops") or {}):
        player_ids.update(bucket.keys())

players = {}
if player_ids:
    all_players = get("/players/nfl")
    for pid in player_ids:
        p = all_players.get(pid) or {}
        players[pid] = p.get("full_name") or p.get("first_name") or pid

transactions = []
for tx in sorted(raw_transactions, key=lambda x: x.get("created") or 0):
    adds = []
    for pid, rid in (tx.get("adds") or {}).items():
        adds.append({"player": players.get(pid, pid), "team": team_by_roster.get(rid, f"Roster {rid}")})
    drops = []
    for pid, rid in (tx.get("drops") or {}).items():
        drops.append({"player": players.get(pid, pid), "team": team_by_roster.get(rid, f"Roster {rid}")})
    picks = []
    for pick in tx.get("draft_picks") or []:
        picks.append({
            "season": pick.get("season"),
            "round": pick.get("round"),
            "from": team_by_roster.get(pick.get("roster_id"), pick.get("roster_id")),
            "to": team_by_roster.get(pick.get("owner_id"), pick.get("owner_id")),
        })
    transactions.append({
        "transaction_id": tx.get("transaction_id"),
        "type": tx.get("type"),
        "status": tx.get("status"),
        "sleeper_week": tx.get("sleeper_week"),
        "created": iso_ms(tx.get("created")),
        "teams": [team_by_roster.get(rid, f"Roster {rid}") for rid in (tx.get("roster_ids") or [])],
        "adds": adds,
        "drops": drops,
        "draft_picks": picks,
        "waiver_bid": ((tx.get("settings") or {}).get("waiver_bid")),
    })

standings = []
for roster in rosters:
    s = roster.get("settings") or {}
    rid = roster.get("roster_id")
    standings.append({
        "roster_id": rid,
        "team": team_by_roster.get(rid, f"Roster {rid}"),
        "wins": s.get("wins"),
        "losses": s.get("losses"),
        "ties": s.get("ties"),
        "fpts": (s.get("fpts") or 0) + (s.get("fpts_decimal") or 0) / 100,
        "fpts_against": (s.get("fpts_against") or 0) + (s.get("fpts_against_decimal") or 0) / 100,
    })

snapshot = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "league_id": LEAGUE_ID,
    "league_name": league.get("name"),
    "season": league.get("season"),
    "nfl_state": {
        "week": state.get("week"),
        "season_type": state.get("season_type"),
        "season": state.get("season"),
    },
    "completed_week": completed_week,
    "matchups": matchup_summary,
    "standings": standings,
    "transactions": transactions,
}

print("NEWSROOM_SNAPSHOT_START")
print(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")))
print("NEWSROOM_SNAPSHOT_END")
