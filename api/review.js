import { db, ensureTable, json, commissionerOK, clean, noStore, sameOrigin } from './_common.js';
export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req)) return json(res,403,{error:'Forbidden'});
  if(!commissionerOK(req)) return json(res,401,{error:'Unauthorized'});
  try{
    const sql=db(); await ensureTable(sql);
    const id=Number(req.body?.id);
    const status=['approved','rejected','pending'].includes(req.body?.status)?req.body.status:null;
    const note=clean(req.body?.note,500);
    if(!id||!status) return json(res,400,{error:'Invalid request'});
    const rows=await sql`
      UPDATE franchise_submissions
      SET status=${status}, reviewed_at=NOW(), review_note=${note}
      WHERE id=${id}
      RETURNING id,status
    `;
    if(!rows.length) return json(res,404,{error:'Not found'});
    return json(res,200,{ok:true,...rows[0]});
  }catch(e){ console.error(e); return json(res,500,{error:'Review failed'}); }
}
