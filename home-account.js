(()=>{
  const qs=s=>document.querySelector(s);
  const share=new URLSearchParams(location.search).get('_vercel_share')||'';
  const withShare=url=>{
    if(!share)return url;
    const u=new URL(url,location.origin);
    u.searchParams.set('_vercel_share',share);
    return `${u.pathname}${u.search}${u.hash}`;
  };
  const api=(url,options={})=>fetch(withShare(url),{credentials:'same-origin',cache:'no-store',...options});
  const shortName=name=>{
    const value=String(name||'').trim();
    if(!value)return 'MY ACCOUNT';
    if(value.length<=16)return value;
    return value.split(/\s+/)[0].slice(0,16)||'MY ACCOUNT';
  };

  function installStyles(){
    if(qs('#eflAccountNavStyles'))return;
    const style=document.createElement('style');
    style.id='eflAccountNavStyles';
    style.textContent=`
      .efl-account-nav{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border-radius:12px;border:1px solid rgba(69,163,255,.58);background:linear-gradient(135deg,#0e55c7,#2588ff);color:#fff!important;font-size:9px;font-weight:1000;letter-spacing:.045em;white-space:nowrap;box-shadow:0 8px 22px rgba(23,105,232,.18),inset 0 1px rgba(255,255,255,.12);transition:border-color .18s,background .18s,transform .18s,box-shadow .18s}
      .efl-account-nav:hover{border-color:#8bcaff;background:linear-gradient(135deg,#1769e8,#45a3ff);box-shadow:0 10px 28px rgba(23,105,232,.3),inset 0 1px rgba(255,255,255,.16);transform:translateY(-1px)}
      .efl-account-nav .efl-account-icon{font-size:14px;line-height:1}
      .efl-account-copy{display:flex;flex-direction:column;align-items:flex-start;line-height:1.02}
      .efl-account-copy strong{font-size:9px;max-width:116px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .efl-account-copy small{display:none;margin-top:3px;color:#c9e7ff;font-size:6px;font-weight:900;letter-spacing:.12em}
      .efl-account-nav.is-signed-in .efl-account-copy small{display:block}
      .efl-account-nav .efl-account-badge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:none;align-items:center;justify-content:center;background:#ff596f;color:#fff;font-size:8px;line-height:1;box-shadow:0 0 0 2px #07101d}
      .efl-account-nav.has-pending .efl-account-badge{display:inline-flex}
      .navlinks .efl-hq-nav{color:#8dccff!important;font-weight:950!important}
      .navlinks .efl-hq-nav:hover{color:#d9f0ff!important}
      .mobile-menu .efl-mobile-account,.mobile-menu .efl-mobile-hq{border:1px solid rgba(69,163,255,.28);background:linear-gradient(135deg,rgba(23,105,232,.14),rgba(69,163,255,.08));color:#bfe2ff}
      .mobile-menu .efl-mobile-account{display:flex;align-items:center;gap:8px}
      .mobile-menu .efl-mobile-account strong{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:none;align-items:center;justify-content:center;background:#ff596f;color:#fff;font-size:9px}
      .mobile-menu .efl-mobile-account.has-pending strong{display:inline-flex}
      .mobile-menu .efl-mobile-hq{font-weight:950}
      @media(max-width:980px){.efl-account-nav{padding:0 10px}.efl-account-copy strong{max-width:88px;font-size:8px}}
      @media(max-width:760px){.nav>.efl-account-nav{margin-left:auto;padding:0 9px;width:42px}.nav>.efl-account-nav .efl-account-copy{display:none}.navlinks{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function makeDesktop(){
    const nav=qs('.nav');if(!nav)return null;
    let link=qs('#eflAccountNav');if(link)return link;
    link=document.createElement('a');
    link.id='eflAccountNav';
    link.className='efl-account-nav';
    link.href=withShare('/account.html');
    link.setAttribute('aria-label','Log in to EFL');
    link.innerHTML='<span class="efl-account-icon">👤</span><span class="efl-account-copy"><strong>LOG IN</strong><small>ACCOUNT</small></span><span class="efl-account-badge" aria-label="Pending requests">0</span>';
    const league=qs('#leagueMenu');
    nav.insertBefore(link,league||qs('#menuBtn')||null);
    return link;
  }

  function makeMobile(){
    const menu=qs('#mobileMenu');if(!menu)return null;
    let link=qs('#eflMobileAccount');if(link)return link;
    link=document.createElement('a');
    link.id='eflMobileAccount';
    link.className='efl-mobile-account';
    link.href=withShare('/account.html');
    link.innerHTML='<span>👤 Log In / Account</span><strong>0</strong>';
    menu.appendChild(link);
    return link;
  }

  function setHqLink(href){
    const navlinks=qs('.navlinks');
    const mobile=qs('#mobileMenu');
    let desktop=qs('#eflFranchiseHqNav');
    let mobileLink=qs('#eflMobileHq');
    if(!href){desktop?.remove();mobileLink?.remove();return}
    if(navlinks&&!desktop){
      desktop=document.createElement('a');
      desktop.id='eflFranchiseHqNav';
      desktop.className='efl-hq-nav';
      desktop.textContent='Franchise HQ';
      const commissioner=[...navlinks.querySelectorAll('a')].find(a=>/commissioner/i.test(a.textContent||''));
      navlinks.insertBefore(desktop,commissioner||null);
    }
    if(mobile&&!mobileLink){
      mobileLink=document.createElement('a');
      mobileLink.id='eflMobileHq';
      mobileLink.className='efl-mobile-hq';
      mobileLink.textContent='🏟️ Franchise HQ';
      const account=qs('#eflMobileAccount');
      mobile.insertBefore(mobileLink,account||null);
    }
    const target=withShare(href);
    if(desktop)desktop.href=target;
    if(mobileLink)mobileLink.href=target;
  }

  function render({signedIn=false,commissioner=false,primary=false,moderator=false,pending=0,name='',hqHref=''}={}){
    const desktop=qs('#eflAccountNav'),mobile=qs('#eflMobileAccount');
    const icon=signedIn?(commissioner?'👑':'👤'):'👤';
    const label=signedIn?shortName(name):'LOG IN';
    const role=primary?'ADMIN':commissioner?'COMMISSIONER':moderator?'MODERATOR':'ACCOUNT';
    if(desktop){
      desktop.classList.toggle('is-signed-in',signedIn);
      desktop.querySelector('.efl-account-icon').textContent=icon;
      desktop.querySelector('.efl-account-copy strong').textContent=label;
      desktop.querySelector('.efl-account-copy small').textContent=role;
      desktop.setAttribute('aria-label',signedIn?`Open ${name||'my'} EFL account`:'Log in to EFL');
      const badge=desktop.querySelector('.efl-account-badge');badge.textContent=String(pending||0);
      desktop.classList.toggle('has-pending',pending>0);
    }
    if(mobile){
      mobile.querySelector('span').textContent=signedIn?`${icon} ${name||'My EFL Account'} · ${role}`:'👤 Log In / Account';
      mobile.querySelector('strong').textContent=String(pending||0);
      mobile.classList.toggle('has-pending',pending>0);
    }
    setHqLink(signedIn?hqHref:'');
  }

  async function hydrate(){
    try{
      const sessionRes=await api('/api/auth/get-session');
      if(!sessionRes.ok)return;
      const session=await sessionRes.json().catch(()=>null);
      if(!session?.user)return;
      let commissioner=false,primary=false,moderator=false,pending=0,hqHref='';
      let name=session.user.name||'EFL Member';
      const accountRes=await api('/api/efl-account');
      if(accountRes.ok){
        const data=await accountRes.json().catch(()=>({}));
        const account=data?.account||{};
        const profile=account?.profile||{};
        const staffRoles=account?.staffRoles||[];
        const ownerships=account?.ownerships||[];
        name=profile.display_name||data?.user?.name||name;
        primary=profile.site_role==='commissioner';
        commissioner=primary||staffRoles.some(r=>r.role==='commissioner');
        moderator=staffRoles.some(r=>r.role==='moderator');
        const owned=ownerships[0];
        if(owned)hqHref=`/franchise-hq-v2.html?league=${encodeURIComponent(owned.league_id)}&roster=${Number(owned.roster_id)}`;
        else {
          const staff=staffRoles.find(r=>['moderator','commissioner'].includes(r.role));
          if(staff)hqHref=`/franchise-hq-v2.html?league=${encodeURIComponent(staff.league_id)}`;
          else if(primary)hqHref='/franchise-hq-v2.html?league=efl-dynasty';
        }
      }
      if(commissioner){
        const claimsRes=await api('/api/commissioner-account-claims');
        if(claimsRes.ok){const claims=await claimsRes.json().catch(()=>({}));pending=(claims.claims||[]).filter(c=>c.status==='pending').length;}
      }
      render({signedIn:true,commissioner,primary,moderator,pending,name,hqHref});
    }catch{}
  }

  installStyles();makeDesktop();makeMobile();render();hydrate();
})();
