(()=>{
  const stage=document.querySelector('#accountStage');
  if(!stage)return;
  const notify=()=>{if(!stage.classList.contains('hidden'))window.dispatchEvent(new Event('efl-account-refreshed'))};
  new MutationObserver(notify).observe(stage,{attributes:true,attributeFilter:['class']});
  document.querySelector('#refreshAccount')?.addEventListener('click',()=>setTimeout(notify,350));
  notify();
})();
