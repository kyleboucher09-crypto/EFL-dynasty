import {json,noStore} from './_common.js';
import {discord,discordConfigured} from './discord-lib.js';

const KEY='efl-start-here-legacy-8f23';
const CHANNEL_ID='1544063372318736395';
const MESSAGE_ID='1544063373451460641';
const LOGO='https://www.efldynasty.com/Assets/efl-logo.jpeg?v=efl-2026-08-31';

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(String(req.query?.key||'')!==KEY) return json(res,401,{error:'Unauthorized'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot not configured'});
  try{
    const body={
      allowed_mentions:{parse:[]},
      embeds:[{
        title:'👋 WELCOME TO THE EFL',
        description:'**This is the new clubhouse for Elite Fantasy Footballers.**\n\nYou do not need to learn every Discord feature. Three things matter:',
        color:3447003,
        thumbnail:{url:LOGO},
        fields:[
          {name:'💬 DISCORD = THE CLUBHOUSE',value:'League conversation, reactions and trash talk live here. Start in <#1543925966482786426>. Trade chatter belongs in <#1543925968797925377>, and league games live in <#1543925970928633977>.',inline:false},
          {name:'🏈 SLEEPER = YOUR TEAM',value:'Keep using Sleeper for lineups, waivers, trades, rosters and matchup management. Important Sleeper activity automatically flows back into Discord.',inline:false},
          {name:'🌐 EFLDYNASTY.COM = THE OFFICIAL HOME',value:'Power Rankings, EFL Weekly, the **Legacy System**, league history, champions, records, franchises and the rulebook all live on the website.',inline:false},
          {name:'👑 THE SIMPLE VERSION',value:'**Talk here. Manage your team on Sleeper. Find official league content and Legacy on the website.**',inline:false}
        ],
        footer:{text:'Elite Fantasy Footballers • Dynasty'}
      }],
      components:[{type:1,components:[
        {type:2,style:5,label:'Start in General',url:'https://discord.com/channels/1543925965698322504/1543925966482786426',emoji:{name:'💬'}},
        {type:2,style:5,label:'Open EFL Website',url:'https://www.efldynasty.com/',emoji:{name:'🌐'}},
        {type:2,style:5,label:'Open Sleeper',url:'https://sleeper.com/leagues/1313240395462742016',emoji:{name:'🏈'}}
      ]}]
    };
    const post=await discord(`/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}`,{method:'PATCH',body});
    return json(res,200,{ok:true,message_id:post.id,legacy_added:true});
  }catch(e){return json(res,502,{error:e.message||'Start-here update failed'})}
}
