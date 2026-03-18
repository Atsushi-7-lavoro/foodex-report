export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const SB = process.env.SUPABASE_URL, SK = process.env.SUPABASE_SERVICE_KEY;
  if (!SB || !SK) return res.status(500).json({error:"Supabase not configured"});
  const hd = {apikey:SK,Authorization:"Bearer "+SK,"Content-Type":"application/json"};
  async function sb(p,m,b){const o={method:m,headers:{...hd}};if(m==="POST")o.headers.Prefer="return=representation";if(b)o.body=JSON.stringify(b);const r=await fetch(SB+"/rest/v1/"+p,o);if(m==="DELETE")return null;return r.json();}
  try {
    if (req.method === "GET") {
      const rid = req.query.report_id || "foodex-2026";
      const [reps,cards,gal] = await Promise.all([sb("reports?id=eq."+rid+"&select=*","GET"),sb("cards?report_id=eq."+rid+"&select=*&order=sort_order.asc","GET"),sb("gallery?report_id=eq."+rid+"&select=*&order=sort_order.asc","GET")]);
      return res.status(200).json({report:reps[0]||null,cards:cards||[],gallery:gal||[]});
    }
    if (req.method === "POST") {
      const {action,report_id}=req.body, rid=report_id||"foodex-2026";
      if(action==="save_cards"){await sb("cards?report_id=eq."+rid,"DELETE");const c=req.body.cards||[];if(c.length>0){const rows=c.map((x,i)=>({report_id:rid,company:x.company||"",products:x.products||"",country:x.country||"",hp:x.hp||"",contact:x.contact||"",tel:x.tel||"",email:x.email||"",tags:x.tags||[],priority:x.priority||0,taken_at:x.takenAt||0,sort_order:i}));await sb("cards","POST",rows);}return res.status(200).json({ok:true});}
      if(action==="save_gallery"){await sb("gallery?report_id=eq."+rid,"DELETE");const g=req.body.gallery||[];if(g.length>0){const rows=g.map((x,i)=>({report_id:rid,data:x.data||x,taken_at:x.takenAt||0,sort_order:i}));await sb("gallery","POST",rows);}return res.status(200).json({ok:true});}
      if(action==="add_card"){const c=req.body.card,cnt=await sb("cards?report_id=eq."+rid+"&select=id","GET");await sb("cards","POST",[{report_id:rid,company:c.company||"",products:c.products||"",country:c.country||"",hp:c.hp||"",contact:c.contact||"",tel:c.tel||"",email:c.email||"",tags:c.tags||[],priority:c.priority||0,taken_at:c.takenAt||0,sort_order:cnt?cnt.length:0}]);return res.status(200).json({ok:true});}
      if(action==="add_image"){const img=req.body.image,cnt=await sb("gallery?report_id=eq."+rid+"&select=id","GET");await sb("gallery","POST",[{report_id:rid,data:img.data||img,taken_at:img.takenAt||0,sort_order:cnt?cnt.length:0}]);return res.status(200).json({ok:true});}
      if(action==="delete_card"){await sb("cards?id=eq."+req.body.card_id,"DELETE");return res.status(200).json({ok:true});}
      if(action==="delete_image"){await sb("gallery?id=eq."+req.body.image_id,"DELETE");return res.status(200).json({ok:true});}
      if(action==="update_card"){const u={};if(req.body.tags!==undefined)u.tags=req.body.tags;if(req.body.priority!==undefined)u.priority=req.body.priority;await fetch(SB+"/rest/v1/cards?id=eq."+req.body.card_id,{method:"PATCH",headers:hd,body:JSON.stringify(u)});return res.status(200).json({ok:true});}
      return res.status(400).json({error:"Unknown action"});
    }
    return res.status(405).json({error:"Method not allowed"});
  } catch(e){console.error(e);return res.status(500).json({error:e.message});}
}
