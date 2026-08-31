(()=>{
  const $=s=>document.querySelector(s);
  const state={session:null,account:null,leagues:[],selectedLeague:null,selectedRoster:null};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=(url,options={})=>fetch(url,{credentials:'same-origin',...options});
  async function json(r){try{return await r.json()}catch{return {}}}
  function message(target,text,type=''){const el=$(target);el.textContent=text;el.className=`statusbox ${type}`.trim();el.classList.remove('hidden')}
  function clearMessage(target){$(target)?.classList.add('hidden')}
  function show(stage){['#loadingStage','#authStage','#accountStage'].forEach(s=>$(s).classList.add('hidden'));$(stage).classList.remove('hidden')}
  function authMode(mode){const signIn=mode==='signin';$('#signInForm').classList.toggle('hidden',!signIn);$('#signUpForm').classList.toggle('hidden',signIn);$('#signInTab').classList.toggle('on',signIn);$('#signUpTab').classList.toggle('on',!signIn);clearMessage('#authMessage')}

  async function loadLeagues(){
    try{const r=await fetch('efl-leagues.json?v=1',{cache:'no-store'});const j=await r.json();state.leagues=(j.leagues||[]).filter(x=>x.active)}catch{state.leagues=[]}
  }

  async function load(){
    show('#loadingStage');
    await loadLeagues();
    try{
      const authRes=await api('/api/auth/get-session',{cache:'no-store'});
      if(authRes.status===503){show('#authStage');message('#authMessage','Secure accounts are built but the authentication environment still needs to be activated before signups can open.','bad');return}
      if(!authRes.ok){show('#authStage');return}
      const session=await json(authRes);
      if(!session?.user){show('#authStage');if(new URLSearchParams(location.search).has('verified'))message('#authMessage','Email verified. Sign in to continue.','good');return}
      state.session=session;
      const r=await api('/api/efl-account',{cache:'no-store'});const j=await json(r);
      if(!r.ok){show('#authStage');message('#authMessage',j.error||'Could not load your EFL account.','bad');return}
      state.account=j;renderAccount();show('#accountStage');
    }catch(e){show('#authStage');message('#authMessage','Could not reach the EFL account service. Try again shortly.','bad')}
  }

  async function signUp(e){
    e.preventDefault();clearMessage('#authMessage');
    const name=$('#signUpName').value.trim(),email=$('#signUpEmail').value.trim(),password=$('#signUpPassword').value,confirm=$('#signUpConfirm').value;
    if(password!==confirm)return message('#authMessage','Those passwords do not match.','bad');
    const btn=e.submitter;btn.disabled=true;btn.textContent='CREATING…';
    try{
      const r=await api('/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,callbackURL:`${location.origin}/account.html?verified=1`})});const j=await json(r);
      if(!r.ok)return message('#authMessage',j.message||j.error||'Account creation failed.','bad');
      message('#authMessage','Account created. Check your email and click the EFL verification link before signing in.','good');
      $('#signUpPassword').value='';$('#signUpConfirm').value='';
    }catch{message('#authMessage','Could not create your EFL account.','bad')}finally{btn.disabled=false;btn.textContent='CREATE & VERIFY ACCOUNT'}
  }

  async function signIn(e){
    e.preventDefault();clearMessage('#authMessage');const email=$('#signInEmail').value.trim(),password=$('#signInPassword').value;const btn=e.submitter;btn.disabled=true;btn.textContent='SIGNING IN…';
    try{
      const r=await api('/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,rememberMe:true,callbackURL:`${location.origin}/account.html`})});const j=await json(r);
      if(!r.ok){if(r.status===403)return message('#authMessage','Your email still needs to be verified. Check your inbox for the EFL verification link.','bad');return message('#authMessage',j.message||j.error||'Email or password was not accepted.','bad')}
      await load();
    }catch{message('#authMessage','Could not sign in right now.','bad')}finally{btn.disabled=false;btn.textContent='SIGN IN TO EFL'}
  }

  async function forgot(){
    const email=$('#signInEmail').value.trim()||prompt('Enter the email attached to your EFL account:')||'';if(!email)return;
    try{const r=await api('/api/auth/request-password-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,redirectTo:`${location.origin}/reset-password.html`})});if(!r.ok){const j=await json(r);return message('#authMessage',j.message||j.error||'Could not send reset email.','bad')}message('#authMessage','If that email has an EFL account, a password-reset link is on the way.','good')}catch{message('#authMessage','Could not request a password reset.','bad')}
  }

  async function signOut(){try{await api('/api/auth/sign-out',{method:'POST'})}catch{}state.session=null;state.account=null;show('#authStage');authMode('signin')}

  function leagueName(id){return state.leagues.find(x=>x.id===id)?.name||id}
  function renderAccount(){
    const data=state.account||{},user=data.user||state.session?.user||{},account=data.account||{},memberships=account.memberships||[],claims=account.claims||[],ownerships=account.ownerships||[];
    $('#accountName').textContent=user.name||'EFL Member';$('#accountEmail').textContent=user.email||'';
    $('#accountAvatar').innerHTML=user.image?`<img src="${esc(user.image)}" alt="">`:esc((user.name||'EFL').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase());
    $('#leagueCount').textContent=new Set(memberships.map(x=>x.league_id)).size;$('#ownershipCount').textContent=ownerships.length;$('#pendingCount').textContent=claims.filter(x=>x.status==='pending').length;
    renderLeagues(memberships,claims,ownerships);renderRecords(memberships,claims,ownerships);
  }

  function renderLeagues(memberships=[],claims=[],ownerships=[]){
    const host=$('#leaguePicker');if(!state.leagues.length){host.innerHTML='<div class="statusbox bad">No active EFL leagues are configured.</div>';return}
    host.innerHTML=state.leagues.map(l=>{
      const member=memberships.find(x=>x.league_id===l.id),pending=claims.find(x=>x.league_id===l.id&&x.status==='pending'),owned=ownerships.find(x=>x.league_id===l.id);
      const status=owned?'FRANCHISE APPROVED':pending?'CLAIM PENDING':member?.membership_type==='prospect'?'PROSPECT':'AVAILABLE';
      return `<button class="league-card ${state.selectedLeague?.id===l.id?'on':''}" type="button" data-league="${esc(l.id)}"><b>🏈 ${esc(l.name)}</b><small>${esc(status)} · Select league</small></button>`
    }).join('');
  }

  function selectLeague(id){
    state.selectedLeague=state.leagues.find(x=>x.id===id)||null;state.selectedRoster=null;renderLeagues(state.account?.account?.memberships||[],state.account?.account?.claims||[],state.account?.account?.ownerships||[]);
    $('#rolePicker').classList.toggle('hidden',!state.selectedLeague);$('#franchisePickerWrap').classList.add('hidden');$('#prospectConfirm').classList.add('hidden');
    $('#stepLeague').classList.toggle('on',!state.selectedLeague);$('#stepRole').classList.toggle('on',Boolean(state.selectedLeague));$('#stepFranchise').classList.remove('on');
    document.querySelectorAll('[data-role-choice]').forEach(x=>x.classList.remove('on'));
  }

  async function chooseRole(role,button){
    document.querySelectorAll('[data-role-choice]').forEach(x=>x.classList.remove('on'));button.classList.add('on');
    if(role==='prospect'){$('#franchisePickerWrap').classList.add('hidden');$('#prospectConfirm').classList.remove('hidden');$('#stepRole').classList.add('on');$('#stepFranchise').classList.remove('on');return}
    $('#prospectConfirm').classList.add('hidden');$('#franchisePickerWrap').classList.remove('hidden');$('#stepFranchise').classList.add('on');await loadFranchises();
  }

  async function loadFranchises(){
    const league=state.selectedLeague;if(!league)return;$('#franchiseStatus').textContent='Connecting to Sleeper…';$('#franchisePicker').innerHTML='<div class="statusbox">Loading franchises…</div>';$('#submitClaimBtn').classList.add('hidden');
    try{
      const [ur,rr]=await Promise.all([fetch(`https://api.sleeper.app/v1/league/${league.sleeperLeagueId}/users`),fetch(`https://api.sleeper.app/v1/league/${league.sleeperLeagueId}/rosters`)]);if(!ur.ok||!rr.ok)throw Error('Sleeper unavailable');const [users,rosters]=await Promise.all([ur.json(),rr.json()]);const byId=Object.fromEntries(users.map(u=>[u.user_id,u]));
      $('#franchiseStatus').textContent=`${rosters.length} FRANCHISES`;
      $('#franchisePicker').innerHTML=rosters.sort((a,b)=>a.roster_id-b.roster_id).map(r=>{const u=byId[r.owner_id],name=u?.metadata?.team_name||u?.display_name||`Roster ${r.roster_id}`,img=u?.avatar?`https://sleepercdn.com/avatars/thumbs/${u.avatar}`:'';return `<button class="franchise-card ${state.selectedRoster===r.roster_id?'on':''}" type="button" data-roster="${r.roster_id}">${img?`<img src="${esc(img)}" alt="">`:`<div class="fake-avatar">${esc(name.slice(0,2).toUpperCase())}</div>`}<span><b>${esc(name)}</b><small>Sleeper roster ${r.roster_id}</small></span></button>`}).join('');
    }catch{$('#franchiseStatus').textContent='UNAVAILABLE';$('#franchisePicker').innerHTML='<div class="statusbox bad">Sleeper could not load the franchise list. Try again.</div>'}
  }

  function selectRoster(id){state.selectedRoster=Number(id);document.querySelectorAll('[data-roster]').forEach(x=>x.classList.toggle('on',Number(x.dataset.roster)===state.selectedRoster));$('#submitClaimBtn').classList.toggle('hidden',!state.selectedRoster)}

  async function onboarding(body,button){
    clearMessage('#accountMessage');button.disabled=true;const original=button.textContent;button.textContent='SENDING…';
    try{const r=await api('/api/efl-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await json(r);if(!r.ok)return message('#accountMessage',j.error||'Could not complete that request.','bad');message('#accountMessage',body.mode==='prospect'?'You’re now registered as an EFL Prospect for this league.':'Franchise claim sent. The Commissioner has been notified for approval.','good');state.selectedLeague=null;state.selectedRoster=null;await refreshAccount()}catch{message('#accountMessage','Could not reach the EFL onboarding service.','bad')}finally{button.disabled=false;button.textContent=original}
  }

  async function refreshAccount(){
    try{const r=await api('/api/efl-account',{cache:'no-store'});const j=await json(r);if(!r.ok)return;if(!state.leagues.length&&j.leagues)state.leagues=j.leagues;state.account=j;renderAccount();$('#rolePicker').classList.add('hidden');$('#franchisePickerWrap').classList.add('hidden');$('#prospectConfirm').classList.add('hidden');$('#stepLeague').classList.add('on');$('#stepRole').classList.remove('on');$('#stepFranchise').classList.remove('on')}catch{}
  }

  function renderRecords(memberships,claims,ownerships){
    const host=$('#accountRecords'),rows=[];
    ownerships.forEach(o=>rows.push({weight:0,html:`<div class="record"><div><b>${esc(leagueName(o.league_id))} · Franchise ${Number(o.roster_id)}</b><p>Commissioner-approved Franchise Headquarters access.</p><a class="manage-link" href="franchise-hq-v2.html?league=${encodeURIComponent(o.league_id)}&roster=${Number(o.roster_id)}">MANAGE FRANCHISE HQ →</a></div><span class="pill approved">APPROVED</span></div>`}));
    claims.forEach(c=>rows.push({weight:c.status==='pending'?1:3,html:`<div class="record"><div><b>${esc(c.franchise_name)} · ${esc(c.league_name)}</b><p>Claim submitted ${c.requested_at?new Date(c.requested_at).toLocaleDateString():''}${c.review_note?` · ${esc(c.review_note)}`:''}</p></div><span class="pill ${esc(c.status)}">${esc(c.status.toUpperCase())}</span></div>`}));
    memberships.filter(m=>m.membership_type==='prospect').forEach(m=>rows.push({weight:2,html:`<div class="record"><div><b>${esc(leagueName(m.league_id))} Prospect</b><p>No franchise management access. You can submit a franchise claim later from this account.</p></div><span class="pill prospect">PROSPECT</span></div>`}));
    rows.sort((a,b)=>a.weight-b.weight);host.innerHTML=rows.length?rows.map(x=>x.html).join(''):'<div class="statusbox">You haven’t joined a league yet. Select a league above to begin.</div>';
  }

  $('#signInTab').onclick=()=>authMode('signin');$('#signUpTab').onclick=()=>authMode('signup');$('#signInForm').onsubmit=signIn;$('#signUpForm').onsubmit=signUp;$('#forgotBtn').onclick=forgot;$('#signOutBtn').onclick=signOut;$('#refreshAccount').onclick=refreshAccount;
  $('#leaguePicker').addEventListener('click',e=>{const b=e.target.closest('[data-league]');if(b)selectLeague(b.dataset.league)});
  $('#rolePicker').addEventListener('click',e=>{const b=e.target.closest('[data-role-choice]');if(b)chooseRole(b.dataset.roleChoice,b)});
  $('#franchisePicker').addEventListener('click',e=>{const b=e.target.closest('[data-roster]');if(b)selectRoster(b.dataset.roster)});
  $('#joinProspectBtn').onclick=e=>{if(state.selectedLeague)onboarding({mode:'prospect',leagueId:state.selectedLeague.id},e.currentTarget)};
  $('#submitClaimBtn').onclick=e=>{if(state.selectedLeague&&state.selectedRoster)onboarding({mode:'claim',leagueId:state.selectedLeague.id,rosterId:state.selectedRoster},e.currentTarget)};
  load();
})();
