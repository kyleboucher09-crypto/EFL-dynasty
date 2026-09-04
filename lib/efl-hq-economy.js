import { randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { eflAuthPool } from './efl-auth.js';
import { ensureEflAccountSchema } from './efl-account-data.js';
import { calculateFranchiseLegacy, calculateLeagueLegacy } from './efl-legacy-engine.js';
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
  const [ledger,inventory,equipped,crates,activity,testCrates]=await Promise.all([
    client.query('SELECT COALESCE(SUM(amount_ec),0)::int adjustment FROM efl_economy_ledger WHERE league_id=$1 AND roster_id=$2',args),
    client.query('SELECT cosmetic_id,acquired_via,acquired_at FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 ORDER BY acquired_at DESC',args),
    client.query('SELECT slot,cosmetic_id,updated_at FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 ORDER BY slot',args),
    client.query('SELECT win_key,reward_type,reward_cosmetic_id,reward_ec,opened_at FROM efl_victory_crate_openings WHERE league_id=$1 AND roster_id=$2 ORDER BY opened_at DESC',args),
    client.query('SELECT kind,amount_ec,cosmetic_id,detail,created_at FROM efl_economy_ledger WHERE league_id=$1 AND roster_id=$2 ORDER BY created_at DESC LIMIT 12',args),
    client.query("SELECT COUNT(*) FILTER (WHERE status='ready')::int ready FROM efl_test_crates WHERE league_id=$1 AND roster_id=$2",args),
  ]);
  const earned=Math.floor(p.lp/10),adjustment=Number(ledger.rows[0]?.adjustment)||0,opened=new Set(crates.rows.map(row=>row.win_key)),unopened=p.victoryKeys.filter(key=>!opened.has(key));
  return {performance:{lp:p.lp,earnedCredits:earned,season:p.season,badgeCount:p.badges.length},wallet:{earned,adjustment,balance:Math.max(0,earned+adjustment)},crates:{earned:p.victoryKeys.length,opened:p.victoryKeys.length-unopened.length,unopened:unopened.length,testReady:Number(testCrates.rows[0]?.ready)||0},inventory:inventory.rows.map(row=>({id:row.cosmetic_id,source:row.acquired_via,acquiredAt:row.acquired_at})),equipped:Object.fromEntries(equipped.rows.map(row=>[row.slot,row.cosmetic_id])),recentActivity:[...activity.rows.map(row=>({type:row.kind,amount:Number(row.amount_ec),itemId:row.cosmetic_id||null,detail:row.detail||{},at:row.created_at})),...crates.rows.filter(row=>row.reward_type==='cosmetic').slice(0,12).map(row=>({type:'crate_cosmetic',amount:0,itemId:row.reward_cosmetic_id||null,detail:{test:String(row.win_key).startsWith('test:')},at:row.opened_at}))].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,12)};
}
async function transaction(work){const client=await eflAuthPool.connect();try{await client.query('BEGIN');const value=await work(client);await client.query('COMMIT');return value;}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}}
export async function getHqEconomy(leagueId,rosterId){await ensureEflAccountSchema();const p=await calculateFranchiseLegacy(leagueId,rosterId),client=await eflAuthPool.connect();try{return await snapshot(client,p);}finally{client.release();}}
export async function adjustHqCredits({leagueId,rosterId,userId,amount,note}){
  await ensureEflAccountSchema();
  const delta=Number(amount),reason=String(note||'').trim();
  if(!Number.isInteger(delta)||delta===0||Math.abs(delta)>500)throw Object.assign(new Error('Enter a whole-number Credit adjustment between -500 and 500.'),{status:400});
  if(reason.length<4||reason.length>180)throw Object.assign(new Error('Add a brief reason between 4 and 180 characters.'),{status:400});
  const p=await calculateFranchiseLegacy(leagueId,rosterId);
  return transaction(async client=>{
    await lock(client,p.league.id,p.rosterId);
    const before=await snapshot(client,p),nextBalance=before.wallet.balance+delta;
    if(nextBalance<0)throw Object.assign(new Error(`This adjustment would reduce the franchise below 0 EC. The current balance is ${before.wallet.balance} EC.`),{status:409});
    const reference=`commissioner-adjustment:${randomUUID()}`;
    const detail={note:reason,balanceBefore:before.wallet.balance,balanceAfter:nextBalance};
    await client.query("INSERT INTO efl_economy_ledger(league_id,roster_id,user_id,kind,amount_ec,reference_key,detail) VALUES($1,$2,$3,'commissioner_adjustment',$4,$5,$6::jsonb)",[p.league.id,p.rosterId,userId,delta,reference,JSON.stringify(detail)]);
    await client.query('INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,detail) VALUES($1,$2,$3,$4,$5)',[userId,'hq_commissioner_credit_adjustment',p.league.id,p.rosterId,JSON.stringify({amount:delta,...detail})]);
    return {reward:{type:'commissioner_adjustment',amount:delta,note:reason},economy:await snapshot(client,p)};
  });
}
export async function grantHqTestCrate({leagueId,rosterId,userId,note,forceDuplicate=false}){
  await ensureEflAccountSchema();
  const reason=String(note||'').trim();
  if(reason.length<4||reason.length>180)throw Object.assign(new Error('Add a brief test-crate reason between 4 and 180 characters.'),{status:400});
  const [p,items]=await Promise.all([calculateFranchiseLegacy(leagueId,rosterId),cosmetics()]);
  return transaction(async client=>{
    await lock(client,p.league.id,p.rosterId);
    const existing=await client.query("SELECT 1 FROM efl_test_crates WHERE league_id=$1 AND roster_id=$2 AND status='ready' LIMIT 1",[p.league.id,p.rosterId]);
    if(existing.rowCount)throw Object.assign(new Error('This franchise already has a Commissioner test crate ready.'),{status:409});
    let forcedCosmeticId=null,forcedItem=null;
    if(forceDuplicate){const owned=await client.query('SELECT cosmetic_id FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 ORDER BY acquired_at DESC',[p.league.id,p.rosterId]);const rarityWeight={Common:1,Rare:2,Epic:3,Legendary:4};forcedItem=owned.rows.map(row=>findItem(items,row.cosmetic_id)).filter(Boolean).sort((a,b)=>(rarityWeight[b.rarity]||0)-(rarityWeight[a.rarity]||0))[0]||null;if(!forcedItem)throw Object.assign(new Error('This franchise must own a cosmetic before a duplicate test crate can be granted.'),{status:409});forcedCosmeticId=forcedItem.id;}
    const id=randomUUID();
    await client.query("INSERT INTO efl_test_crates(id,league_id,roster_id,status,granted_by_user_id,grant_note,forced_cosmetic_id) VALUES($1,$2,$3,'ready',$4,$5,$6)",[id,p.league.id,p.rosterId,userId,reason,forcedCosmeticId]);
    await client.query('INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,detail) VALUES($1,$2,$3,$4,$5)',[userId,forceDuplicate?'hq_commissioner_duplicate_test_crate_grant':'hq_commissioner_test_crate_grant',p.league.id,p.rosterId,JSON.stringify({testCrateId:id,note:reason,forcedCosmeticId,forcedItemName:forcedItem?.name||null})]);
    return {reward:{type:forceDuplicate?'commissioner_duplicate_test_crate':'commissioner_test_crate',note:reason,itemId:forcedCosmeticId,itemName:forcedItem?.name||null},economy:await snapshot(client,p)};
  });
}
export async function getPublicHqIdentity(leagueId,rosterId){
  const league=findEflLeague(leagueId),roster=Number(rosterId);
  if(!league?.active||!Number.isInteger(roster)||roster<1)throw Object.assign(new Error('That franchise is not available.'),{status:400});
  await ensureEflAccountSchema();
  const result=await eflAuthPool.query('SELECT slot,cosmetic_id,updated_at FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 ORDER BY slot',[league.id,roster]);
  return {leagueId:league.id,rosterId:roster,equipped:Object.fromEntries(result.rows.map(row=>[row.slot,row.cosmetic_id])),updatedAt:result.rows.reduce((latest,row)=>!latest||new Date(row.updated_at)>new Date(latest)?row.updated_at:latest,null)};
}
export async function getCommissionerEconomyOverview(leagueId){
  await ensureEflAccountSchema();
  const legacy=await calculateLeagueLegacy(leagueId),league=legacy.league;
  const [ledger,inventory,equipped,crates,managers,testCrates]=await Promise.all([
    eflAuthPool.query('SELECT roster_id,COALESCE(SUM(amount_ec),0)::int adjustment,MAX(created_at) latest_at FROM efl_economy_ledger WHERE league_id=$1 GROUP BY roster_id',[league.id]),
    eflAuthPool.query('SELECT roster_id,COUNT(*)::int item_count,MAX(acquired_at) latest_at FROM efl_cosmetic_inventory WHERE league_id=$1 GROUP BY roster_id',[league.id]),
    eflAuthPool.query('SELECT roster_id,COUNT(*)::int equipped_count,MAX(updated_at) latest_at FROM efl_equipped_cosmetics WHERE league_id=$1 GROUP BY roster_id',[league.id]),
    eflAuthPool.query('SELECT roster_id,ARRAY_AGG(win_key) opened_keys,MAX(opened_at) latest_at FROM efl_victory_crate_openings WHERE league_id=$1 GROUP BY roster_id',[league.id]),
    eflAuthPool.query('SELECT o.roster_id,o.approved_at,p.display_name FROM efl_franchise_owners o LEFT JOIN efl_profiles p ON p.user_id=o.user_id WHERE o.league_id=$1',[league.id]),
    eflAuthPool.query("SELECT roster_id,COUNT(*) FILTER (WHERE status='ready')::int ready FROM efl_test_crates WHERE league_id=$1 GROUP BY roster_id",[league.id]),
  ]);
  const index=rows=>new Map(rows.map(row=>[Number(row.roster_id),row])),ledgerBy=index(ledger.rows),inventoryBy=index(inventory.rows),equippedBy=index(equipped.rows),cratesBy=index(crates.rows),managerBy=index(managers.rows),testCratesBy=index(testCrates.rows);
  const levels=[...(legacy.config?.levels||[])].sort((a,b)=>Number(a.lp)-Number(b.lp));
  return {league:{id:league.id,name:league.name,season:Number(legacy.current?.league?.season)||null},franchises:legacy.owners.map(owner=>{const rosterId=Number(owner.roster?.roster_id),lp=Math.max(0,Math.floor(Number(owner.lp)||0)),earned=Math.floor(lp/10),adjustment=Number(ledgerBy.get(rosterId)?.adjustment)||0,earnedKeys=new Set(owner.victoryKeys),openedKeys=new Set(cratesBy.get(rosterId)?.opened_keys||[]),opened=[...openedKeys].filter(key=>earnedKeys.has(key)).length,earnedCrates=earnedKeys.size,manager=managerBy.get(rosterId),rank=levels.filter(level=>lp>=Number(level.lp)).at(-1)||levels[0]||null;return {rosterId,franchiseName:owner.user?.metadata?.team_name||owner.user?.display_name||`Roster ${rosterId}`,rank:rank?.name||'Prospect',lp,wallet:{earned,adjustment,balance:Math.max(0,earned+adjustment)},crates:{earned:earnedCrates,opened,unopened:Math.max(0,earnedCrates-opened),testReady:Number(testCratesBy.get(rosterId)?.ready)||0},inventoryCount:Number(inventoryBy.get(rosterId)?.item_count)||0,equippedCount:Number(equippedBy.get(rosterId)?.equipped_count)||0,manager:{approved:Boolean(manager),displayName:manager?.display_name||null,approvedAt:manager?.approved_at||null},latestActivityAt:[ledgerBy.get(rosterId)?.latest_at,inventoryBy.get(rosterId)?.latest_at,equippedBy.get(rosterId)?.latest_at,cratesBy.get(rosterId)?.latest_at].filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0]||null};}).sort((a,b)=>b.lp-a.lp||a.franchiseName.localeCompare(b.franchiseName))};
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
      const opened=await client.query('SELECT win_key FROM efl_victory_crate_openings WHERE league_id=$1 AND roster_id=$2',[p.league.id,p.rosterId]),keys=new Set(opened.rows.map(row=>row.win_key)),test=await client.query("SELECT id,forced_cosmetic_id FROM efl_test_crates WHERE league_id=$1 AND roster_id=$2 AND status='ready' ORDER BY granted_at LIMIT 1 FOR UPDATE SKIP LOCKED",[p.league.id,p.rosterId]);let testCrate=test.rows[0]||null,winKey=testCrate?`test:${testCrate.id}`:p.victoryKeys.find(key=>!keys.has(key));
      if(!winKey)throw Object.assign(new Error('This franchise has no unopened Victory Crates.'),{status:409});const item=testCrate?.forced_cosmetic_id?findItem(items,testCrate.forced_cosmetic_id):rewardItem(items);if(!item)throw Object.assign(new Error('The test crate reward is no longer in the EFL catalogue.'),{status:409});const owned=await client.query('SELECT 1 FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 AND cosmetic_id=$3',[p.league.id,p.rosterId,item.id]);
      if(owned.rowCount){const amount=DUPLICATES[item.rarity]||5;await client.query("INSERT INTO efl_victory_crate_openings(league_id,roster_id,win_key,opened_by_user_id,reward_type,reward_cosmetic_id,reward_ec) VALUES($1,$2,$3,$4,'duplicate_credit',$5,$6)",[p.league.id,p.rosterId,winKey,userId,item.id,amount]);await client.query("INSERT INTO efl_economy_ledger(league_id,roster_id,user_id,kind,amount_ec,cosmetic_id,reference_key,detail) VALUES($1,$2,$3,'crate_duplicate_credit',$4,$5,$6,$7::jsonb)",[p.league.id,p.rosterId,userId,amount,item.id,`crate:${winKey}:duplicate`,JSON.stringify({rarity:item.rarity,itemName:item.name,test:Boolean(testCrate)})]);reward={type:'duplicate_credit',itemId:item.id,itemName:item.name,rarity:item.rarity,credits:amount,test:Boolean(testCrate)};}
      else{await client.query("INSERT INTO efl_victory_crate_openings(league_id,roster_id,win_key,opened_by_user_id,reward_type,reward_cosmetic_id) VALUES($1,$2,$3,$4,'cosmetic',$5)",[p.league.id,p.rosterId,winKey,userId,item.id]);await client.query("INSERT INTO efl_cosmetic_inventory(league_id,roster_id,cosmetic_id,acquired_via,acquisition_key,acquired_by_user_id) VALUES($1,$2,$3,'victory_crate',$4,$5)",[p.league.id,p.rosterId,item.id,`crate:${winKey}`,userId]);reward={type:'cosmetic',itemId:item.id,itemName:item.name,rarity:item.rarity,test:Boolean(testCrate)};}
      if(testCrate)await client.query("UPDATE efl_test_crates SET status='opened',opened_by_user_id=$1,opened_at=NOW() WHERE id=$2 AND status='ready'",[userId,testCrate.id]);
    }else if(operation==='equip'){
      const item=findItem(items,itemId);if(!item)throw Object.assign(new Error('That cosmetic is not in the EFL catalogue.'),{status:404});const owned=await client.query('SELECT 1 FROM efl_cosmetic_inventory WHERE league_id=$1 AND roster_id=$2 AND cosmetic_id=$3',[p.league.id,p.rosterId,item.id]);if(!owned.rowCount)throw Object.assign(new Error('Purchase or unlock that cosmetic before equipping it.'),{status:403});await client.query('INSERT INTO efl_equipped_cosmetics(league_id,roster_id,slot,cosmetic_id,equipped_by_user_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(league_id,roster_id,slot) DO UPDATE SET cosmetic_id=EXCLUDED.cosmetic_id,equipped_by_user_id=EXCLUDED.equipped_by_user_id,updated_at=NOW()',[p.league.id,p.rosterId,item.slot,item.id,userId]);reward={type:'equipped',itemId:item.id,itemName:item.name,slot:item.slot};
    }else if(operation==='unequip'){
      const cleanSlot=String(slot||'').trim();if(!items.some(item=>item.slot===cleanSlot))throw Object.assign(new Error('That cosmetic slot is not valid.'),{status:400});await client.query('DELETE FROM efl_equipped_cosmetics WHERE league_id=$1 AND roster_id=$2 AND slot=$3',[p.league.id,p.rosterId,cleanSlot]);reward={type:'unequipped',slot:cleanSlot};
    }else throw Object.assign(new Error('That Franchise HQ action is not supported.'),{status:400});
    await client.query('INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,detail) VALUES($1,$2,$3,$4,$5)',[userId,`hq_${operation}`,p.league.id,p.rosterId,JSON.stringify(reward)]);return {reward,economy:await snapshot(client,p)};
  });
}
