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

  function installStyles(){
    if(qs('#eflAccountNavStyles'))return;
    const style=document.createElement('style');
    style.id='eflAccountNavStyles';
    style.textContent=`
      .efl-account-nav{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 12px;border-radius:12px;border:1px solid rgba(232,184,74,.34);background:linear-gradient(135deg,rgba(232,184,74,.12),rgba(125,34,201,.12));color:#ffe08a!important;font-size:9px;font-weight:1000;letter-spacing:.07em;white-space:nowrap;transition:border-color .18s,background .18s,transform .18s}
      .efl-account-nav:hover{border-color:rgba(255,215,108,.68);background:linear-gradient(135deg,rgba(232,184,74,.2),rgba(125,34,201,.2));transform:translateY(-1px)}
      .efl-account-nav .efl-account-icon{font-size:13px;line-height:1}
      .efl-account-nav .efl-account-badge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:none;align-items:center;justify-content:center;background:#ff596f;color:#fff;font-size:8px;line-height:1;box-shadow:0 0 0 2px #08060b}
      .efl-account-nav.has-pending .efl-account-badge{display:inline-flex}
      .mobile-menu .efl-mobile-account{border:1px solid rgba(232,184,74,.3);background:linear-gradient(135deg,rgba(232,184,74,.1),rgba(125,34,201,.1));color:#ffe08a}
      .mobile-menu .efl-mobile-account strong{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:none;align-items:center;justify-content:center;background:#ff596f;color:#fff;font-size:9px}
      .mobile-menu .efl-mobile-account.has-pending strong{display:inline-flex}
      @media(max-width:980px){.efl-account-nav{padding:0 10px}.efl-account-nav .efl-account-label{font-size:8px}}
      @media(max-width:760px){.nav>.efl-account-nav{margin-left:auto;padding:0 9px}.nav>.efl-account-nav .efl-account-label{display:none}.nav>.efl-account-nav{width:42px}.navlinks{display:none!important}}
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
    link.innerHTML='<span class="efl-account-icon">👤</span><span class="efl-account-label">LOG IN</span><span class="efl-account-badge" aria-label="Pending requests">0</span>';
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

  function render({signedIn=false,commissioner=false,pending=0}={}){
    const desktop=qs('#eflAccountNav'),mobile=qs('#eflMobileAccount');
    const icon=signedIn?(commissioner?'👑':'👤'):'👤';
    const label=signedIn?'MY ACCOUNT':'LOG IN';
    if(desktop){
      desktop.querySelector('.efl-account-icon').textContent=icon;
      desktop.querySelector('.efl-account-label').textContent=label;
      desktop.setAttribute('aria-label',signedIn?'Open my EFL account':'Log in to EFL');
      const badge=desktop.querySelector('.efl-account-badge');badge.textContent=String(pending||0);
      desktop.classList.toggle('has-pending',pending>0);
    }
    if(mobile){
      mobile.querySelector('span').textContent=`${icon} ${signedIn?'My EFL Account':'Log In / Account'}`;
      mobile.querySelector('strong').textContent=String(pending||0);
      mobile.classList.toggle('has-pending',pending>0);
    }
  }

  async function hydrate(){
    try{
      const sessionRes=await api('/api/auth/get-session');
      if(!sessionRes.ok)return;
      const session=await sessionRes.json().catch(()=>null);
      if(!session?.user)return;
      let commissioner=false,pending=0;
      const accountRes=await api('/api/efl-account');
      if(accountRes.ok){
        const data=await accountRes.json().catch(()=>({}));
        const account=data?.account||{};
        commissioner=account?.profile?.site_role==='commissioner'||(account?.staffRoles||[]).some(r=>r.role==='commissioner');
      }
      if(commissioner){
        const claimsRes=await api('/api/commissioner-account-claims');
        if(claimsRes.ok){const claims=await claimsRes.json().catch(()=>({}));pending=(claims.claims||[]).filter(c=>c.status==='pending').length;}
      }
      render({signedIn:true,commissioner,pending});
    }catch{}
  }

  installStyles();makeDesktop();makeMobile();render();hydrate();
})();
