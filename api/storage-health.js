import { db, ensureTable, json, commissionerOK, noStore, sameOrigin } from './_common.js';

export default async function handler(req,res){
  noStore(res);
  res.setHeader('Allow','GET');
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req)) return json(res,403,{error:'Forbidden'});
  if(!commissionerOK(req)) return json(res,401,{error:'Unauthorized'});

  const blobConfigured=Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  let database={ok:false,schemaReady:false};
  try{
    const sql=db();
    await ensureTable(sql);
    const rows=await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='franchise_submissions' AND column_name='logo_url'
      ) AS logo_url_ready
    `;
    database={ok:true,schemaReady:Boolean(rows?.[0]?.logo_url_ready)};
  }catch(e){
    console.error('Storage health database check failed',e);
  }

  return json(res,200,{
    ok:database.ok && database.schemaReady,
    blob:{configured:blobConfigured,mode:blobConfigured?'vercel-blob':'database-fallback'},
    database
  });
}
