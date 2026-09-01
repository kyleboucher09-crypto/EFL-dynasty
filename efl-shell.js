(()=>{
  const q=s=>document.querySelector(s);
  const btn=q('#menuBtn'),menu=q('#mobileMenu'),league=q('#leagueMenu'),leagueBtn=q('#leagueMenuBtn');
  const closeMenu=()=>{if(!menu)return;menu.classList.remove('open');btn?.setAttribute('aria-expanded','false');if(btn)btn.textContent='☰'};
  const closeLeague=()=>{if(!league)return;league.classList.remove('open');leagueBtn?.setAttribute('aria-expanded','false')};
  if(btn&&menu&&!btn.dataset.eflShellReady){
    btn.dataset.eflShellReady='1';
    btn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=menu.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'✕':'☰';if(open)closeLeague()});
  }
  if(league&&leagueBtn&&!leagueBtn.dataset.eflShellReady){
    leagueBtn.dataset.eflShellReady='1';
    leagueBtn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=league.classList.toggle('open');leagueBtn.setAttribute('aria-expanded',String(open));if(open)closeMenu()});
  }
  document.addEventListener('click',event=>{if(menu?.classList.contains('open')&&!menu.contains(event.target)&&event.target!==btn)closeMenu();if(league?.classList.contains('open')&&!league.contains(event.target))closeLeague()});
})();
