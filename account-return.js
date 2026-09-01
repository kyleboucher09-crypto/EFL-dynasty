(()=>{
  const params=new URLSearchParams(location.search);
  const target=params.get('return')||'';
  if(target!=='commissioner-link.html')return;
  const share=params.get('_vercel_share')||'';
  let redirected=false;
  function maybeReturn(){
    if(redirected)return;
    const stage=document.querySelector('#accountStage');
    if(!stage||stage.classList.contains('hidden'))return;
    redirected=true;
    const url=new URL('commissioner-link.html',location.href);
    if(share)url.searchParams.set('_vercel_share',share);
    location.replace(`${url.pathname}${url.search}`);
  }
  const observer=new MutationObserver(maybeReturn);
  const stage=document.querySelector('#accountStage');
  if(stage)observer.observe(stage,{attributes:true,attributeFilter:['class']});
  maybeReturn();
  setTimeout(maybeReturn,800);
})();
