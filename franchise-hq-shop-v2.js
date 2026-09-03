(()=>{
  const DATA_URL='legacy-cosmetics.json?v=2';
  const state={items:[],selected:null,economy:null,allowed:false,accessStatus:'loading',target:null,confirmPurchase:null,busy:false,filters:{q:'',slot:'all',collection:'all',rarity:'all',sort:'featured'}};
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug=v=>String(v||'core').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const slotLabel=s=>({banner:'Banner',frame:'Profile Frame',title:'Owner Title',background:'HQ Background',nameplate:'Nameplate',showcase:'Trophy Case',effect:'HQ Effect',badgeEffect:'Badge Effect'}[s]||s);
  const palettes={
    'EFL Core':['#1769e8','#45a3ff','#ffd979'],
    'Royal':['#0b1736','#81661c','#ffd979'],
    'Gridiron Nights':['#061429','#1769e8','#b8e4ff'],
    'Blackout':['#05070b','#272d36','#9aa2ad'],
    'Inferno':['#210607','#8d1f0b','#ff8a32'],
    'Ice Cold':['#061726','#1769e8','#b9f2ff'],
    'Neon Nights':['#09082a','#1769e8','#6cf4ff'],
    'Throwback':['#25170d','#72502d','#e1ba79'],
    'Dynasty':['#0b1022','#725b16','#ffd979'],
    'Rivalry':['#220611','#8d1732','#ff718c'],
    'Playoffs':['#071329','#1e61bd','#d9ecff'],
    'Champion':['#171004','#916c12','#ffd979'],
    'Seasonal':['#0e1821','#3b6c78','#d7f6ff'],
    'Personality':['#11101f','#6f48aa','#e1c8ff'],
    'Materials':['#0c1218','#657180','#d7dee8'],
    'Atmosphere':['#07121d','#276687','#b7e6ff']
  };
  function palette(item){return palettes[item.collection]||['#071326','#1769e8','#ffd979']}
  function artMarkup(item,large=false){
    const label=esc(item.name);const slot=item.slot;const short=label.length>22?`${label.slice(0,20)}…`:label;
    if(slot==='banner')return `<div class="visual banner-visual"><i></i><i></i><span>EFL</span><b>${short}</b></div>`;
    if(slot==='frame')return `<div class="visual frame-visual"><div class="avatar-disc">EFL</div><span>${short}</span></div>`;
    if(slot==='background')return `<div class="visual background-visual"><div class="stadium-lines"></div><b>${short}</b></div>`;
    if(slot==='nameplate')return `<div class="visual nameplate-visual"><span>EFL FRANCHISE</span><b>${short}</b></div>`;
    if(slot==='title')return `<div class="visual title-visual"><small>OWNER TITLE</small><b>${short}</b><i></i></div>`;
    if(slot==='showcase')return `<div class="visual showcase-visual"><div class="shelf"><i></i><i></i><i></i></div><b>${short}</b></div>`;
    if(slot==='badgeEffect')return `<div class="visual badgefx-visual"><div><i></i><i></i><i></i></div><b>${short}</b></div>`;
    return `<div class="visual effect-visual"><div class="particle-field"><i></i><i></i><i></i><i></i><i></i></div><b>${short}</b></div>`;
  }
  function styleVars(item){const [a,b,c]=palette(item);return `--cos-a:${a};--cos-b:${b};--cos-c:${c}`}
  function owned(item){return Boolean(state.economy?.inventory?.some(entry=>entry.id===item.id))}
  function equipped(item){return state.economy?.equipped?.[item.slot]===item.id}
  function actionMarkup(item){if(!state.allowed){const loading=state.accessStatus==='loading';return `<button class="economy-action" type="button" disabled>${loading?'LOADING HQ ACCESS…':item.lootOnly?'VICTORY CRATE EXCLUSIVE':'OWNER SIGN-IN REQUIRED'}</button>`}if(owned(item)){if(equipped(item))return `<button class="economy-action equipped" type="button" data-economy="unequip" data-slot="${esc(item.slot)}">EQUIPPED · REMOVE</button>`;return `<button class="economy-action" type="button" data-economy="equip" data-item="${esc(item.id)}">EQUIP TO HQ</button>`}if(item.lootOnly)return '<button class="economy-action" type="button" disabled>VICTORY CRATE EXCLUSIVE</button>';const balance=Number(state.economy?.wallet?.balance||0),price=Number(item.price)||0;if(balance<price)return `<button class="economy-action" type="button" disabled>NEED ${(price-balance).toLocaleString()} MORE EC</button>`;return `<button class="economy-action buy" type="button" data-economy="purchase" data-item="${esc(item.id)}">${state.confirmPurchase===item.id?`CONFIRM · SPEND ${price} EC`:`BUY · ${price} EC`}</button>`}
  function card(item){
    const loot=item.lootOnly;return `<article class="cosmetic-card rarity-${slug(item.rarity)}" data-cosmetic-id="${esc(item.id)}" style="${styleVars(item)}">
      <button class="cosmetic-art" type="button" data-preview="${esc(item.id)}" aria-label="Preview ${esc(item.name)}">${artMarkup(item)}</button>
      <div class="cosmetic-meta"><div class="cosmetic-tags"><span>${esc(slotLabel(item.slot))}</span><span>${esc(item.collection||'EFL')}</span></div><h4>${esc(item.name)}</h4><p>${esc(item.description)}</p>
      <div class="cosmetic-bottom"><span class="rarity ${esc(item.rarity)}">${esc(String(item.rarity).toUpperCase())}</span><strong>${loot?'LOOT ONLY':`${Number(item.price)||0} EC`}</strong></div>
      <button class="preview-btn" type="button" data-preview="${esc(item.id)}">PREVIEW ON HQ</button>${actionMarkup(item)}</div>
    </article>`;
  }
  function filtered(){
    const f=state.filters;let arr=state.items.filter(item=>{
      const hay=`${item.name} ${item.description} ${item.collection} ${slotLabel(item.slot)} ${item.rarity}`.toLowerCase();
      return(!f.q||hay.includes(f.q))&&(f.slot==='all'||item.slot===f.slot)&&(f.collection==='all'||item.collection===f.collection)&&(f.rarity==='all'||item.rarity===f.rarity);
    });
    if(f.sort==='price-asc')arr.sort((a,b)=>(a.lootOnly?9999:a.price)-(b.lootOnly?9999:b.price));
    else if(f.sort==='price-desc')arr.sort((a,b)=>(b.lootOnly?9999:b.price)-(a.lootOnly?9999:a.price));
    else if(f.sort==='rarity')arr.sort((a,b)=>['Legendary','Epic','Rare','Common'].indexOf(a.rarity)-['Legendary','Epic','Rare','Common'].indexOf(b.rarity));
    else arr.sort((a,b)=>(a.collection||'').localeCompare(b.collection||'')||a.name.localeCompare(b.name));
    return arr;
  }
  function renderItems(){
    const grid=$('#shopGrid');if(!grid)return;const arr=filtered();grid.classList.add('enhanced-shop-grid');grid.innerHTML=arr.length?arr.map(card).join(''):'<div class="cosmetic-empty">No cosmetics match those filters.</div>';
    const count=$('#cosmeticCount');if(count)count.textContent=`${arr.length} OF ${state.items.length} COSMETICS`;
    const label=$('#activeCollectionLabel');if(label)label.textContent=state.filters.collection==='all'?'ALL COLLECTIONS':state.filters.collection.toUpperCase();
  }
  function renderInventory(){const grid=$('#inventoryGrid'),summary=$('#inventorySummary');if(!grid||!summary)return;if(!state.allowed){summary.textContent=state.accessStatus==='loading'?'Loading this franchise’s permanent inventory…':'Sign in with an approved franchise account to load its permanent inventory.';grid.innerHTML='';return}const inventory=state.items.filter(item=>owned(item));summary.innerHTML=`<strong>${inventory.length} COSMETIC${inventory.length===1?'':'S'} OWNED</strong> · ${Object.keys(state.economy?.equipped||{}).length} currently equipped · purchases and crate unlocks are saved to this franchise.`;grid.classList.add('enhanced-shop-grid');grid.innerHTML=inventory.length?inventory.map(card).join(''):'<div class="cosmetic-empty">No cosmetics yet. Earn Credits through Legacy performance or open a Victory Crate after a finalized win.</div>'}
  function renderActivity(){const host=$('#activityList');if(!host)return;if(!state.allowed){host.innerHTML=`<div class="inventory-summary">${state.accessStatus==='loading'?'Loading this franchise’s economy activity…':'Sign in with an approved franchise account to view its private economy activity.'}</div>`;return}const events=state.economy?.recentActivity||[];host.innerHTML=events.length?events.map(event=>{const item=state.items.find(entry=>entry.id===event.itemId),amount=Number(event.amount)||0;let title='HQ activity',detail='Franchise economy updated';if(event.type==='cosmetic_purchase'){title=`Purchased ${item?.name||'cosmetic'}`;detail='Added permanently to inventory'}else if(event.type==='crate_duplicate_credit'){title=`Duplicate ${item?.name||'cosmetic'}`;detail='Converted into EFL Credits'}else if(event.type==='crate_cosmetic'){title=`Unlocked ${item?.name||'cosmetic'}`;detail='Victory Crate reward'}const date=event.at?new Date(event.at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'';return `<article class="activity-row"><div><strong>${esc(title)}</strong><span>${esc(detail)}${date?` · ${esc(date)}`:''}</span></div><b class="${amount<0?'debit':amount>0?'credit':''}">${amount?`${amount>0?'+':''}${amount} EC`:'UNLOCK'}</b></article>`}).join(''):'<div class="inventory-summary"><strong>NO ECONOMY ACTIVITY YET</strong> · Purchases and Victory Crate rewards will appear here.</div>'}
  function collectionStats(){
    const map=new Map();for(const item of state.items){const k=item.collection||'Other';if(!map.has(k))map.set(k,[]);map.get(k).push(item)}return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  }
  function renderCollections(){
    const host=$('#collectionBrowser');if(!host)return;host.innerHTML=collectionStats().map(([name,items])=>{
      const featured=items.find(x=>x.rarity==='Legendary')||items.find(x=>x.rarity==='Epic')||items[0];const loot=items.filter(x=>x.lootOnly).length;return `<button class="collection-card ${state.filters.collection===name?'on':''}" type="button" data-collection="${esc(name)}" style="${styleVars(featured)}"><div class="collection-art"><i></i><i></i><b>${esc(name.slice(0,2).toUpperCase())}</b></div><span>${esc(name)}</span><small>${items.length} ITEMS${loot?` · ${loot} LOOT`:''}</small></button>`
    }).join('');
  }
  function preview(item){
    state.selected=item;const preview=$('#cosmeticPreview');if(!preview)return;const [a,b,c]=palette(item);preview.style.setProperty('--cos-a',a);preview.style.setProperty('--cos-b',b);preview.style.setProperty('--cos-c',c);preview.dataset.slot=item.slot;preview.dataset.collection=slug(item.collection);
    const team=$('#teamName')?.textContent||'EFL Franchise';const owner=$('#ownerName')?.textContent||'Owner';const avatar=$('#avatar')?.innerHTML||'EFL';
    preview.innerHTML=`<div class="preview-stage slot-${esc(item.slot)}">
      <div class="preview-effect"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="preview-banner"><span>EFL FRANCHISE HQ</span></div>
      <div class="preview-profile"><div class="preview-avatar">${avatar}</div><div class="preview-copy"><small>${esc(owner)}</small><h3>${esc(team)}</h3><div class="preview-title">${item.slot==='title'?esc(item.name):'FRANCHISE OWNER'}</div></div></div>
      <div class="preview-nameplate">${item.slot==='nameplate'?esc(item.name):esc(team)}</div>
      <div class="preview-badges"><i></i><i></i><i></i></div><div class="preview-case"><i></i><i></i><i></i></div>
    </div><div class="preview-info"><div><span class="rarity ${esc(item.rarity)}">${esc(item.rarity.toUpperCase())}</span><small>${esc(slotLabel(item.slot))} · ${esc(item.collection||'EFL')}</small><h4>${esc(item.name)}</h4><p>${esc(item.description)}</p></div><strong>${item.lootOnly?'🎁 VICTORY CRATE EXCLUSIVE':`${Number(item.price)||0} EC`}</strong>${actionMarkup(item)}</div>`;
    document.querySelectorAll('.cosmetic-card.selected').forEach(x=>x.classList.remove('selected'));document.querySelector(`[data-cosmetic-id="${CSS.escape(item.id)}"]`)?.classList.add('selected');
  }
  function controls(){
    const shop=$('#shop');const grid=$('#shopGrid');if(!shop||!grid||$('#cosmeticShopTools'))return;
    const collections=[...new Set(state.items.map(x=>x.collection).filter(Boolean))].sort();const slots=[...new Set(state.items.map(x=>x.slot).filter(Boolean))].sort();
    const ui=document.createElement('div');ui.id='cosmeticShopTools';ui.innerHTML=`<div class="shop-intro"><div><div class="eyebrow">EFL Cosmetic Market</div><h3>Build Your Franchise Identity</h3><p>Browse collections, filter by cosmetic type, and preview any item directly on a Franchise HQ mockup before spending Credits.</p></div><div class="catalog-count" id="cosmeticCount"></div></div>
      <div class="collection-head"><b>COLLECTIONS</b><span id="activeCollectionLabel">ALL COLLECTIONS</span></div><div class="collection-browser" id="collectionBrowser"></div>
      <div class="shop-workspace"><aside class="preview-panel"><div class="preview-label">LIVE COSMETIC PREVIEW</div><div id="cosmeticPreview" class="cosmetic-preview"></div><div class="preview-hint">Click any cosmetic to try it on. Previewing does not spend Credits.</div></aside>
      <div class="catalog-panel"><div class="shop-toolbar"><input id="cosmeticSearch" type="search" placeholder="Search cosmetics…" aria-label="Search cosmetics"><select id="slotFilter"><option value="all">All types</option>${slots.map(s=>`<option value="${esc(s)}">${esc(slotLabel(s))}</option>`).join('')}</select><select id="rarityFilter"><option value="all">All rarities</option><option>Common</option><option>Rare</option><option>Epic</option><option>Legendary</option></select><select id="collectionFilter"><option value="all">All collections</option>${collections.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select id="sortFilter"><option value="featured">Collection</option><option value="rarity">Rarity</option><option value="price-asc">Price: Low</option><option value="price-desc">Price: High</option></select><button id="clearCosmeticFilters" type="button">RESET</button></div><div id="catalogMount"></div></div></div>`;
    grid.before(ui);ui.querySelector('#catalogMount').appendChild(grid);
    $('#cosmeticSearch').addEventListener('input',e=>{state.filters.q=e.target.value.trim().toLowerCase();renderItems()});
    $('#slotFilter').addEventListener('change',e=>{state.filters.slot=e.target.value;renderItems()});
    $('#rarityFilter').addEventListener('change',e=>{state.filters.rarity=e.target.value;renderItems()});
    $('#collectionFilter').addEventListener('change',e=>{state.filters.collection=e.target.value;renderCollections();renderItems()});
    $('#sortFilter').addEventListener('change',e=>{state.filters.sort=e.target.value;renderItems()});
    $('#clearCosmeticFilters').addEventListener('click',()=>{state.filters={q:'',slot:'all',collection:'all',rarity:'all',sort:'featured'};$('#cosmeticSearch').value='';$('#slotFilter').value='all';$('#rarityFilter').value='all';$('#collectionFilter').value='all';$('#sortFilter').value='featured';renderCollections();renderItems()});
    ui.addEventListener('click',e=>{const coll=e.target.closest('[data-collection]');if(coll){state.filters.collection=coll.dataset.collection;$('#collectionFilter').value=state.filters.collection;renderCollections();renderItems();document.querySelector('#catalogMount')?.scrollIntoView({behavior:'smooth',block:'start'});return}const btn=e.target.closest('[data-preview]');if(btn){const item=state.items.find(x=>x.id===btn.dataset.preview);if(item)preview(item)}});
  }
  function applyEquipped(){const profile=$('.profilebar');if(!profile)return;const slots=['banner','frame','title','background','nameplate','showcase','effect','badgeEffect'];slots.forEach(slot=>{const attr=slot.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);profile.removeAttribute(`data-equipped-${attr}`);['a','b','c'].forEach(key=>profile.style.removeProperty(`--eq-${attr}-${key}`))});const title=$('#equippedTitle'),nameplate=$('#equippedNameplate');if(title){title.hidden=true;title.textContent=''}if(nameplate){nameplate.hidden=true;nameplate.textContent=''}Object.entries(state.economy?.equipped||{}).forEach(([slot,id])=>{const item=state.items.find(entry=>entry.id===id);if(!item)return;const attr=slot.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`),[a,b,c]=palette(item);profile.setAttribute(`data-equipped-${attr}`,item.id);profile.style.setProperty(`--eq-${attr}-a`,a);profile.style.setProperty(`--eq-${attr}-b`,b);profile.style.setProperty(`--eq-${attr}-c`,c);if(slot==='title'&&title){title.textContent=item.name;title.hidden=false}if(slot==='nameplate'&&nameplate){nameplate.textContent=item.name;nameplate.hidden=false}})}
  function toast(message,bad=false){const shop=$('#shop');if(!shop)return;let el=$('#economyToast');if(!el){el=document.createElement('div');el.id='economyToast';el.className='economy-toast';shop.prepend(el)}el.textContent=message;el.style.color=bad?'#ff8c9b':'#ffd979';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.remove(),5000)}
  async function performEconomy(button){if(state.busy||!window.EFL_HQ_ACTION)return;const action=button.dataset.economy,itemId=button.dataset.item||'',slot=button.dataset.slot||'';if(action==='purchase'&&state.confirmPurchase!==itemId){state.confirmPurchase=itemId;renderItems();renderInventory();if(state.selected?.id===itemId)preview(state.selected);setTimeout(()=>{if(state.confirmPurchase===itemId){state.confirmPurchase=null;refresh()}},5000);return}state.confirmPurchase=null;state.busy=true;button.disabled=true;const old=button.textContent;button.textContent=action==='purchase'?'PURCHASING…':action==='equip'?'EQUIPPING…':'UPDATING…';try{const result=await window.EFL_HQ_ACTION(action,{itemId,slot}),reward=result.reward||{};toast(reward.type==='purchase'?`${reward.itemName} added to this franchise inventory.`:reward.type==='equipped'?`${reward.itemName} is now equipped.`:'Cosmetic removed from this HQ slot.')}catch(error){toast(error.message||'That HQ action could not be completed.',true);button.disabled=false;button.textContent=old}finally{state.busy=false}}
  function refresh(){if(!state.items.length)return;renderCollections();renderItems();renderInventory();renderActivity();applyEquipped();const selected=state.selected||state.items.find(x=>x.rarity==='Legendary')||state.items[0];if(selected)preview(selected)}
  async function init(){
    try{const data=await fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});state.items=data.items||[];document.addEventListener('efl:hq-economy',event=>{state.target=event.detail||null;state.allowed=Boolean(event.detail?.allowed);state.accessStatus=event.detail?.status||'view';state.economy=event.detail?.economy||null;state.confirmPurchase=null;refresh()});document.addEventListener('click',event=>{const button=event.target.closest('[data-economy]');if(button)performEconomy(button)});if(window.EFL_HQ_STATE){state.target=window.EFL_HQ_STATE;state.allowed=Boolean(window.EFL_HQ_STATE.allowed);state.accessStatus=window.EFL_HQ_STATE.status||'view';state.economy=window.EFL_HQ_STATE.economy||null}let tries=0;const timer=setInterval(()=>{tries++;if($('#shopGrid')){clearInterval(timer);controls();refresh();$('#franchisePicker')?.addEventListener('change',()=>setTimeout(refresh,20))}else if(tries>120)clearInterval(timer)},50)}catch(e){console.error('Cosmetic shop enhancement failed',e)}
  }
  init();
})();
