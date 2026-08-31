(()=>{
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const previewShare=new URLSearchParams(location.search).get('_vercel_share')||'';
  const requestUrl=url=>{if(!previewShare||!String(url).startsWith('/'))return url;const u=new URL(url,location.origin);u.searchParams.set('_vercel_share',previewShare);return `${u.pathname}${u.search}`};
  const api=(url,options={})=>fetch(requestUrl(url),{credentials:'same-origin',...options});
  const withShare=url=>previewShare?`${url}${url.includes('?')?'&':'?'}_vercel_share=${encodeURIComponent(previewShare)}`:url;
  let accountData=null,claimsData=null,staffData=null;

  function styles(){
    if($('#accountAdminStyles'))return;
    const s=document.createElement('style');s.id='accountAdminStyles';s.textContent=`
      .identity-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.staff-chip{padding:6px 9px;border-radius:999px;border:1px solid rgba(255,217,121,.28);background:rgba(255,217,121,.08);color:#ffe49b;font-size:7px;font-weight:950;letter-spacing:.07em}.staff-chip.mod{border-color:rgba(69,163,255,.3);background:rgba(69,163,255,.09);color:#a9d5ff}.staff-chip.alert{border-color:rgba(255,124,141,.3);background:rgba(255,124,141,.08);color:#ffb2bd}.admin-panel{margin-top:16px;padding:18px;border-radius:19px;border:1px solid rgba(255,217,121,.22);background:radial-gradient(520px 180px at 100% 0,rgba(255,217,121,.09),transparent 68%),linear-gradient(145deg,#0b1830,#07101f)}.admin-head{display:flex;gap:11px;align-items:center}.admin-crown{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:rgba(255,217,121,.1);border:1px solid rgba(255,217,121,.24);font-size:21px}.admin-head h3{margin:3px 0;font-size:18px}.admin-head p{margin:0;color:#8fa4bd;font-size:8px}.admin-link{margin-left:auto;color:#ffe49b;text-decoration:none;font-size:8px;font-weight:950;padding:9px 11px;border:1px solid rgba(255,217,121,.22);border-radius:10px}.admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.admin-stat{padding:11px;border-radius:12px;background:#ffffff05;border:1px solid #ffffff0c}.admin-stat small{display:block;color:#8196af;font-size:7px;font-weight:900;letter-spacing:.08em}.admin-stat strong{display:block;font-size:17px;margin-top:4px}.admin-queue{display:grid;gap:9px;margin-top:10px}.admin-claim{padding:13px;border-radius:14px;background:#061326;border:1px solid rgba(69,163,255,.15)}.admin-claim-top{display:flex;gap:10px;align-items:flex-start}.admin-claim-top b{font-size:11px}.admin-claim-top p{font-size:8px;color:#8da2bb;line-height:1.45;margin:4px 0 0}.admin-claim-top .pill{margin-left:auto}.admin-actions{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}.admin-actions button{padding:9px 11px}.staff-table{display:grid;gap:8px;margin-top:10px}.staff-row{display:grid;grid-template-columns:1.2fr .8fr auto;gap:9px;align-items:center;padding:12px;border:1px solid #ffffff0d;border-radius:13px;background:#ffffff04}.staff-row b{font-size:10px}.staff-row p{font-size:8px;color:#8499b2;margin:4px 0 0}.staff-row select{border:1px solid rgba(69,163,255,.22);border-radius:10px;background:#040c18;color:#fff;padding:9px;font-size:8px}.staff-save{padding:9px 11px}.staff-note{font-size:8px;color:#8ea2ba;line-height:1.55;margin:8px 0 0}.moderator-links{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.moderator-link{padding:12px;border:1px solid rgba(69,163,255,.16);border-radius:13px;background:#071426;text-decoration:none;color:#fff}.moderator-link b{display:block;font-size:10px}.moderator-link small{display:block;color:#8196af;font-size:7px;margin-top:4px}@media(max-width:700px){.admin-head{align-items:flex-start;flex-wrap:wrap}.admin-link{margin-left:0;width:100%;text-align:center}.admin-stats,.moderator-links{grid-template-columns:1fr}.staff-row{grid-template-columns:1fr}.admin-claim-top{flex-wrap:wrap}.admin-claim-top .pill{margin-left:0}}
    `;document.head.appendChild(s);
  }

  function account(){return accountData?.account||{}}
  function primary(){return account()?.profile?.site_role==='commissioner'}
  function staffRoles(){return account()?.staffRoles||[]}
  function commissioner(){return primary()||staffRoles().some(r=>r.role==='commissioner')}
  function moderator(){return staffRoles().some(r=>r.role==='moderator')}
  function leagueName(id){return (accountData?.leagues||[]).find(l=>String(l.id)===String(id))?.name||id}

  function renderIdentity(pending=0){
    const email=$('#accountEmail');if(!email)return;
    let host=$('#identityBadges');if(!host){host=document.createElement('div');host.id='identityBadges';host.className='identity-badges';email.insertAdjacentElement('afterend',host)}
    const chips=[];
    if(primary())chips.push('<span class="staff-chip">👑 PRIMARY COMMISSIONER / ADMIN</span>');
    staffRoles().forEach(r=>chips.push(`<span class="staff-chip ${r.role==='moderator'?'mod':''}">${r.role==='commissioner'?'👑':'🛡️'} ${esc(r.role.toUpperCase())} · ${esc(leagueName(r.league_id))}</span>`));
    if(pending&&commissioner())chips.push(`<span class="staff-chip alert">${pending} PENDING ${pending===1?'REQUEST':'REQUESTS'}</span>`);
    host.innerHTML=chips.join('');
  }

  function ensurePanel(){
    if($('#accountAdminPanel'))return $('#accountAdminPanel');
    const panel=document.createElement('section');panel.id='accountAdminPanel';panel.className='admin-panel';
    const summary=$('.summary-grid');summary?.insertAdjacentElement('afterend',panel);return panel;
  }

  function claimCard(c){return `<div class="admin-claim"><div class="admin-claim-top"><div><b>${esc(c.franchise_name)} · ${esc(c.league_name)}</b><p>${esc(c.user_name)} · ${esc(c.user_email)}<br>Submitted ${c.requested_at?new Date(c.requested_at).toLocaleString():'recently'}</p></div><span class="pill pending">PENDING</span></div><div class="admin-actions"><button class="primary" type="button" data-admin-review="approved" data-claim-id="${Number(c.id)}">✓ APPROVE</button><button class="danger" type="button" data-admin-review="denied" data-claim-id="${Number(c.id)}">✕ DENY</button></div></div>`}

  function renderCommissionerPanel(){
    const panel=ensurePanel(),claims=claimsData?.claims||[],pending=claims.filter(c=>c.status==='pending'),reviewed=claims.filter(c=>c.status!=='pending'),prospects=claimsData?.prospects||[];renderIdentity(pending.length);
    panel.innerHTML=`<div class="admin-head"><div class="admin-crown">👑</div><div><div class="eye">Commissioner Access</div><h3>${primary()?'Admin Command Center':'Commissioner Inbox'}</h3><p>${primary()?'Your player account is also the primary administrative account.':'League-scoped Commissioner access is active on this account.'}</p></div><a class="admin-link" href="${withShare('commissioner-accounts.html')}">FULL OFFICE →</a></div><div id="adminPanelMsg" class="statusbox hidden" style="margin-top:10px"></div><div class="admin-stats"><div class="admin-stat"><small>PENDING APPROVALS</small><strong>${pending.length}</strong></div><div class="admin-stat"><small>PROSPECTS</small><strong>${prospects.length}</strong></div><div class="admin-stat"><small>REVIEWED</small><strong>${reviewed.length}</strong></div></div><div class="section-title" style="margin-top:15px"><div><div class="eye">Needs Your Decision</div><h3>Pending franchise claims</h3></div></div><div class="admin-queue" id="accountAdminQueue">${pending.length?pending.map(claimCard).join(''):'<div class="statusbox good">No franchise claims are waiting for approval.</div>'}</div>${primary()?'<div id="staffAdminArea"></div>':''}`;
    if(primary())renderStaffArea();
  }

  function roleFor(userId,leagueId){return staffData?.staff?.find(s=>String(s.user_id)===String(userId)&&String(s.league_id)===String(leagueId))?.role||'member'}
  function renderStaffArea(){
    const host=$('#staffAdminArea');if(!host)return;
    if(!staffData){host.innerHTML='<div class="onboarding"><div class="statusbox">Loading staff access…</div></div>';return}
    const members=staffData.members||[];
    host.innerHTML=`<div class="onboarding"><div class="section-title"><div><div class="eye">Primary Admin Only</div><h3>Staff access</h3></div><span>ROLE CHANGES ARE AUDITED</span></div><p class="staff-note">Moderators can manage every Franchise HQ in their assigned league. Commissioners can also review franchise claims. Only the primary Commissioner account can grant or revoke these roles.</p><div class="staff-table">${members.length?members.map(m=>{const root=m.site_role==='commissioner',role=root?'commissioner':roleFor(m.user_id,m.league_id);return `<div class="staff-row"><div><b>${root?'👑 ':''}${esc(m.display_name||m.email||'EFL Member')}</b><p>${esc(m.email||'')} · ${esc(leagueName(m.league_id))} · ${esc(m.membership_type||'member')}</p></div>${root?'<div><span class="staff-chip">PRIMARY COMMISSIONER</span></div>':`<select data-staff-role data-user-id="${esc(m.user_id)}" data-league-id="${esc(m.league_id)}"><option value="member" ${role==='member'?'selected':''}>Member</option><option value="moderator" ${role==='moderator'?'selected':''}>Moderator</option><option value="commissioner" ${role==='commissioner'?'selected':''}>Commissioner</option></select>`}${root?'':`<button class="secondary staff-save" type="button" data-save-staff data-user-id="${esc(m.user_id)}" data-league-id="${esc(m.league_id)}">SAVE ROLE</button>`}</div>`}).join(''):'<div class="statusbox">No league members are available yet.</div>'}</div></div>`;
  }

  function renderModeratorPanel(){
    const panel=ensurePanel();renderIdentity(0);
    const roles=staffRoles().filter(r=>r.role==='moderator');
    panel.innerHTML=`<div class="admin-head"><div class="admin-crown">🛡️</div><div><div class="eye">Moderator Access</div><h3>League Franchise Management</h3><p>You can manage Franchise Headquarters across your assigned league.</p></div></div><div class="moderator-links">${roles.map(r=>`<a class="moderator-link" href="${withShare(`franchise-hq-v2.html?league=${encodeURIComponent(r.league_id)}`)}"><b>MANAGE ${esc(leagueName(r.league_id))}</b><small>Open the franchise selector →</small></a>`).join('')}</div><p class="staff-note">Ownership remains unchanged. Your Moderator permission is a separate, auditable management override and can be revoked by the primary Commissioner.</p>`;
  }

  async function loadClaims(){
    const r=await api('/api/commissioner-account-claims',{cache:'no-store'});if(!r.ok)throw Error('Commissioner inbox unavailable');claimsData=await r.json();
  }
  async function loadStaff(){
    const r=await api('/api/commissioner-staff',{cache:'no-store'});if(!r.ok)throw Error('Staff administration unavailable');staffData=await r.json();
  }

  async function refresh(){
    try{
      const r=await api('/api/efl-account',{cache:'no-store'});if(!r.ok)return;accountData=await r.json();styles();
      if(commissioner()){
        await loadClaims();if(primary())await loadStaff();renderCommissionerPanel();
      }else if(moderator())renderModeratorPanel();else renderIdentity(0);
    }catch(e){console.error('EFL account admin load failed',e)}
  }

  async function review(id,status){
    const note=prompt(status==='approved'?'Optional approval note:':'Optional reason for denial:')||'';
    const r=await api('/api/commissioner-account-claims',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claimId:Number(id),status,note})});let j={};try{j=await r.json()}catch{}
    if(!r.ok){const m=$('#adminPanelMsg');if(m){m.textContent=j.error||'Could not review that claim.';m.className='statusbox bad';m.classList.remove('hidden')}return}
    await refresh();
  }

  async function saveStaff(button){
    const userId=button.dataset.userId,leagueId=button.dataset.leagueId,select=document.querySelector(`[data-staff-role][data-user-id="${CSS.escape(userId)}"][data-league-id="${CSS.escape(leagueId)}"]`);if(!select)return;
    const old=button.textContent;button.disabled=true;button.textContent='SAVING…';
    try{
      const r=await api('/api/commissioner-staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,leagueId,role:select.value})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Could not update staff role');await loadStaff();renderStaffArea();
    }catch(e){alert(e.message||'Could not update staff role.')}finally{button.disabled=false;button.textContent=old}
  }

  document.addEventListener('click',e=>{const reviewBtn=e.target.closest('[data-admin-review]');if(reviewBtn)return review(reviewBtn.dataset.claimId,reviewBtn.dataset.adminReview);const staffBtn=e.target.closest('[data-save-staff]');if(staffBtn)return saveStaff(staffBtn)});
  window.addEventListener('efl-account-refreshed',refresh);
  setTimeout(refresh,500);
})();
