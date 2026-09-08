# EFL Franchise HQ — New Chat Handoff

Updated: September 8, 2026

## Resume instruction

Continue the EFL Dynasty Franchise HQ build from this handoff. Use the remote `franchise-hq-economy` branch as the source of truth, preserve the existing authenticated economy, and continue expanding the premium cosmetic catalog from 52 to 120 pieces without introducing placeholder, emoji, Common-tier, or achievement-like cosmetic badges.

## Project and deployment

- Repository: `kyleboucher09-crypto/EFL-dynasty`
- Pull request: `#7`
- Working remote branch: `franchise-hq-economy`
- Latest remote commit at handoff: `92fb196f56638bb07897c85e8a87009ebdcc8e09`
- Stable preview: `https://efldynastyv5championfi-git-aff137-elite-fantasy-football-league.vercel.app/franchise-hq-v2.html`
- Vercel project: `efl_dynasty_v5_champion_first`
- Latest deployment was READY with no build or runtime errors.
- The remote branch is the source of truth. Local commit SHAs differ because previous updates were published through the GitHub API.

## Current completed system

- Professional sign-in and approved-franchise authorization are integrated into the shared EFL header.
- Franchise HQ uses the same site header and navigation as the rest of the website.
- Authenticated server-backed EFL Credits, purchases, inventory, equipped cosmetics, activity history, commissioner adjustments, and Victory Crates are working.
- Official Sleeper wins create Victory Crates. Commissioner test crates and forced-duplicate test crates are supported.
- Duplicate rewards convert to EFL Credits according to rarity.
- The cosmetic preview, purchase, equip, unequip, inventory, and activity flows are live.
- Equipped stadiums, entrance banners, crest frames, display collectibles, and the black/gold locker nameplate visibly apply to the Franchise HQ.
- Victory Crates now have an animated opening sequence. The exact earned item artwork rises out of the crate with its name and rarity. Duplicate rewards use the same visual reveal before showing the Credit conversion.

## Cosmetic catalog state

- Catalog file: `legacy-cosmetics.json`
- Catalog version: `6`
- Active premium items: `52`
- Target: `120`
- Remaining: `68`
- Every active entry currently has `premium: true` and a real raster `asset`.
- Active slots: stadium, banner, frame, collectible, and nameplate.
- Active rarities: Rare, Epic, and Legendary only.
- No active Common cosmetics.
- No active `badgeEffect` cosmetic slot.

Current collection counts:

- Sunday Night Royalty: 3
- Frozen Fortress: 10
- Golden Hour: 1
- Equipment Vault: 5
- Crest Atelier: 10
- Locker Identity: 1
- Replica Room: 9
- Helmet Vault: 8
- Owner Jewelry: 5

## User-created artwork already integrated

The user uploaded 34 files named `EFL-RWD-*`. One Carbon Fibre Crown file was a duplicate, so 33 unique graphics were optimized to WebP and integrated:

- 10 crest accessories
- 8 football helmets
- 5 owner rings
- 5 decorative crown replicas
- 2 decorative trophy replicas
- 2 star display collectibles
- 1 black-and-gold locker nameplate

Optimized files are in `Assets/cosmetics/premium/user-created/`.

The crown, trophy, and star graphics were deliberately renamed as replicas or display collectibles. They must never imply that an owner earned an official EFL championship, trophy, rank, or achievement.

## Non-negotiable product rules

1. Cosmetics personalize Franchise HQ only. They never modify or represent official Legacy ranks, achievement badges, championships, trophies, standings, scores, or Sleeper results.
2. Do not restore the previous 122-item prototype catalog. It was removed because most pieces were emoji-based, generic, or low quality.
3. The final 120 must all meet the premium standard shown by Frozen Fortress and the user's uploaded artwork.
4. Every cosmetic must have real, image-backed artwork. No emoji icons, CSS-only representational art, filler, or unresolved placeholders.
5. Use coordinated football collections rather than random one-off graphics.
6. Prefer stadiums, tunnels, locker rooms, equipment, helmets, game balls, cleats, rings, display memorabilia, crest frames, nameplates, and other franchise-identity pieces.
7. Avoid badge, medal, rank patch, or official-trophy silhouettes unless the item is unmistakably labelled and presented as a decorative replica.
8. Preserve the site's premium navy/blue/gold visual language. Additional team-identity colors can appear inside optional cosmetics. Avoid making purple the dominant site color.
9. Victory Crates are earned, not sold. Legendary items may remain crate-exclusive.
10. No owner should be pre-granted the new catalog. Ownership must come from purchase, crate reward, or an explicit commissioner action.

## Recommended remaining catalog architecture

Build the remaining 68 as complete football identity collections, with each collection mixing:

- home stadium scenes
- player entrance tunnels or banners
- franchise crest frames
- locker/nameplate treatments where appropriate
- premium football memorabilia and collectibles

Useful future themes include Blackout, Golden Hour, Rivalry Night, Gridiron Heritage, Draft War Room, Storm Front, Championship Red Zone, and equipment-vault variations. Do not use a rigid quota if a stronger collection composition is available, but keep the total balanced across usable HQ slots.

## Important source files

- `legacy-cosmetics.json` — active cosmetic catalog
- `franchise-hq-v2.html` — HQ page and shared shell
- `franchise-hq-v2.js` — owner data, economy loading, Victory Crate interaction, animated reveal
- `franchise-hq-shop-v2.js` — cosmetic shop, preview, purchase/equip UI
- `franchise-hq-shop-v2.css` — catalog and live preview styling
- `franchise-hq-economy.css` — economy UI, equipped layers, crate reveal animation
- `lib/efl-hq-economy.js` — server-authoritative wallet, purchase, crate, duplicate, and equip logic
- `Assets/cosmetics/premium/` — generated premium artwork
- `Assets/cosmetics/premium/user-created/` — user-created artwork already integrated

## Verification expectations

Before publishing each batch:

- validate `legacy-cosmetics.json`
- verify unique item IDs
- verify every asset path exists
- verify no active item uses Common rarity or `badgeEffect`
- run JavaScript syntax checks and `git diff --check`
- publish only task-related files
- verify the Vercel deployment reaches READY
- check build errors and runtime errors

## Local safety note

If the previous scratch checkout is reused, preserve the unrelated user-modified file `1787346056841-ec2d7253-f982-4f45-a043-d96024c8acd9.png`. Do not stage, overwrite, or revert it.

