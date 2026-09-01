(()=>{
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const grid=document.querySelector('#shopGrid');
    const search=document.querySelector('#cosmeticSearch');
    if(grid&&search){
      clearInterval(timer);
      const restore=()=>{if(grid.querySelector('.shop-card'))search.dispatchEvent(new Event('input',{bubbles:true}))};
      new MutationObserver(restore).observe(grid,{childList:true});
      setTimeout(restore,250);
      setTimeout(restore,1000);
    }else if(tries>120)clearInterval(timer);
  },50);
})();
