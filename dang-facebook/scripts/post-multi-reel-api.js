#!/usr/bin/env node
/*
 * post-multi-reel-api.js — Đăng ĐA-PAGE từ bảng "Đăng Reel" (Lark Base) lên Facebook.
 *   • Loại = "Video"    → đăng REEL (Graph video_reels 3 pha: start → upload → finish/PUBLISHED).
 *   • Loại = "Hình ảnh" → đăng BÀI ẢNH (upload published=false → /feed đính kèm media_fbid).
 * Mỗi dòng tự chọn Page qua cột link "Page" (trỏ tới bảng fanpage) → dùng đúng ID + access_token của Page đó.
 * KHÔNG cần lark-cli; chỉ Node 18+ và app credentials (tenant token) để đọc/ghi Base + tải media.
 *
 * CỔNG KÍCH HOẠT: chỉ đăng dòng có cột "Đăng" ĐÃ ĐIỀN (khác rỗng) và "Trạng thái" ≠ "Thành công",
 *   có Page link + có file, và (Lịch đăng bài trống hoặc đã tới giờ). Đăng xong ghi Trạng thái + Log + Link bài đăng.
 *
 * Chạy:  node post-multi-reel-api.js            (đăng thật)
 *        node post-multi-reel-api.js --dry-run  (chỉ liệt kê, KHÔNG đăng, KHÔNG ghi Base)
 *
 * Bí mật qua BIẾN MÔI TRƯỜNG: LARK_APP_SECRET (bắt buộc). Token FB lấy TỪ bảng fanpage (không cần env).
 * Tùy chọn: LARK_APP_ID, LARK_APP_TOKEN, LARK_TABLE_ID (bảng Đăng Reel), PAGES_TABLE_ID (bảng fanpage),
 *           LARK_DOMAIN, GRAPH_VERSION, RESPECT_SCHEDULE, TRIGGER_GATE.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CFG = {
  APP_ID:       process.env.LARK_APP_ID    || '',
  APP_SECRET:   process.env.LARK_APP_SECRET|| '',
  APP_TOKEN:    process.env.LARK_APP_TOKEN || '',
  TABLE_ID:     process.env.LARK_TABLE_ID  || '',   // bảng "Đăng Reel"
  PAGES_TABLE:  process.env.PAGES_TABLE_ID || '',   // bảng fanpage (ID + access_token)
  LARK_DOMAIN:  process.env.LARK_DOMAIN    || 'https://open.larksuite.com',
  GRAPH_VERSION:process.env.GRAPH_VERSION  || 'v21.0',
  RESPECT_SCHEDULE: process.env.RESPECT_SCHEDULE !== 'false',
  // Cổng "nhấn nút Đăng": mặc định BẬT (chỉ đăng dòng đã điền cột "Đăng"). Đặt TRIGGER_GATE=false để đăng mọi dòng sẵn sàng.
  TRIGGER_GATE: process.env.TRIGGER_GATE !== 'false',
  // Nút bấm 1 dòng: nếu RECORD_ID có giá trị → CHỈ đăng đúng record đó, bỏ qua cổng tick + lịch (bấm nút = đồng ý đăng ngay).
  RECORD_ID: (process.env.RECORD_ID || '').trim(),
  // LỊCH TỰ ĐỘNG (cron): chỉ đăng dòng ĐÃ tới giờ "Lịch đăng bài" hoặc đã tick "Đăng"; dòng không hẹn & không tick → bỏ qua (tránh đăng nhầm nháp).
  SCHEDULE_MODE: process.env.SCHEDULE_MODE === 'true',
};
const GRAPH = `https://graph.facebook.com/${CFG.GRAPH_VERSION}`;
const DRY = process.argv.includes('--dry-run');
if (!DRY && !CFG.APP_SECRET) { console.error('!! Thiếu LARK_APP_SECRET — đặt qua biến môi trường.'); process.exit(1); }

const F = { trigger:'Đăng', link:'Page', type:'Loại', caption:'Nội dung', comment:'Comment ebook', media:'Ảnh/video',
            schedule:'Lịch đăng bài', status:'Trạng thái', log:'Log', linkPost:'Link bài đăng' };
const DONE = 'Thành công', FAIL = 'Thất bại';
const now = () => new Date().toISOString().replace('T',' ').slice(0,19);
const log = (...a) => console.log(now(), ...a);
const plain = v => v==null?'':typeof v==='string'?v:Array.isArray(v)?v.map(x=>x.text||x.name||'').join(''):(v.text||v.name||v.link||String(v));
// Cổng "Đăng": BẬT khi ô đánh dấu được tick (checkbox=true) hoặc single-select/text có giá trị (khác rỗng & khác "false").
// Ô checkbox CHƯA tick trả về false / vắng field → coi như CHƯA bật (không đăng nhầm).
const isTriggered = v => v===true || (v!=null && v!==false && plain(v).trim()!=='' && plain(v).trim().toLowerCase()!=='false');
const isVid = a => /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(a.name||'') || /^video/i.test(a.type||'');
const isImg = a => /\.(jpe?g|png|gif|webp|bmp)$/i.test(a.name||'') || /^image/i.test(a.type||'');
// Lấy record_ids từ cell link — API list trả MẢNG [{record_ids:[...]}], API 1-record trả OBJECT {record_ids:[...]}.
const linkRecIds = cell => { if(!cell) return [];
  const arr = Array.isArray(cell) ? cell : [cell]; let ids=[];
  for(const el of arr){ if(!el) continue;
    if(Array.isArray(el.record_ids)) ids=ids.concat(el.record_ids);
    else if(el.record_id) ids.push(el.record_id);
    else if(typeof el==='string') ids.push(el); }
  return ids.filter(Boolean); };

async function larkToken() {
  const r = await fetch(CFG.LARK_DOMAIN+'/open-apis/auth/v3/tenant_access_token/internal',
    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app_id:CFG.APP_ID,app_secret:CFG.APP_SECRET}) });
  const j = await r.json(); if (j.code!==0) throw new Error('Lark token: '+JSON.stringify(j)); return j.tenant_access_token;
}
async function listAll(tk, tableId) {
  let items=[], pt='';
  do { const r=await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${tableId}/records?page_size=200`+(pt?'&page_token='+pt:''),{headers:{Authorization:'Bearer '+tk}});
    const j=await r.json(); if(j.code!==0)throw new Error('list '+tableId+': '+JSON.stringify(j));
    items=items.concat(j.data.items||[]); pt=j.data.has_more?j.data.page_token:''; } while(pt);
  return items;
}
async function listFields(tk, tableId) {
  const r=await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${tableId}/fields?page_size=200`,{headers:{Authorization:'Bearer '+tk}});
  const j=await r.json(); if(j.code!==0)throw new Error('fields: '+JSON.stringify(j));
  return (j.data.items||[]).map(f=>({name:f.field_name,type:f.type}));
}
async function updateRow(tk, recId, fields) {
  const r=await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${CFG.TABLE_ID}/records/${recId}`,
    {method:'PUT',headers:{'Content-Type':'application/json; charset=utf-8',Authorization:'Bearer '+tk},body:JSON.stringify({fields})});
  const j=await r.json(); if(j.code!==0)throw new Error('update: '+JSON.stringify(j));
}
async function downloadMedia(tk, fileToken, out) {
  const tries=[ `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download?extra=${encodeURIComponent(JSON.stringify({bitablePerm:{tableId:CFG.TABLE_ID}}))}`,
                `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download` ];
  for (const u of tries) { const r=await fetch(u,{headers:{Authorization:'Bearer '+tk}});
    if (r.ok && (r.headers.get('content-type')||'').indexOf('json')<0) { const b=Buffer.from(await r.arrayBuffer()); fs.writeFileSync(out,b); return b.length; } }
  throw new Error('không tải được media từ Lark');
}
async function fbFetch(u,o){ const r=await fetch(u,o); const t=await r.text(); let j; try{j=JSON.parse(t)}catch{j={_raw:t}}
  if(!r.ok||j.error)throw new Error('FB '+r.status+': '+JSON.stringify(j.error||j._raw||j)); return j; }

// Đăng REEL: video_reels 3 pha (start → upload nhị phân → finish/PUBLISHED) rồi poll permalink.
async function postReel(pageId, token, file, caption) {
  const start=await fbFetch(`${GRAPH}/${pageId}/video_reels?upload_phase=start&access_token=${encodeURIComponent(token)}`,{method:'POST'});
  const videoId=start.video_id, uploadUrl=start.upload_url;
  if(!videoId||!uploadUrl)throw new Error('start thiếu video_id/upload_url');
  const buf=fs.readFileSync(file.path);
  await fbFetch(uploadUrl,{method:'POST',headers:{Authorization:`OAuth ${token}`,offset:'0',file_size:String(buf.length)},body:buf});
  await fbFetch(`${GRAPH}/${pageId}/video_reels`,{method:'POST',body:new URLSearchParams({upload_phase:'finish',video_id:videoId,video_state:'PUBLISHED',description:caption||'',access_token:token})});
  let permalink='';
  for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,6000));
    try{ const st=await fbFetch(`${GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(token)}`,{method:'GET'});
      const phase=st.status&&(st.status.video_status||(st.status.processing_phase&&st.status.processing_phase.status));
      if(st.permalink_url)permalink=st.permalink_url;
      if(phase==='ready'||phase==='PUBLISHED'||(st.status&&st.status.video_status==='ready'))break;
      if(phase==='error')throw new Error('FB xử lý lỗi: '+JSON.stringify(st.status)); }catch(e){}
  }
  if(permalink&&permalink.startsWith('/'))permalink='https://www.facebook.com'+permalink;
  return { objectId:videoId, permalink:permalink||`https://www.facebook.com/reel/${videoId}` };
}
// Đăng bài nhiều ảnh: upload từng ảnh (published=false) → media_fbid → tạo post /feed đính kèm.
async function postPhotos(pageId, token, files, caption) {
  const fbids=[];
  for (const f of files) {
    const fd=new FormData(); fd.set('access_token',token); fd.set('published','false');
    fd.set('source', new Blob([fs.readFileSync(f.path)]), f.name||'photo.jpg');
    const j=await fbFetch(`${GRAPH}/${pageId}/photos`,{method:'POST',body:fd});
    if(!j.id) throw new Error('upload ảnh không có id'); fbids.push(j.id);
  }
  const body=new URLSearchParams(); body.set('access_token',token); if(caption)body.set('message',caption);
  fbids.forEach((id,i)=>body.set(`attached_media[${i}]`, JSON.stringify({media_fbid:id})));
  const post=await fbFetch(`${GRAPH}/${pageId}/feed`,{method:'POST',body});
  return { objectId:post.id, permalink:`https://www.facebook.com/${post.id}` };
}
async function postComment(pageId, token, objectId, message){
  return fbFetch(`${GRAPH}/${objectId}/comments`,{method:'POST',body:new URLSearchParams({message,access_token:token})});
}
function scheduleMs(cell){ if(cell==null)return null; if(typeof cell==='number')return cell; // Lark datetime = epoch ms
  const t=plain(cell).trim(); if(!t)return null;
  const m=t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); if(m)return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime();
  const d=new Date(t); return isNaN(d)?null:d.getTime(); }

(async()=>{
  const tk=await larkToken();
  // Tự dò cột link tới bảng fanpage (type 18 single-link / 21 duplex-link) nếu tên khác "Page".
  let LINKPOST_TYPE=15;  // kiểu cột "Link bài đăng": 15=Url (1 link) · 1=Text (nhiều link)
  try {
    const flds=await listFields(tk, CFG.TABLE_ID);
    const lf=flds.find(f=>f.name===F.link) || flds.find(f=>f.type===18||f.type===21) || flds.find(f=>/page/i.test(f.name));
    if(lf) F.link=lf.name;
    const lp=flds.find(f=>f.name===F.linkPost); if(lp) LINKPOST_TYPE=lp.type;
    log(`Cột link Page = "${F.link}". Cột "Link bài đăng" kiểu ${LINKPOST_TYPE===1?'Text (nhiều link)':LINKPOST_TYPE===15?'Url (1 link)':LINKPOST_TYPE}. Cổng "${F.trigger}" = ${CFG.TRIGGER_GATE?'BẬT':'TẮT'}.`);
  } catch(e){ log('! không đọc được fields, dùng mặc định "'+F.link+'": '+String(e.message||e)); }
  // map record_id (bảng fanpage) -> {fbId, token, name}
  const pageRecs=await listAll(tk, CFG.PAGES_TABLE);
  const pageMap=new Map();
  for(const r of pageRecs){ pageMap.set(r.record_id, { fbId:plain(r.fields.ID).trim(), token:plain(r.fields.access_token).trim(), name:plain(r.fields.Fanpage).trim() }); }
  log(`Bảng fanpage: ${pageMap.size} Page.`);

  const rows=await listAll(tk, CFG.TABLE_ID);
  log(`Bảng Đăng Reel: ${rows.length} dòng.`);
  const nowMs=Date.now();
  let ok=0,err=0,wait=0,skip=0;
  for(const row of rows){
    const recId=row.record_id;
    if(CFG.RECORD_ID && recId!==CFG.RECORD_ID) { skip++; continue; }                   // nút 1 dòng: chỉ đăng đúng record được bấm
    if(plain(row.fields[F.status])===DONE) { skip++; continue; }                      // đã đăng thành công
    const pageRecIds=linkRecIds(row.fields[F.link]);                                    // TẤT CẢ Page đã chọn trong ô "Page"
    const atts=Array.isArray(row.fields[F.media])?row.fields[F.media]:[];
    if(pageRecIds.length===0 || atts.length===0) { skip++; continue; }                  // chưa chọn Page / chưa có file

    if(!CFG.RECORD_ID){
      const s=scheduleMs(row.fields[F.schedule]);
      if(CFG.RESPECT_SCHEDULE && s!=null && s>nowMs){ log(`  [CHỜ GIỜ] ${recId}: hẹn ${new Date(s).toISOString().slice(0,16)}`); wait++; continue; } // hẹn tương lai → chờ
      const ticked=isTriggered(row.fields[F.trigger]);
      if(CFG.SCHEDULE_MODE){ if(!(s!=null || ticked)){ skip++; continue; } }             // lịch tự động: cần có hẹn giờ (đã tới) hoặc đã tick
      else if(CFG.TRIGGER_GATE && !ticked){ skip++; continue; }                          // chạy tay: cần tick cột "Đăng"
    }

    const caption=plain(row.fields[F.caption]);
    const loai=plain(row.fields[F.type]);
    // Loại quyết định luồng; nếu trống thì suy từ đuôi file.
    let kind = /video/i.test(loai) ? 'video' : /ảnh|hình|image|photo/i.test(loai) ? 'image' : (atts.some(isVid)?'video':'image');
    const files = kind==='video' ? [ atts.find(isVid)||atts[0] ] : atts.filter(a=>isImg(a)||!isVid(a));
    log(`  >> ${recId} | ${pageRecIds.length} Page | ${kind==='video'?'REEL':'ẢNH'} | ${files.length} file | "${caption.slice(0,40).replace(/\n/g,' ')}"`);
    if(DRY){ pageRecIds.forEach(prid=>{const p=pageMap.get(prid); log(`     [DRY] → ${p?p.name:prid}`);}); const c=plain(row.fields[F.comment]).trim(); if(c)log(`     [DRY] comment: ${c.slice(0,60)}`); continue; }

    const tmp=[];
    try{
      // Tải media 1 lần, dùng chung cho MỌI Page.
      for(let i=0;i<files.length;i++){ const f=files[i]; const p=path.join(os.tmpdir(),`reel_${recId}_${i}_${(f.name||'m').replace(/[^\w.]/g,'')}`);
        await downloadMedia(tk,f.file_token,p); f.path=p; tmp.push(p); }
      const commentText=plain(row.fields[F.comment]).trim();
      const links=[], linkLines=[], logs=[]; let okN=0, failN=0;
      // Đăng lần lượt lên TỪNG Page đã chọn.
      for(const prid of pageRecIds){
        const pg=pageMap.get(prid);
        if(!pg||!pg.fbId||!pg.token){ failN++; logs.push(`${prid}: thiếu ID/token`); log(`     ✖ ${prid}: Page thiếu ID/token trong bảng fanpage`); continue; }
        try{
          const res = kind==='video' ? await postReel(pg.fbId,pg.token,files[0],caption)
                                      : await postPhotos(pg.fbId,pg.token,files,caption);
          let cmtNote='';
          if(commentText){ try{ await postComment(pg.fbId,pg.token,res.objectId,commentText); cmtNote=' +cmt'; }
            catch(e){ cmtNote=' (cmt lỗi)'; log(`     ! comment lỗi (${pg.name}): ${String(e.message||e).slice(0,100)}`); } }
          links.push(res.permalink); linkLines.push(`${pg.name}: ${res.permalink}`); logs.push(`${pg.name}: OK${cmtNote}`); okN++;
          log(`     ✔ ${pg.name}: ${res.permalink}`);
        }catch(e){ const msg=String(e.message||e).slice(0,200); failN++; logs.push(`${pg.name}: LỖI ${msg}`); log(`     ✖ ${pg.name}: ${msg}`); }
      }
      // "Thành công" nếu có ≥1 Page lên (tránh đăng lại Page đã OK khi bấm lại); log liệt kê từng Page.
      const fields={ [F.status]: okN>0?DONE:FAIL, [F.log]:`${now()} - ${okN}/${pageRecIds.length} Page OK | ${logs.join(' || ')}`.slice(0,900) };
      // Ghi link TẤT CẢ Page đã đăng vào "Link bài đăng": Text → mỗi Page 1 dòng; Url → chỉ được 1 link.
      if(links.length){ fields[F.linkPost] = LINKPOST_TYPE===1 ? linkLines.join('\n')
                                                              : {link:links[0], text: okN>1?`Xem (${okN} Page)`:'Xem bài'}; }
      await updateRow(tk,recId,fields);
      if(okN>0) ok++; else err++;
    }catch(e){ const msg=String(e.message||e).slice(0,300); log(`     ✖ LỖI: ${msg}`);
      try{await updateRow(tk,recId,{[F.status]:FAIL,[F.log]:`${now()} - LỖI - ${msg}`});}catch{} err++;
    }finally{ tmp.forEach(p=>{try{fs.unlinkSync(p)}catch{}}); }
  }
  log(`Xong. Đăng: ${ok}, Lỗi: ${err}, Chờ giờ: ${wait}, Bỏ qua: ${skip}.`);
})().catch(e=>{console.error('FATAL',e.message||e);process.exit(1);});
