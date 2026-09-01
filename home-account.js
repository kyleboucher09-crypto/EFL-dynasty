(()=>{
  const qs=s=>document.querySelector(s);
  const share=new URLSearchParams(location.search).get('_vercel_share')||'';
  const userIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25"></circle><path d="M5.5 19c.7-3.4 3-5.2 6.5-5.2s5.8 1.8 6.5 5.2"></path></svg>';
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
  const initials=name=>String(name||'EFL').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase().slice(0,2)||'E';
  const accountHref=()=>{
    let requested=document.body?.dataset?.accountReturn||'';
    if(!requested&&document.body?.dataset?.eflPage==='hq'){
      const current=new URL(location.href);
      current.searchParams.delete('_vercel_share');
      requested=`${current.pathname}${current.search}`;
    }
    const url=new URL('/account.html',location.origin);
    if(requested)url.searchParams.set('return',requested);
    return withShare(`${url.pathname}${url.search}`);
  };

  function makeDesktop(){
    const nav=qs('.nav');if(!nav)return null;
    let link=qs('#eflAccountNav');if(link){link.href=accountHref();return link}
    link=document.createElement('a');
    link.id='eflAccountNav';
    link.className='efl-account-nav';
    link.href=accountHref();
    link.setAttribute('aria-label','Sign in to EFL Franchise HQ');
    link.innerHTML=`<span class="efl-account-avatar">${userIcon}</span><span class="efl-account-copy"><strong>SIGN IN</strong><small>FRANCHISE HQ</small></span><span class="efl-account-badge" aria-label="Pending requests">0</span>`;
    const league=qs('#leagueMenu');
    nav.insertBefore(link,league||qs('#menuBtn')||null);
    return link;
  }

  function makeMobile(){
    const menu=qs('#mobileMenu');if(!menu)return null;
    let link=qs('#eflMobileAccount');if(link){link.href=accountHref();return link}
    link=document.createElement('a');
    link.id='eflMobileAccount';
    link.className='efl-mobile-account';
    link.href=accountHref();
    link.innerHTML='<span>Sign In · Franchise HQ</span><strong>0</strong>';
    menu.appendChild(link);
    return link;
  }

  function setHqLink(href){
    const navlinks=qs('.navlinks');
    const mobile=qs('#mobileMenu');
    const onHq=document.body?.dataset?.eflPage==='hq';
    let desktop=qs('#eflFranchiseHqNav');
    let mobileLink=qs('#eflMobileHq');
    if(!href&&!onHq){desktop?.remove();mobileLink?.remove();return}
    const fallback='/franchise-hq-v2.html';
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
    const target=withShare(href||fallback);
    if(desktop){desktop.href=target;desktop.classList.toggle('active',onHq);if(onHq)desktop.setAttribute('aria-current','page')}
    if(mobileLink){mobileLink.href=target;mobileLink.classList.toggle('active',onHq);if(onHq)mobileLink.setAttribute('aria-current','page')}
  }

  function render({signedIn=false,commissioner=false,primary=false,moderator=false,pending=0,name='',hqHref=''}={}){
    const desktop=qs('#eflAccountNav'),mobile=qs('#eflMobileAccount');
    const label=signedIn?shortName(name):'SIGN IN';
    const role=primary?'ADMIN':commissioner?'COMMISSIONER':moderator?'MODERATOR':'EFL MEMBER';
    if(desktop){
      desktop.classList.toggle('is-signed-in',signedIn);
      const avatar=desktop.querySelector('.efl-account-avatar');
      if(avatar)signedIn?avatar.textContent=initials(name):avatar.innerHTML=userIcon;
      desktop.querySelector('.efl-account-copy strong').textContent=label;
      desktop.querySelector('.efl-account-copy small').textContent=signedIn?(hqHref?'OPEN HQ':role):'FRANCHISE HQ';
      desktop.setAttribute('aria-label',signedIn?`Open ${name||'my'} EFL account`:'Sign in to EFL Franchise HQ');
      const badge=desktop.querySelector('.efl-account-badge');badge.textContent=String(pending||0);
      desktop.classList.toggle('has-pending',pending>0);
    }
    if(mobile){
      mobile.querySelector('span').textContent=signedIn?`${name||'My EFL Account'} · ${hqHref?'Open HQ':role}`:'Sign In · Franchise HQ';
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
        if(claimsRes.ok){const claims=await claimsRes.json().catch(()=>({}));pending=(claims.claims||[]).filter(c=>c.status==='pending').length}
      }
      render({signedIn:true,commissioner,primary,moderator,pending,name,hqHref});
    }catch{}
  }

  makeDesktop();makeMobile();render();hydrate();
})();
