let currentEvents=[],currentConfig={},generatedEvents=[],generatedConfig={},report={};
const $=id=>document.getElementById(id);
const FIELD_MAP={
  "公式名称":"officialName","officialName":"officialName",
  "event_id":"id","id":"id","sort":"sort",
  "カテゴリ":"category","category":"category",
  "年月":"period","period":"period",
  "関連作品":"work","work":"work",
  "official_url":"officialUrl","officialUrl":"officialUrl",
  "addedDate":"addedDate"
};
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
function deriveWork(row){
  const raw=String(row.work||"").trim();
  if(raw&&raw!==`${row.category}\n${row.period}`&&raw!==`${row.category}\r\n${row.period}`)return raw;
  const matches=String(row.officialName||"").match(/[（(]([^（）()]*)[）)]/g);
  return matches?.length?matches.at(-1).slice(1,-1):String(row.officialName||"").trim();
}
function normalizeRows(rows){
  const today=new Date().toISOString().slice(0,10);
  const currentById=new Map(currentEvents.map(e=>[e.id,e]));
  return rows.filter(row=>row&&Object.values(row).some(v=>String(v??"").trim())).map(row=>{
    const mapped={};
    Object.entries(row).forEach(([key,value])=>{const target=FIELD_MAP[String(key).trim()];if(target)mapped[target]=value});
    const id=String(mapped.id??"").trim();
    const old=currentById.get(id);
    const item={
      officialName:String(mapped.officialName??"").trim(),
      id,
      sort:Number(mapped.sort),
      category:String(mapped.category??"").trim(),
      period:String(mapped.period??"").trim(),
      work:String(mapped.work??"").trim(),
      officialUrl:String(mapped.officialUrl??"").trim(),
      addedDate:String(mapped.addedDate||old?.addedDate||today).trim()
    };
    item.work=deriveWork(item);
    return item;
  }).sort((a,b)=>a.sort-b.sort);
}
function parseFile(file){
  return new Promise((resolve,reject)=>{
    const ext=file.name.split(".").pop().toLowerCase();
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("ファイルを読み込めませんでした"));
    reader.onload=()=>{
      try{
        if(ext==="json"){
          const value=JSON.parse(reader.result);
          resolve(Array.isArray(value)?value:value.events||[]);
          return;
        }
        if(typeof XLSX==="undefined")throw new Error("Excel解析ライブラリを読み込めません。通信状態を確認してください");
        const book=XLSX.read(reader.result,{type:ext==="csv"?"string":"array"});
        const sheet=book.Sheets[book.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet,{defval:"",raw:false}));
      }catch(error){reject(error)}
    };
    ext==="json"||ext==="csv"?reader.readAsText(file):reader.readAsArrayBuffer(file);
  });
}
function validate(items){
  const issues=[],idMap=new Map(),sortMap=new Map();
  const allowed=["通常","イベント","コラボ"];
  items.forEach((e,index)=>{
    const row=index+2;
    ["officialName","id","sort","category","period"].forEach(field=>{if(e[field]===""||e[field]===null||e[field]===undefined||field==="sort"&&!Number.isFinite(e.sort))issues.push({level:"error",message:`${row}行目：${field} がありません`})});
    if(e.id){if(idMap.has(e.id))issues.push({level:"error",message:`event_id重複：${e.id}（${idMap.get(e.id)}行目・${row}行目）`});else idMap.set(e.id,row)}
    if(Number.isFinite(e.sort)){if(sortMap.has(e.sort))issues.push({level:"error",message:`sort重複：${e.sort}`});else sortMap.set(e.sort,row)}
    if(e.category&&!allowed.includes(e.category))issues.push({level:"error",message:`${e.id||row}：カテゴリ「${e.category}」は使用できません`});
    if(!e.officialUrl)issues.push({level:"warning",message:`${e.id||row}：公式URLが空欄です`});
    else if(!/^https:\/\//i.test(e.officialUrl))issues.push({level:"warning",message:`${e.id||row}：URLがHTTPSではありません`});
    if(e.addedDate&&!/^\d{4}-\d{2}-\d{2}$/.test(e.addedDate))issues.push({level:"error",message:`${e.id||row}：addedDate形式が不正です`});
    const nameYear=String(e.officialName).match(/20\d{2}/)?.[0],periodYear=String(e.period).match(/20\d{2}/)?.[0];
    if(nameYear&&periodYear&&nameYear!==periodYear)issues.push({level:"warning",message:`${e.id}：イベント名と年月の年代が異なります`});
  });
  const sorted=[...sortMap.keys()].sort((a,b)=>a-b);
  for(let i=1;i<sorted.length;i++)if(sorted[i]!==sorted[i-1]+1)issues.push({level:"warning",message:`sort欠番：${sorted[i-1]}の次が${sorted[i]}です`});
  return issues;
}
function compare(items){
  const oldById=new Map(currentEvents.map(e=>[e.id,e])),newById=new Map(items.map(e=>[e.id,e]));
  const fields=["officialName","sort","category","period","work","officialUrl"];
  const added=items.filter(e=>!oldById.has(e.id));
  const removed=currentEvents.filter(e=>!newById.has(e.id));
  const changed=[];
  items.forEach(e=>{
    const old=oldById.get(e.id);if(!old)return;
    const changes=fields.filter(field=>String(old[field]??"")!==String(e[field]??"")).map(field=>({field,before:old[field],after:e[field]}));
    if(changes.length)changed.push({event:e,changes});
  });
  const idMigrations={};
  const oldBySort=new Map(currentEvents.map(e=>[Number(e.sort),e]));
  items.forEach(e=>{const old=oldBySort.get(Number(e.sort));if(old&&old.id!==e.id&&!newById.has(old.id))idMigrations[old.id]=e.id});
  return {added,removed,changed,idMigrations};
}
function rowHtml(title,meta){return `<div class="diff-row"><b>${esc(title)}</b><span>${esc(meta)}</span></div>`}
function render(items,issues,diff){
  const errors=issues.filter(x=>x.level==="error");
  const warnings=issues.filter(x=>x.level==="warning");
  $("resultSection").classList.remove("hidden");
  $("summaryCards").innerHTML=[
    ["イベント",items.length],["追加",diff.added.length],["変更",diff.changed.length],["削除",diff.removed.length]
  ].map(([label,value])=>`<div class="summary-card"><b>${value}</b><span>${label}</span></div>`).join("");
  $("resultBadge").className=`badge ${errors.length?"ng":"ok"}`;
  $("resultBadge").textContent=`${errors.length}エラー・${warnings.length}警告`;
  $("issueList").innerHTML=issues.length?issues.slice(0,100).map(x=>`<div class="issue ${x.level}">${esc(x.message)}</div>`).join(""):'<div class="perfect">✅ 重複・必須項目・sort・URL形式に問題はありません。</div>';
  const groups=[
    ["追加",diff.added.map(e=>rowHtml(`${e.sort}｜${e.officialName}`,e.id))],
    ["変更",diff.changed.map(x=>rowHtml(`${x.event.sort}｜${x.event.officialName}`,x.changes.map(c=>c.field).join("、")))],
    ["削除",diff.removed.map(e=>rowHtml(`${e.sort}｜${e.officialName}`,e.id))]
  ];
  $("diffList").innerHTML=groups.map(([label,rows])=>`<div class="diff-group"><h3>${label} ${rows.length}件</h3>${rows.length?rows.join(""):'<div class="diff-row">該当なし</div>'}</div>`).join("");
  ["downloadEvents","downloadConfig","downloadZip"].forEach(id=>$(id).disabled=!!errors.length);
  generatedEvents=items;
  generatedConfig={...currentConfig,version:"1.02",schemaVersion:2,dataVersion:new Date().toISOString().slice(0,10),dataUpdatedAt:new Date().toISOString().slice(0,10),eventIdMigrations:{...(currentConfig.eventIdMigrations||{}),...diff.idMigrations}};
  report={createdAt:new Date().toISOString(),summary:{events:items.length,errors:errors.length,warnings:warnings.length,added:diff.added.length,changed:diff.changed.length,removed:diff.removed.length},issues,diff:{added:diff.added.map(e=>e.id),changed:diff.changed.map(e=>e.event.id),removed:diff.removed.map(e=>e.id)},eventIdMigrations:diff.idMigrations};
}
function download(name,data,type="application/json"){
  const blob=new Blob([typeof data==="string"?data:JSON.stringify(data,null,2)],{type});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function downloadZip(){
  if(typeof JSZip==="undefined"){alert("ZIP生成ライブラリを読み込めません。通信状態を確認してください");return}
  const zip=new JSZip();
  zip.file("data/events.json",JSON.stringify(generatedEvents,null,2)+"\n");
  zip.file("data/config.json",JSON.stringify(generatedConfig,null,2)+"\n");
  zip.file("update-report.json",JSON.stringify(report,null,2)+"\n");
  const blob=await zip.generateAsync({type:"blob"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`equal-love-data-update-${generatedConfig.dataUpdatedAt}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
Promise.all([
  fetch("../data/events.json",{cache:"no-store"}).then(r=>r.json()),
  fetch("../data/config.json",{cache:"no-store"}).then(r=>r.json())
]).then(([events,config])=>{currentEvents=events;currentConfig=config}).catch(error=>{$("fileStatus").textContent=`現在データの読み込みに失敗しました：${error.message}`});
$("masterFile").onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  $("fileStatus").textContent=`${file.name} を検査しています…`;
  try{
    const rows=await parseFile(file);
    const items=normalizeRows(rows);
    const issues=validate(items);
    const diff=compare(items);
    render(items,issues,diff);
    $("fileStatus").textContent=`${file.name}：${items.length}件を読み込みました。`;
  }catch(error){$("fileStatus").textContent=`読み込みを中止しました：${error.message}`;$("resultSection").classList.add("hidden")}
};
$("downloadEvents").onclick=()=>download("events.json",generatedEvents);
$("downloadConfig").onclick=()=>download("config.json",generatedConfig);
$("downloadZip").onclick=downloadZip;
