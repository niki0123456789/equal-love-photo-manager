let EVENTS = [];
let MEMBERS = [];
let POSITIONS = [];

async function loadAppData() {
  const [eventsResponse, membersResponse, positionsResponse, configResponse] = await Promise.all([
    fetch("./data/events.json"),
    fetch("./data/members.json"),
    fetch("./data/positions.json"),
    fetch("./data/config.json")
  ]);

  if (!eventsResponse.ok || !membersResponse.ok || !positionsResponse.ok || !configResponse.ok) {
    throw new Error("データファイルの読み込みに失敗しました。");
  }

  EVENTS = await eventsResponse.json();
  MEMBERS = await membersResponse.json();
  POSITIONS = await positionsResponse.json();
  const config = await configResponse.json();

  const versionLabel = document.getElementById("versionLabel");
  if (versionLabel) {
    versionLabel.textContent = `Ver ${config.version}`;
  }

  initializeApp();
}

function initializeApp() {
  const COUNT_KEY="equal-love-photo-manager-counts-v03",SIGN_KEY="equal-love-photo-manager-signatures-v04",WANT_KEY="equal-love-photo-manager-wants-v05";
  const state={mode:"all",memberId:null,page:"collection",category:"",sort:"desc",search:"",ownership:"",pageMemberId:"",counts:JSON.parse(localStorage.getItem(COUNT_KEY)||"{}"),signs:JSON.parse(localStorage.getItem(SIGN_KEY)||"{}"),wants:JSON.parse(localStorage.getItem(WANT_KEY)||"{}"),expanded:{}};
  const $=id=>document.getElementById(id);
  function k(e,m,p){return `${e}__${m}__${p}`} function getCount(e,m,p){return Number(state.counts[k(e,m,p)]||0)}
  function setCount(e,m,p,n){const x=k(e,m,p);if(n<=0)delete state.counts[x];else state.counts[x]=n;localStorage.setItem(COUNT_KEY,JSON.stringify(state.counts))}
  function isSigned(e,m,p){return !!state.signs[k(e,m,p)]} function toggleSign(e,m,p){const x=k(e,m,p);state.signs[x]?delete state.signs[x]:state.signs[x]=true;localStorage.setItem(SIGN_KEY,JSON.stringify(state.signs))}
  function isWanted(e,m,p){return !!state.wants[k(e,m,p)]} function toggleWant(e,m,p){const x=k(e,m,p);state.wants[x]?delete state.wants[x]:state.wants[x]=true;localStorage.setItem(WANT_KEY,JSON.stringify(state.wants))}
  function esc(v){return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  function yearOf(e){const s=(e.period||e.id||"").match(/20\d{2}/);return s?s[0]:"不明"}
  function isGraduated(m){return m?.status==="graduated"}
  function eventAvailableForMember(e,m){return !isGraduated(m)||Number(e.sort)<=Number(m.maxSort)}
  function eligibleEventsForMember(m,events=EVENTS){return events.filter(e=>eventAvailableForMember(e,m))}
  function eligibleMembersForEvent(e){return MEMBERS.filter(m=>eventAvailableForMember(e,m))}
  function scopeMembers(){
    if(state.page!=="collection"&&state.pageMemberId)return MEMBERS.filter(m=>m.id===state.pageMemberId);
    return state.mode==="all"?MEMBERS:MEMBERS.filter(m=>m.id===state.memberId);
  }
  function pageMemberOptions(){
    const active=MEMBERS.filter(m=>!isGraduated(m)).map(m=>`<option value="${m.id}" ${state.pageMemberId===m.id?"selected":""}>${m.emoji} ${m.name}</option>`).join("");
    const graduated=MEMBERS.filter(isGraduated).map(m=>`<option value="${m.id}" ${state.pageMemberId===m.id?"selected":""}>${m.emoji} ${m.name}（卒業）</option>`).join("");
    return `<option value="">全メンバー</option><optgroup label="現役メンバー">${active}</optgroup><optgroup label="卒業メンバー">${graduated}</optgroup>`;
  }
  function bindPageMemberFilter(){
    const el=document.getElementById("pageMemberFilter");
    if(el)el.onchange=e=>{state.pageMemberId=e.target.value;if(state.page==="stats")renderStats();if(state.page==="wishlist")renderWishlist();if(state.page==="trade")renderTrade()};
  }
  function eventOwnershipMatches(e){
    if(!state.ownership||state.mode==="all")return true;
    const counts=POSITIONS.map(p=>getCount(e.id,state.memberId,p.id));
    return state.ownership==="owned"?counts.some(n=>n>0):counts.every(n=>n===0);
  }
  function memberTotal(id){let t=0;const m=MEMBERS.find(x=>x.id===id);eligibleEventsForMember(m).forEach(e=>POSITIONS.forEach(p=>t+=getCount(e.id,id,p.id)));return t}
  function filtered(){const q=state.search.trim().toLowerCase();const base=state.mode==="member"?eligibleEventsForMember(MEMBERS.find(m=>m.id===state.memberId)):EVENTS;return base.filter(e=>!state.category||e.category===state.category).filter(eventOwnershipMatches).filter(e=>!q||[e.period,e.work,e.officialName,e.id,e.category].join(" ").toLowerCase().includes(q)).sort((a,b)=>state.sort==="asc"?a.sort-b.sort:b.sort-a.sort)}
  function theme(m){document.documentElement.style.setProperty("--accent",m?.accent||"#ef7fad");document.documentElement.style.setProperty("--soft",m?.soft||"#fff0f6");document.documentElement.style.setProperty("--page",m?.soft||"#fff8fb")}
  function openMember(id){state.mode="member";state.memberId=id;state.pageMemberId=id;theme(MEMBERS.find(m=>m.id===id));openManager()}
  function openAll(){state.mode="all";state.memberId=null;state.pageMemberId="";theme(null);openManager()}
  function openManager(){$("homeScreen").classList.add("hidden");$("managerScreen").classList.remove("hidden");$("ownershipFilterRow").classList.toggle("hidden",state.mode==="all");showPage("collection");window.scrollTo(0,0)}
  function updateHeader(){const m=MEMBERS.find(x=>x.id===state.memberId);$("memberTitle").textContent=state.mode==="all"?"🌈 全メンバー":`${m.emoji} ${m.name}`;const pageLabel=state.page==="collection"?"生写真コレクション":state.page==="stats"?"統計・年代別コンプ率":state.page==="wishlist"?"欲しい生写真一覧":state.page==="trade"?"ダブり・提供可能一覧":"バックアップ・復元";$("memberSub").textContent=state.mode==="member"&&isGraduated(m)?`${m.graduation}｜${pageLabel}`:pageLabel}
  function showPage(page){if($("homeScreen").classList.contains("hidden")===false){state.mode="all";state.memberId=null;theme(null);$("homeScreen").classList.add("hidden");$("managerScreen").classList.remove("hidden")}state.page=page;["collection","stats","wishlist","trade","backup"].forEach(p=>$(p+"Page").classList.toggle("hidden",p!==page));$("managerTools").classList.toggle("hidden",page!=="collection");document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));updateHeader();if(page==="collection")renderCollection();if(page==="stats")renderStats();if(page==="wishlist")renderWishlist();if(page==="trade")renderTrade();if(page==="backup")renderBackup();window.scrollTo(0,0)}
  function statsFor(ms,evs=EVENTS){let total=0,types=0,signed=0,wanted=0,possible=0;ms.forEach(m=>evs.filter(e=>eventAvailableForMember(e,m)).forEach(e=>POSITIONS.forEach(p=>{possible++;const n=getCount(e.id,m.id,p.id);total+=n;if(n>0)types++;if(isSigned(e.id,m.id,p.id))signed++;if(isWanted(e.id,m.id,p.id))wanted++})));return{total,types,signed,wanted,possible,rate:possible?Math.round(types/possible*100):0}}
  function updateSummary(list){const s=statsFor(scopeMembers());$("ownedTotal").textContent=s.total;$("ownedTypes").textContent=s.types;$("signedTotal").textContent=s.signed}
  function complete(e,m){return POSITIONS.every(p=>getCount(e.id,m.id,p.id)>0)}
  function renderPositionRow(e,m,p,compact=false){const row=document.createElement("div");row.className=compact?"mini-pos":"pos-row";row.innerHTML=compact?`<div class="mini-label">${p.name}</div><div class="mini-actions"><button class="minus">−</button><b class="num">${getCount(e.id,m.id,p.id)}</b><button class="plus">＋</button><button class="wide sign ${isSigned(e.id,m.id,p.id)?"on":""}">✍️</button><button class="wide want ${isWanted(e.id,m.id,p.id)?"on":""}">♡</button></div>`:`<span>${p.name}</span><div class="pos-actions"><button class="icon-btn want ${isWanted(e.id,m.id,p.id)?"on":""}">♡</button><button class="icon-btn sign ${isSigned(e.id,m.id,p.id)?"on":""}">✍️</button><div class="counter"><button class="minus">−</button><span class="count num">${getCount(e.id,m.id,p.id)}</span><button class="plus">＋</button></div></div>`;
  row.querySelector(".minus").onclick=()=>{setCount(e.id,m.id,p.id,Math.max(0,getCount(e.id,m.id,p.id)-1));renderCollection()};row.querySelector(".plus").onclick=()=>{setCount(e.id,m.id,p.id,getCount(e.id,m.id,p.id)+1);renderCollection()};row.querySelector(".sign").onclick=()=>{toggleSign(e.id,m.id,p.id);renderCollection()};row.querySelector(".want").onclick=()=>{toggleWant(e.id,m.id,p.id);renderCollection()};return row}
  function renderMemberCard(e,m){const card=document.createElement("article");card.className="event-card";card.innerHTML=`<div class="event-head"><div class="event-topline"><div><div class="period">${esc(e.period||e.officialName)}</div><div class="work">${esc(e.work)}</div></div><div class="badges"><span class="badge">${esc(e.category)}</span>${complete(e,m)?'<span class="badge complete">COMPLETE</span>':''}</div></div></div><div class="member-line">${m.emoji} ${m.name}</div><div class="positions"></div><div class="event-footer"></div>`;
  POSITIONS.forEach(p=>card.querySelector(".positions").appendChild(renderPositionRow(e,m,p)));const f=card.querySelector(".event-footer");if(e.officialUrl)f.innerHTML=`<span></span><a href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式サイト ↗</a>`;else f.remove();return card}
  function renderAllCard(e){const card=document.createElement("article");card.className="event-card";const eligible=eligibleMembersForEvent(e),owned=eligible.reduce((t,m)=>t+POSITIONS.reduce((s,p)=>s+getCount(e.id,m.id,p.id),0),0),want=eligible.reduce((t,m)=>t+POSITIONS.filter(p=>isWanted(e.id,m.id,p.id)).length,0),comp=eligible.filter(m=>complete(e,m)).length;card.innerHTML=`<div class="event-head"><div class="event-topline"><div><div class="period">${esc(e.period||e.officialName)}</div><div class="work">${esc(e.work)}</div><div class="all-summary">所持 ${owned}枚 ／ 欲しい ${want}種 ／ コンプ ${comp}/${eligible.length}人</div></div><span class="badge">${esc(e.category)}</span></div></div><div class="event-footer"><button class="expand-btn">${state.expanded[e.id]?"閉じる":`${eligible.length}人分を開く`}</button>${e.officialUrl?`<a href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式サイト ↗</a>`:""}</div>`;card.querySelector(".expand-btn").onclick=()=>{state.expanded[e.id]=!state.expanded[e.id];renderCollection()};if(state.expanded[e.id]){const box=document.createElement("div");box.className="all-members";eligible.forEach(m=>{const r=document.createElement("div");r.className="all-row";r.innerHTML=`<div class="all-name">${m.emoji} ${m.name}${isGraduated(m)?'<span class="mini-graduated">卒業</span>':''}</div><div class="all-pos-grid"></div>`;POSITIONS.forEach(p=>r.querySelector(".all-pos-grid").appendChild(renderPositionRow(e,m,p,true)));box.appendChild(r)});card.insertBefore(box,card.querySelector(".event-footer"))}return card}
  function renderCollection(){const list=filtered();updateSummary(list);$("eventList").innerHTML="";const frag=document.createDocumentFragment();if(state.mode==="all")list.forEach(e=>frag.appendChild(renderAllCard(e)));else{const m=MEMBERS.find(x=>x.id===state.memberId);list.forEach(e=>frag.appendChild(renderMemberCard(e,m)))}$("eventList").appendChild(frag)}
  function renderStats(){
    const ms=scopeMembers(),all=statsFor(ms);
    let years=[...new Set(EVENTS.filter(e=>ms.some(m=>eventAvailableForMember(e,m))).map(yearOf))].sort();
    let yearHtml=years.map(y=>{const ev=EVENTS.filter(e=>yearOf(e)===y),s=statsFor(ms,ev);return `<div class="year-row"><div class="year-line"><span>${y}年</span><span>${s.types}/${s.possible}種・${s.rate}%</span></div><div class="bar"><span style="width:${s.rate}%"></span></div></div>`}).join("");
    $("statsPage").innerHTML=`<div class="page-head"><h2>📊 統計</h2><p>メンバーごとの収集状況を確認できます</p></div><div class="page-filter"><select id="pageMemberFilter">${pageMemberOptions()}</select></div><div class="stat-grid"><div class="big-stat"><b>${all.total}</b><span>総所持枚数</span></div><div class="big-stat"><b>${all.types}</b><span>所持種類数</span></div><div class="big-stat"><b>${all.signed}</b><span>直筆あり</span></div><div class="big-stat"><b>${all.rate}%</b><span>全体コンプ率</span></div></div><div class="panel" style="margin-top:13px"><h3>年代別コンプ率</h3>${yearHtml}</div>`;
    bindPageMemberFilter();
  }
  function groupedWantedItems(){
    const map=new Map();
    scopeMembers().forEach(m=>eligibleEventsForMember(m).forEach(e=>POSITIONS.forEach(p=>{
      if(!isWanted(e.id,m.id,p.id))return;
      const key=`${m.id}__${e.id}`;
      if(!map.has(key))map.set(key,{m,e,positions:[]});
      map.get(key).positions.push({p,count:getCount(e.id,m.id,p.id)});
    })));
    return [...map.values()].sort((a,b)=>b.e.sort-a.e.sort);
  }
  function groupedTradeItems(){
    const map=new Map();
    scopeMembers().forEach(m=>eligibleEventsForMember(m).forEach(e=>POSITIONS.forEach(p=>{
      const n=getCount(e.id,m.id,p.id);
      if(n<2)return;
      const key=`${m.id}__${e.id}`;
      if(!map.has(key))map.set(key,{m,e,positions:[]});
      map.get(key).positions.push({p,extra:n-1,total:n});
    })));
    return [...map.values()].sort((a,b)=>b.e.sort-a.e.sort);
  }
  function renderGroupedWantItem(x){
    const tags=x.positions.map(v=>`<span class="pill">♡ ${v.p.name}${v.count>0?`（所持 ${v.count}枚）`:""}</span>`).join("");
    return `<div class="item">
      <div class="item-title">${x.m.emoji} ${x.m.name}</div>
      <div class="item-meta">${esc(x.e.period)}｜${esc(x.e.work)}｜${esc(x.e.category)}</div>
      <div class="item-tags">${tags}</div>
    </div>`;
  }
  function renderGroupedTradeItem(x){
    const tags=x.positions.map(v=>`<span class="pill">${v.p.name}：提供 ${v.extra}枚（所持 ${v.total}枚）</span>`).join("");
    return `<div class="item">
      <div class="item-title">${x.m.emoji} ${x.m.name}</div>
      <div class="item-meta">${esc(x.e.period)}｜${esc(x.e.work)}｜${esc(x.e.category)}</div>
      <div class="item-tags">${tags}</div>
    </div>`;
  }
  function renderWishlist(){
    const groups=groupedWantedItems();
    const typeCount=groups.reduce((sum,g)=>sum+g.positions.length,0);
    $("wishlistPage").innerHTML=`<div class="page-head"><h2>♡ 欲しい生写真一覧</h2><p>${groups.length}イベント・${typeCount}種類を登録中</p></div><div class="page-filter"><select id="pageMemberFilter">${pageMemberOptions()}</select></div><div class="list-page">${groups.length?groups.map(renderGroupedWantItem).join(""):'<div class="empty">欲しい生写真はまだ登録されていません。</div>'}</div>`;
    bindPageMemberFilter();
  }
  function renderTrade(){
    const groups=groupedTradeItems();
    const typeCount=groups.reduce((sum,g)=>sum+g.positions.length,0);
    $("tradePage").innerHTML=`<div class="page-head"><h2>🔄 ダブり・提供可能一覧</h2><p>${groups.length}イベント・${typeCount}種類を表示中</p></div><div class="page-filter"><select id="pageMemberFilter">${pageMemberOptions()}</select></div><div class="list-page">${groups.length?groups.map(renderGroupedTradeItem).join(""):'<div class="empty">提供可能なダブりはありません。</div>'}</div>`;
    bindPageMemberFilter();
  }

  function backupStats(){
    return {
      counts:Object.keys(state.counts).length,
      signs:Object.keys(state.signs).length,
      wants:Object.keys(state.wants).length
    };
  }
  function backupFileName(){
    const d=new Date(),pad=n=>String(n).padStart(2,"0");
    return `equal-love-photo-backup-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  }
  function exportBackup(){
    const payload={
      app:"equal-love-photo-manager",
      backupVersion:1,
      exportedAt:new Date().toISOString(),
      data:{
        counts:state.counts,
        signs:state.signs,
        wants:state.wants
      }
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    const msg=document.getElementById("backupMessage");
    if(msg){msg.textContent="バックアップファイルを保存しました。";msg.className="backup-message success"}
  }
  function validObject(value){return value&&typeof value==="object"&&!Array.isArray(value)}
  function importBackupFile(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const payload=JSON.parse(reader.result);
        if(payload.app!=="equal-love-photo-manager"||!validObject(payload.data)||!validObject(payload.data.counts)||!validObject(payload.data.signs)||!validObject(payload.data.wants)){
          throw new Error("形式が違います");
        }
        const counts=payload.data.counts,signs=payload.data.signs,wants=payload.data.wants;
        const summary=`所持データ ${Object.keys(counts).length}件\n直筆データ ${Object.keys(signs).length}件\n欲しいデータ ${Object.keys(wants).length}件`;
        if(!confirm(`このバックアップで現在のデータを上書きします。\n\n${summary}\n\n復元しますか？`))return;
        localStorage.setItem(COUNT_KEY,JSON.stringify(counts));
        localStorage.setItem(SIGN_KEY,JSON.stringify(signs));
        localStorage.setItem(WANT_KEY,JSON.stringify(wants));
        alert("復元が完了しました。画面を再読み込みします。");
        location.reload();
      }catch(error){
        console.error(error);
        const msg=document.getElementById("backupMessage");
        if(msg){msg.textContent="バックアップファイルを読み込めませんでした。正しいJSONファイルを選択してください。";msg.className="backup-message error"}
      }
    };
    reader.onerror=()=>{
      const msg=document.getElementById("backupMessage");
      if(msg){msg.textContent="ファイルの読み込みに失敗しました。";msg.className="backup-message error"}
    };
    reader.readAsText(file);
  }
  function renderBackup(){
    const s=backupStats();
    $("backupPage").innerHTML=`
      <div class="page-head"><h2>💾 バックアップ・復元</h2><p>端末変更やブラウザデータ消去に備えて保存できます</p></div>
      <div class="backup-summary">
        <div><b>${s.counts}</b><span>所持データ</span></div>
        <div><b>${s.signs}</b><span>直筆データ</span></div>
        <div><b>${s.wants}</b><span>欲しいデータ</span></div>
      </div>
      <div class="panel backup-panel">
        <div class="backup-icon">📤</div>
        <h3>バックアップを保存</h3>
        <p>現在の所持枚数・直筆・欲しい情報を、1つのJSONファイルに保存します。</p>
        <button id="exportBackupButton" class="primary-action">バックアップファイルを保存</button>
      </div>
      <div class="panel backup-panel">
        <div class="backup-icon">📥</div>
        <h3>バックアップから復元</h3>
        <p>保存済みのJSONファイルを選択すると、現在のデータを上書きして復元します。</p>
        <input id="importBackupInput" class="file-input" type="file" accept=".json,application/json">
        <label for="importBackupInput" class="secondary-action">バックアップファイルを選択</label>
        <div class="backup-warning">⚠️ 復元すると、現在このブラウザに保存されているデータは上書きされます。</div>
      </div>
      <div id="backupMessage" class="backup-message"></div>`;
    document.getElementById("exportBackupButton").onclick=exportBackup;
    document.getElementById("importBackupInput").onchange=e=>importBackupFile(e.target.files?.[0]);
  }

  function createMemberButton(m){
    const b=document.createElement("button");
    b.className=`member-card${isGraduated(m)?" graduated":""}`;
    b.style.background=isGraduated(m)?"linear-gradient(135deg,#e8e8e8,#fff)":`linear-gradient(135deg,${m.soft},#fff)`;
    b.innerHTML=`<span class="emoji">${m.emoji}</span><span class="name">${m.name}</span><span class="small">${isGraduated(m)?`${m.graduation}｜`:""}所持：${memberTotal(m.id)}枚</span>`;
    b.onclick=()=>openMember(m.id);
    return b;
  }
  MEMBERS.filter(m=>!isGraduated(m)).forEach(m=>$("memberGrid").appendChild(createMemberButton(m)));
  const all=document.createElement("button");all.className="member-card all";all.innerHTML=`<span class="emoji">🌈</span><span><span class="name">全メンバー</span><span class="small">イベントごとに対象メンバー分をまとめて管理</span></span>`;all.onclick=openAll;$("memberGrid").appendChild(all);
  MEMBERS.filter(isGraduated).forEach(m=>$("graduatedMemberGrid").appendChild(createMemberButton(m)));
  $("backButton").onclick=()=>{$("managerScreen").classList.add("hidden");$("homeScreen").classList.remove("hidden");window.scrollTo(0,0)};
  $("searchInput").oninput=e=>{state.search=e.target.value;renderCollection()};$("categoryFilter").onchange=e=>{state.category=e.target.value;renderCollection()};$("sortOrder").onchange=e=>{state.sort=e.target.value;renderCollection()};$("ownershipFilter").onchange=e=>{state.ownership=e.target.value;renderCollection()};
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  window.showPage = showPage;
}

loadAppData().catch(error => {
  console.error(error);
  document.body.innerHTML = `
    <main style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <h1>読み込みエラー</h1>
      <p>データファイルを読み込めませんでした。</p>
      <p>GitHub Pages上で開いているか、ファイル構成をご確認ください。</p>
    </main>
  `;
});
