(()=>{
  const params=new URLSearchParams(location.search);
  const requested=params.get('return')||'';
  if(!requested)return;
  const share=params.get('_vercel_share')||'';
  const allowed=new Set(['/commissioner-link.html','/franchise-hq-v2.html']);
  let destination;
  try{
    const parsed=new URL(requested,location.origin);
    if(parsed.origin!==location.origin||!allowed.has(parsed.pathname))return;
    parsed.searchParams.delete('_vercel_share');
    if(share)parsed.searchParams.set('_vercel_share',share);
    destination=`${parsed.pathname}${parsed.search}${parsed.hash}`;
  }catch{return}

  let redirected=false;
  function maybeReturn(){
    if(redirected)return;
    const stage=document.querySelector('#accountStage');
    if(!stage||stage.classList.contains('hidden'))return;
    redirected=true;
    location.replace(destination);
  }
  const stage=document.querySelector('#accountStage');
  if(stage)new MutationObserver(maybeReturn).observe(stage,{attributes:true,attributeFilter:['class']});
  maybeReturn();
  setTimeout(maybeReturn,800);
})();
