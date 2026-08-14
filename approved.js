
import { db, ensureTable, json } from './_common.js';
export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  try{
    const sql=db(); await ensureTable(sql);
    const rows=await sql`
      SELECT DISTINCT ON (team_name)
      id,team_name,owner_name,motto,stadium,primary_color,secondary_color,franchise_player,nemesis,quote,story,logo_data,reviewed_at
      FROM franchise_submissions
      WHERE status='approved'
      ORDER BY team_name, reviewed_at DESC, id DESC
    `;
    res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
    return json(res,200,{profiles:rows});
  }catch(e){ console.error(e); return json(res,500,{error:'Could not load approved profiles'}); }
}
