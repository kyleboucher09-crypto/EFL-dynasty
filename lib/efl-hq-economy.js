import { randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { eflAuthPool } from './efl-auth.js';
import { ensureEflAccountSchema } from './efl-account-data.js';
import { calculateFranchiseLegacy } from './efl-legacy-engine.js';
import { findEflLeague } from './efl-leagues.js';

const CHANCES=[['Common',55],['Rare',30],['Epic',12],['Legendary',3]];
const DUPLICATES={Common:5,Rare:10,Epic:20,Legendary:40};
let cosmeticsPromise=globalThis.__eflCosmeticsPromise||null;
async function cosmetics(){if(!cosmeticsPromise){cosmeticsPromise=readFile(new URL('../legacy-cosmetics.json',import.meta.url),'utf8').then(JSON.parse).then(data=>data.items||[]);globalThis.__eflCosmeticsPromise=cosmeticsPromise;}return cosmeticsPromise;}
function rewardItem(items){const roll=randomInt(100);let cursor=0,rarity='Common';for(const [name,chance] of CHANCES){cursor+=chance;if(roll<cursor){rarity=name;break;}}const pool=items.filter(item=>item.rarity===rarity);return pool[randomInt(pool.length)]||items[randomInt(items.length)];}
function findItem(items,id){return items.find(item=>item.id===String(id||'').trim())||null;}
async function lock(client,leagueId,rosterId){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[`${leagueId}:${rosterId}`]);}
async function snapshot(client,p){
  const args=[p.league.id,p.rosterId];
  const [ledger,inventory,equipped,crates,activity]=await Promise.all([
    client.query('SELECT COALESCE(SUM(amount_ec),0)::int adjustment FROM efl_economy_ledger WHERE league_id=$1 AND roster_id=$2',args),
    client.query('SELECT cosmetic_id,acquired_via,acquired_at FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 ORDER BY acquired_at DESC',args),
    client.query('SELECT slot,cosmetic_id,updated_at FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 ORDER BY slot',args),
    client.query('SELECT win_key,reward_type,reward_cosmetic_id,reward_ec,opened_at FROM efl_victory_crate_openings WHERE league_id=$1 AND roster_id=$2 ORDER BY opened_at DESC',args),
    client.query('SELECT kind,amount_ec,cosmetic_id,created_at FROM efl_economy_ledger WHERE league_id=$1 AND roster_id=$2 ORDER BY created_at DESC LIMIT 12',args),
  ]);
  const earned=Math.floor(p.lp/10),adjustment=Number(ledger.rows[0]?.adjustment)||0,opened=new Set(crates.rows.map(row=>row.win_key)),unopened=p.victoryKeys.filter(key=>!opened.has(key));
  return {performance:{lp:p.lp,earnedCredits:earned,season:p.season,badgeCount:p.badges.length},wallet:{earned,adjustment,balance:Math.max(0,earned+adjustment)},crates:{earned:p.victoryKeys.length,opened:p.victoryKeys.length-unopened.length,unopened:unopened.length},inventory:inventory.rows.map(row=>({id:row.cosmetic_id,source:row.acquired_via,acquiredAt:row.acquired_at})),equipped:Object.fromEntries(equipped.rows.map(row=>[row.slot,row.cosmetic_id])),recentActivity:[...activity.rows.map(row=>({type:row.kind,amount:Number(row.amount_ec),itemId:row.cosmetic_id||null,at:row.created_at})),...crates.rows.filter(row=>row.reward_type==='cosmetic').slice(0,12).map(row=>({type:'crate_cosmetic',amount:0,itemId:row.reward_cosmetic_id||null,at:row.opened_at}))].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,12)};
}
async function transaction(work){const client=await eflAuthPool.connect();try{await client.query('BEGIN');const value=await work(client);await client.query('COMMIT');return value;}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}}
export async function getHqEconomy(leagueId,rosterId){await ensureEflAccountSchema();const p=await calculateFranchiseLegacy(leagueId,rosterId),client=await eflAuthPool.connect();try{return await snapshot(client,p);}finally{client.release();}}
export async function getPublicHqIdentity(leagueId,rosterId){
  const league=findEflLeague(leagueId),roster=Number(rosterId);
  if(!league?.active||!Number.isInteger(roster)||roster<1)throw Object.assign(new Error('That franchise is not available.'),{status:400});
  await ensureEflAccountSchema();
  const result=await eflAuthPool.query('SELECT slot,cosmetic_id,updated_at FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 ORDER BY slot',[league.id,roster]);
  return {leagueId:league.id,rosterId:roster,equipped:Object.fromEntries(result.rows.map(row=>[row.slot,row.cosmetic_id])),updatedAt:result.rows.reduce((latest,row)=>!latest||new Date(row.updated_at)>new Date(latest)?row.updated_at:latest,null)};
}
export async function mutateHqEconomy({leagueId,rosterId,userId,action,itemId,slot}){
  await ensureEflAccountSchema();const [p,items]=await Promise.all([calculateFranchiseLegacy(leagueId,rosterId),cosmetics()]),operation=String(action||'').trim().toLowerCase();
  return transaction(async client=>{await lock(client,p.league.id,p.rosterId);let reward=null;
    if(operation==='purchase'){
      const item=findItem(items,itemId);if(!item)throw Object.assign(new Error('That cosmetic is not in the EFL catalogue.'),{status:404});if(item.lootOnly)throw Object.assign(new Error('That cosmetic can only drop from a Victory Crate.'),{status:400});const price=Math.max(1,Math.floor(Number(item.price)||0));
      const owned=await client.query('SELECT 1 FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 AND cosmetic_id=$3',[p.league.id,p.rosterId,item.id]);if(owned.rowCount)throw Object.assign(new Error('That cosmetic is already in this franchise inventory.'),{status:409});const before=await snapshot(client,p);if(before.wallet.balance<price)throw Object.assign(new Error(`This franchise needs ${price-before.wallet.balance} more EC.`),{status:409});const reference=`purchase:${randomUUID()}`;
      await client.query("INSERT INTO efl_economy_ledger(league_id,roster_id,user_id,kind,amount_ec,cosmetic_id,reference_key,detail) VALUES($1,$2,$3,'cosmetic_purchase',$4,$5,$6,$7::jsonb)",[p.league.id,p.rosterId,userId,-price,item.id,reference,JSON.stringify({price,itemName:item.name})]);
      await client.query("INSERT INTO efl_cosmetic_inventory(league_id,roster_id,cosmetic_id,acquired_via,acquisition_key,acquired_by_user_id) VALUES($1,$2,$3,'purchase',$4,$5)",[p.league.id,p.rosterId,item.id,reference,userId]);reward={type:'purchase',itemId:item.id,itemName:item.name,price};
    }else if(operation==='open_crate'){
      const opened=await client.query('SELECT win_key FROM efl_victory_crate_openings WHERE league_id=$1 AND roster_id=$2',[p.league.id,p.rosterId]),keys=new Set(opened.rows.map(row=>row.win_key)),winKey=p.victoryKeys.find(key=>!keys.has(key));if(!winKey)throw Object.assign(new Error('This franchise has no unopened Victory Crates.'),{status:409});const item=rewardItem(items),owned=await client.query('SELECT 1 FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 AND cosmetic_id=$3',[p.league.id,p.rosterId,item.id]);
      if(owned.rowCount){const amount=DUPLICATES[item.rarity]||5;await client.query("INSERT INTO efl_victory_crate_openings(league_id,roster_id,win_key,opened_by_user_id,reward_type,reward_cosmetic_id,reward_ec) VALUES($1,$2,$3,$4,'duplicate_credit',$5,$6)",[p.league.id,p.rosterId,winKey,userId,item.id,amount]);await client.query("INSERT INTO efl_economy_ledger(league_id,roster_id,user_id,kind,amount_ec,cosmetic_id,reference_key,detail) VALUES($1,$2,$3,'crate_duplicate_credit',$4,$5,$6,$7::jsonb)",[p.league.id,p.rosterId,userId,amount,item.id,`crate:${winKey}:duplicate`,JSON.stringify({rarity:item.rarity,itemName:item.name})]);reward={type:'duplicate_credit',itemId:item.id,itemName:item.name,rarity:item.rarity,credits:amount};}
      else{await client.query("INSERT INTO efl_victory_crate_openings(league_id,roster_id,win_key,opened_by_user_id,reward_type,reward_cosmetic_id) VALUES($1,$2,$3,$4,'cosmetic',$5)",[p.league.id,p.rosterId,winKey,userId,item.id]);await client.query("INSERT INTO efl_cosmetic_inventory(league_id,roster_id,cosmetic_id,acquired_via,acquisition_key,acquired_by_user_id) VALUES($1,$2,$3,'victory_crate',$4,$5)",[p.league.id,p.rosterId,item.id,`crate:${winKey}`,userId]);reward={type:'cosmetic',itemId:item.id,itemName:item.name,rarity:item.rarity};}
    }else if(operation==='equip'){
      const item=findItem(items,itemId);if(!item)throw Object.assign(new Error('That cosmetic is not in the EFL catalogue.'),{status:404});const owned=await client.query('SELECT 1 FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 AND cosmetic_id=$3',[p.league.id,p.rosterId,item.id]);if(!owned.rowCount)throw Object.assign(new Error('Purchase or unlock that cosmetic before equipping it.'),{status:403});await client.query('INSERT INTO efl_equipped_cosmetics(league_id,roster_id,slot,cosmetic_id,equipped_by_user_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(league_id,roster_id,slot) DO UPDATE SET cosmetic_id=EXCLUDED.cosmetic_id,equipped_by_user_id=EXCLUDED.equipped_by_user_id,updated_at=NOW()',[p.league.id,p.rosterId,item.slot,item.id,userId]);reward={type:'equipped',itemId:item.id,itemName:item.name,slot:item.slot};
    }else if(operation==='unequip'){
      const cleanSlot=String(slot||'').trim();if(!items.some(item=>item.slot===cleanSlot))throw Object.assign(new Error('That cosmetic slot is not valid.'),{status:400});await client.query('DELETE FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 AND slot=$3',[p.league.id,p.rosterId,cleanSlot]);reward={type:'unequipped',slot:cleanSlot};
    }else throw Object.assign(new Error('That Franchise HQ action is not supported.'),{status:400});
    await client.query('INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,detail) VALUES($1,$2,$3,$4,$5)',[userId,`hq_${operation}`,p.league.id,p.rosterId,JSON.stringify(reward)]);return {reward,economy:await snapshot(client,p)};
  });
}
