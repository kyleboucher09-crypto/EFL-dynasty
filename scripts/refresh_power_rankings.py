import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

LEAGUE = "1313240395462742016"
BASE = "https://api.sleeper.app/v1"
SEASON = 2026
SESSION = requests.Session()
SESSION.headers["User-Agent"] = "EFL-Dynasty-Rankings/2.0"


def get(url):
    r = SESSION.get(url, timeout=45)
    r.raise_for_status()
    return r.json()


def clean_name(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def grade(n):
    return (
        "A+" if n >= 94 else "A" if n >= 90 else "A-" if n >= 86 else
        "B+" if n >= 82 else "B" if n >= 78 else "B-" if n >= 74 else
        "C+" if n >= 70 else "C" if n >= 66 else "C-" if n >= 62 else "D"
    )


def norm(values, value, lo=62, hi=100):
    vals = [float(v) for v in values]
    a, b = min(vals), max(vals)
    return 80.0 if b == a else lo + (hi - lo) * (float(value) - a) / (b - a)


def main():
    league = get(f"{BASE}/league/{LEAGUE}")
    rosters = get(f"{BASE}/league/{LEAGUE}/rosters")
    users = get(f"{BASE}/league/{LEAGUE}/users")
    players = get(f"{BASE}/players/nfl")
    state = get(f"{BASE}/state/nfl")

    season_type = str(state.get("season_type") or "").lower()
    source_week = max(1, int(state.get("week") or 1))
    week = source_week if season_type == "regular" else 1
    matchups = get(f"{BASE}/league/{LEAGUE}/matchups/{week}")

    positions = ["QB", "RB", "WR", "TE", "K", "DEF"]
    q = "&".join("position[]=" + x for x in positions)
    season_proj = get(f"https://api.sleeper.com/projections/nfl/{SEASON}?season_type=regular&{q}&order_by=pts_ppr")
    weekly_proj = get(f"https://api.sleeper.com/projections/nfl/{SEASON}/{week}?season_type=regular&{q}&order_by=pts_ppr")

    def projmap(rows):
        out = {}
        for x in rows:
            pid = x.get("player_id") or (x.get("player") or {}).get("player_id")
            if pid is not None:
                out[str(pid)] = x
        return out

    sp, wp = projmap(season_proj), projmap(weekly_proj)
    um = {u["user_id"]: u for u in users}
    scoring = league.get("scoring_settings") or {}
    slots = league.get("roster_positions") or []

    def position(p):
        return p.get("position") or ((p.get("fantasy_positions") or [""])[0])

    def eligible(slot, p):
        pos = position(p)
        if slot == pos:
            return True
        if slot == "FLEX" and pos in ("RB", "WR", "TE"):
            return True
        if slot == "SUPER_FLEX" and pos in ("QB", "RB", "WR", "TE"):
            return True
        if slot == "REC_FLEX" and pos in ("WR", "TE"):
            return True
        if slot == "WRRB_FLEX" and pos in ("WR", "RB"):
            return True
        return False

    def calc(row):
        if not row:
            return 0.0
        stats = row.get("stats") or row
        total = 0.0
        for key, multiplier in scoring.items():
            try:
                total += float(stats.get(key, 0) or 0) * float(multiplier or 0)
            except (TypeError, ValueError):
                pass
        if total > 0:
            return total
        for key in ("pts_ppr", "pts_half_ppr", "pts_std"):
            try:
                if row.get(key) is not None:
                    return float(row[key])
            except (TypeError, ValueError):
                pass
        return 0.0

    active_slots = [s for s in slots if s not in ("BN", "IR", "TAXI")]

    def lineup(roster, pm):
        pool = [
            {"id": str(pid), "p": players.get(str(pid), {}), "pts": calc(pm.get(str(pid)))}
            for pid in (roster.get("players") or [])
        ]
        starters = []
        for slot in active_slots:
            choices = sorted((x for x in pool if eligible(slot, x["p"])), key=lambda x: x["pts"], reverse=True)
            if choices:
                pick = dict(choices[0], slot=slot)
                starters.append(pick)
                pool = [x for x in pool if x["id"] != pick["id"]]
        return starters, sorted(pool, key=lambda x: x["pts"], reverse=True)

    def injury_penalty(p):
        text = " ".join([
            str(p.get("injury_status") or ""),
            str(p.get("status") or ""),
            str(p.get("practice_participation") or ""),
        ]).upper()
        if any(x in text for x in ("IR", "OUT", "PUP", "NFI", "SUSPENDED")):
            return 24
        if "DOUBTFUL" in text:
            return 14
        if "QUESTIONABLE" in text or "LIMITED" in text:
            return 6
        return 0

    def team_name(u, roster):
        return clean_name((u.get("metadata") or {}).get("team_name") or u.get("display_name") or f"Roster {roster['roster_id']}")

    def owner_name(u):
        return clean_name(u.get("display_name") or u.get("username") or "EFL Owner")

    def player_name(p):
        return clean_name(p.get("full_name") or p.get("first_name") or "Top starter")

    # Previous published ranking is the authoritative movement baseline.
    previous = {}
    data_path = Path("power-rankings-data.json")
    if data_path.exists():
        try:
            old = json.loads(data_path.read_text())
            previous = {clean_name(x["team"]): int(x["rank"]) for x in old.get("rankings", [])}
        except Exception as exc:
            print("Previous ranking baseline unavailable:", exc)

    # Recent form: use completed 2026 games when available, otherwise 2025 league results.
    current_form = {}
    if season_type == "regular" and week > 1:
        points = {}
        games = {}
        wins = {}
        for w in range(1, week):
            try:
                ms = get(f"{BASE}/league/{LEAGUE}/matchups/{w}")
            except Exception as exc:
                print(f"Week {w} result unavailable:", exc)
                continue
            groups = {}
            for m in ms:
                rid = m.get("roster_id")
                points[rid] = points.get(rid, 0.0) + float(m.get("points") or 0)
                games[rid] = games.get(rid, 0) + 1
                groups.setdefault(m.get("matchup_id"), []).append(m)
            for g in groups.values():
                if len(g) == 2:
                    a, b = g
                    ap, bp = float(a.get("points") or 0), float(b.get("points") or 0)
                    if ap > bp:
                        wins[a["roster_id"]] = wins.get(a["roster_id"], 0) + 1
                    elif bp > ap:
                        wins[b["roster_id"]] = wins.get(b["roster_id"], 0) + 1
                    else:
                        wins[a["roster_id"]] = wins.get(a["roster_id"], 0) + 0.5
                        wins[b["roster_id"]] = wins.get(b["roster_id"], 0) + 0.5
        for r in rosters:
            rid = r["roster_id"]
            if games.get(rid):
                current_form[r.get("owner_id")] = {
                    "ppg": points[rid] / games[rid],
                    "winpct": wins.get(rid, 0) / games[rid],
                    "label": f"Through Week {week - 1}",
                }

    previous_form = {}
    prev_id = league.get("previous_league_id")
    if prev_id:
        try:
            for r in get(f"{BASE}/league/{prev_id}/rosters"):
                st = r.get("settings") or {}
                gp = (st.get("wins", 0) + st.get("losses", 0) + st.get("ties", 0)) or 1
                pf = float(st.get("fpts", 0) or 0) + float(st.get("fpts_decimal", 0) or 0) / 100
                previous_form[r.get("owner_id")] = {
                    "ppg": pf / gp,
                    "winpct": (st.get("wins", 0) + 0.5 * st.get("ties", 0)) / gp,
                    "label": "Last season",
                }
        except Exception as exc:
            print("Previous-season form unavailable:", exc)

    raw = []
    for roster in rosters:
        user = um.get(roster.get("owner_id"), {})
        ss, sb = lineup(roster, sp)
        ws, wb = lineup(roster, wp)
        season_start = sum(x["pts"] for x in ss)
        week_start = sum(x["pts"] for x in ws)
        use = max(4, min(8, math.floor(max(1, len(ss)) * 0.55)))
        depth = sum(x["pts"] for x in sb[:use])
        health = max(45.0, 100.0 - sum(injury_penalty(x["p"]) for x in ws) / max(1, len(ws)) * 2.2)
        form = current_form.get(roster.get("owner_id")) or previous_form.get(roster.get("owner_id")) or {"ppg": 0, "winpct": 0.5, "label": "Recent form"}
        raw.append({
            "r": roster,
            "team": team_name(user, roster),
            "owner": owner_name(user),
            "ss": ss,
            "ws": ws,
            "bench": sb,
            "seasonStart": season_start,
            "weekStart": week_start,
            "depth": depth,
            "health": health,
            "ppg": form["ppg"],
            "winpct": form["winpct"],
            "formLabel": form["label"],
        })

    # Upcoming EFL opponent from the current Sleeper matchup pairing.
    by_roster = {x["r"]["roster_id"]: x for x in raw}
    groups = {}
    for m in matchups:
        groups.setdefault(m.get("matchup_id"), []).append(m)
    opponents = {}
    for group in groups.values():
        if len(group) == 2:
            a, b = group
            opponents[a["roster_id"]] = b["roster_id"]
            opponents[b["roster_id"]] = a["roster_id"]

    sv = [x["seasonStart"] for x in raw]
    wv = [x["weekStart"] for x in raw]
    dv = [x["depth"] for x in raw]
    ppgv = [x["ppg"] for x in raw if x["ppg"] > 0] or [1, 1]

    for x in raw:
        x["seasonN"] = norm(sv, x["seasonStart"])
        x["weekN"] = norm(wv, x["weekStart"])
        x["depthN"] = norm(dv, x["depth"])
        x["lineupN"] = 0.68 * x["seasonN"] + 0.32 * x["weekN"]
        recent = norm(ppgv, x["ppg"]) if x["ppg"] > 0 else 76.0
        x["recent"] = 0.70 * recent + 0.30 * (62 + 38 * x["winpct"])
        x["base"] = 0.45 * x["lineupN"] + 0.20 * x["depthN"] + 0.15 * x["health"] + 0.10 * x["recent"]

    bases = [x["base"] for x in raw]
    for x in raw:
        opponent = by_roster.get(opponents.get(x["r"]["roster_id"]))
        opponent_strength = norm(bases, opponent["base"]) if opponent else 80.0
        x["oppTeam"] = opponent["team"] if opponent else f"Week {week} opponent TBD"
        x["oppScore"] = 100 - (opponent_strength - 62)
        x["power"] = 0.90 * x["base"] + 0.10 * x["oppScore"]

    raw.sort(key=lambda x: x["power"], reverse=True)
    output = []
    for rank, x in enumerate(raw, 1):
        old_rank = previous.get(x["team"], rank)
        delta = old_rank - rank
        movement = "up" if delta > 0 else "down" if delta < 0 else "hold"
        movement_icon = {
            "up": "Assets/trending-up.svg",
            "down": "Assets/trending-down.svg",
            "hold": "Assets/trending-hold.svg",
        }[movement]
        movement_label = f"Up {delta}" if delta > 0 else f"Down {abs(delta)}" if delta < 0 else "No change"

        stars = sorted(x["ws"], key=lambda z: z["pts"], reverse=True)[:3]
        star_names = [player_name(z["p"]) for z in stars]
        injured = [z for z in x["ws"] if injury_penalty(z["p"]) > 0]
        star_text = ", ".join(star_names[:2]) + (f" and {star_names[2]}" if len(star_names) > 2 else "") if star_names else "a balanced starting group"
        depth_text = "one of the league’s deeper benches" if x["depthN"] >= 86 else "solid usable depth" if x["depthN"] >= 76 else "a thinner bench that leaves less margin for error"
        health_text = f"Availability risk is concentrated around {', '.join(player_name(z['p']) for z in injured[:2])}." if injured else "The primary starters have a relatively clean availability profile right now."
        recent_text = f"{x['formLabel']} checks in at {x['ppg']:.1f} points per game" if x["ppg"] else "There is limited completed-game form to lean on yet"
        opponent_text = "favorable" if x["oppScore"] >= 84 else "demanding" if x["oppScore"] < 72 else "fairly neutral"

        article = (
            f"{x['team']} lands at No. {rank} behind a projected core led by {star_text}, with the optimized starting lineup grading {grade(x['lineupN'])} for Week {week} and the full-season outlook. "
            f"The roster carries {depth_text}; {health_text} "
            f"{recent_text}, while the upcoming matchup against {x['oppTeam']} grades as a {opponent_text} opponent test."
        )

        output.append({
            "rank": rank,
            "previous_rank": old_rank,
            "movement": movement,
            "movement_label": movement_label,
            "movement_icon": movement_icon,
            "team": x["team"],
            "owner": x["owner"],
            "power": round(x["power"], 1),
            "lineup_grade": grade(x["lineupN"]),
            "depth_grade": grade(x["depthN"]),
            "health_grade": grade(x["health"]),
            "recent_grade": grade(x["recent"]),
            "opponent_grade": grade(x["oppScore"]),
            "opponent": x["oppTeam"],
            "stars": star_names,
            "article": article,
        })

    generated = datetime.now(timezone.utc).isoformat()
    payload = {
        "generated_at": generated,
        "season": SEASON,
        "week": week,
        "source_week": source_week,
        "season_type": season_type,
        "rankings": output,
    }
    data_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    Path("power-rankings-prev.json").write_text(json.dumps({"rankings": [{"team": x["team"], "rank": x["rank"]} for x in output]}, indent=2, ensure_ascii=False) + "\n")

    # Touch the page itself with a machine-readable freshness stamp while preserving the current design.
    html_path = Path("power-rankings.html")
    html = html_path.read_text()
    meta = f'<meta name="efl-power-rankings-updated" content="{generated}">'
    if re.search(r'<meta name="efl-power-rankings-updated" content="[^"]*">', html):
        html = re.sub(r'<meta name="efl-power-rankings-updated" content="[^"]*">', meta, html, count=1)
    else:
        html = html.replace("</head>", meta + "\n</head>", 1)
    html = re.sub(r'Week \d+ refresh · movement vs\. previous published ranking', f'Week {week} refresh · movement vs. previous published ranking', html)
    html_path.write_text(html)

    print(json.dumps({"week": week, "generated_at": generated, "rankings": [{"rank": x["rank"], "team": x["team"], "power": x["power"], "movement": x["movement_label"]} for x in output]}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
