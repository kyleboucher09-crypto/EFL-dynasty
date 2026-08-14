
import { db, ensureTable, json, commissionerOK } from './_common.js';
export default async function handler(req,res){
  if(!commissionerOK(req)) return json(res,401,{error:'Unauthorized'});
  try{
    const sql=db(); await ensureTable(sql);
    if(req.method==='GET'){
      const rows=await sql`SELECT * FROM franchise_submissions ORDER BY created_at DESC LIMIT 100`;
      return json(res,200,{submissions:rows});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){ console.error(e); return json(res,500,{error:'Could not load submissions'}); }
}
