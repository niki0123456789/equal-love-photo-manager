let EVENTS = [];
let MEMBERS = [];
let POSITIONS = [];
let APP_CONFIG = {};

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
  APP_CONFIG = config;

  const versionLabel = document.getElementById("versionLabel");
  if (versionLabel) {
    versionLabel.textContent = `Ver ${config.version}`;
  }

  initializeApp();
}

function initializeApp() {
  const COUNT_KEY="equal-love-photo-manager-counts-v03",SIGN_KEY="equal-love-photo-manager-signatures-v04",WANT_KEY="equal-love-photo-manager-wants-v05";
  const PREF_KEY="equal-love-photo-manager-preferences-v095";
  const savedPrefs=JSON.parse(localStorage.getItem(PREF_KEY)||"{}");
  const state={
    mode:"all",
    memberId:savedPrefs.memberId||null,
    page:"collection",
    category:savedPrefs.category||"",
    sort:savedPrefs.sort||"desc",
    search:savedPrefs.search||"",
    ownership:savedPrefs.ownership||"",
    newFilter:savedPrefs.newFilter||"",
    pageMemberId:savedPrefs.pageMemberId||"",
    missingMemberId:savedPrefs.missingMemberId||"",
    missingPositionId:savedPrefs.missingPositionId||"",
    missingSearch:savedPrefs.missingSearch||"",
    counts:JSON.parse(localStorage.getItem(COUNT_KEY)||"{}"),
    signs:JSON.parse(localStorage.getItem(SIGN_KEY)||"{}"),
    wants:JSON.parse(localStorage.getItem(WANT_KEY)||"{}"),
    expanded:{}
  };
  function savePreferences(){
    localStorage.setItem(PREF_KEY,JSON.stringify({
      memberId:state.memberId,
      category:state.category,
      sort:state.sort,
      search:state.search,
      ownership:state.ownership,
      newFilter:state.newFilter,
      pageMemberId:state.pageMemberId,
      missingMemberId:state.missingMemberId,
      missingPositionId:state.missingPositionId,
      missingSearch:state.missingSearch
    }));
  }
  const $=id=>document.getElementById(id);
  function k(e,m,p){return `${e}__${m}__${p}`} function getCount(e,m,p){return Number(state.counts[k(e,m,p)]||0)}
  function setCount(e,m,p,n){const x=k(e,m,p);if(n<=0)delete state.counts[x];else state.counts[x]=n;localStorage.setItem(COUNT_KEY,JSON.stringify(state.counts))}
  function isSigned(e,m,p){return !!state.signs[k(e,m,p)]} function toggleSign(e,m,p){const x=k(e,m,p);state.signs[x]?delete state.signs[x]:state.signs[x]=true;localStorage.setItem(SIGN_KEY,JSON.stringify(state.signs))}
  function isWanted(e,m,p){return !!state.wants[k(e,m,p)]} function toggleWant(e,m,p){const x=k(e,m,p);state.wants[x]?delete state.wants[x]:state.wants[x]=true;localStorage.setItem(WANT_KEY,JSON.stringify(state.wants))}
  function esc(v){return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  function yearOf(e){const s=(e.period||e.id||"").match(/20\d{2}/);return s?s[0]:"不明"}
  function normalizeText(value){return String(value||"").toLowerCase().replace(/[\s　・･「」『』（）()【】\-_.]/g,"")}
  function eventSearchText(e){
    const parts=String(e.id||"").match(/(20\d{2})-(\d{2})/);
    const aliases=parts?[`${parts[1]}/${Number(parts[2])}`,`${parts[1]}年${Number(parts[2])}月`,`${parts[1]}${parts[2]}`]:[];
    return normalizeText([e.period,e.work,e.officialName,e.id,e.category,...aliases].join(" "));
  }
  function newestSortThreshold(){
    const count=Number(APP_CONFIG.newItemCount||12);
    return [...EVENTS].sort((a,b)=>b.sort-a.sort)[Math.max(0,count-1)]?.sort||Infinity;
  }
  function isNewEvent(e){return Number(e.sort)>=newestSortThreshold()}
  function isGraduated(m){return m?.status==="graduated"}
  function eventAvailableForMember(e,m){
    if(!m)return true;
    const include=Array.isArray(m.includeEventIds)?m.includeEventIds:[];
    const exclude=Array.isArray(m.excludeEventIds)?m.excludeEventIds:[];
    if(exclude.includes(e.id))return false;
    if(include.includes(e.id))return true;
    return !isGraduated(m)||Number(e.sort)<=Number(m.maxSort);
  }
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
  function filtered(){
    const q=normalizeText(state.search);
    const base=state.mode==="member"?eligibleEventsForMember(MEMBERS.find(m=>m.id===state.memberId)):EVENTS;
    return base
      .filter(e=>!state.category||e.category===state.category)
      .filter(eventOwnershipMatches)
      .filter(e=>state.newFilter!=="new"||isNewEvent(e))
      .filter(e=>!q||eventSearchText(e).includes(q))
      .sort((a,b)=>{
        if(state.sort==="asc")return a.sort-b.sort;
        if(state.sort==="new"){
          const newDiff=Number(isNewEvent(b))-Number(isNewEvent(a));
          return newDiff||b.sort-a.sort;
        }
        return b.sort-a.sort;
      });
  }
  function theme(m){document.documentElement.style.setProperty("--accent",m?.accent||"#ef7fad");document.documentElement.style.setProperty("--soft",m?.soft||"#fff0f6");document.documentElement.style.setProperty("--page",m?.soft||"#fff8fb")}
  function openMember(id){state.mode="member";state.memberId=id;state.pageMemberId=id;savePreferences();theme(MEMBERS.find(m=>m.id===id));openManager()}
  function openAll(){state.mode="all";state.memberId=null;state.pageMemberId="";savePreferences();theme(null);openManager()}
  function openManager(){$("homeScreen").classList.add("hidden");$("managerScreen").classList.remove("hidden");$("ownershipFilterRow").classList.toggle("hidden",state.mode==="all");showPage("collection");window.scrollTo(0,0)}
  function updateHeader(){const m=MEMBERS.find(x=>x.id===state.memberId);$("memberTitle").textContent=state.mode==="all"?"🌈 全メンバー":`${m.emoji} ${m.name}`;const pageLabel=state.page==="collection"?"生写真コレクション":state.page==="stats"?"統計・年代別コンプ率":state.page==="wishlist"?"欲しい生写真一覧":state.page==="trade"?"ダブり・提供可能一覧":state.page==="missing"?"未所持一覧":"バックアップ・復元";$("memberSub").textContent=state.mode==="member"&&isGraduated(m)?`${m.graduation}｜${pageLabel}`:pageLabel}
  function showPage(page){if($("homeScreen").classList.contains("hidden")===false){state.mode="all";state.memberId=null;theme(null);$("homeScreen").classList.add("hidden");$("managerScreen").classList.remove("hidden")}state.page=page;["collection","stats","wishlist","trade","missing","backup"].forEach(p=>$(p+"Page").classList.toggle("hidden",p!==page));$("managerTools").classList.toggle("hidden",page!=="collection");document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));updateHeader();if(page==="collection")renderCollection();if(page==="stats")renderStats();if(page==="wishlist")renderWishlist();if(page==="trade")renderTrade();if(page==="missing")renderMissing();if(page==="backup")renderBackup();window.scrollTo(0,0)}
  function statsFor(ms,evs=EVENTS){let total=0,types=0,signed=0,wanted=0,possible=0;ms.forEach(m=>evs.filter(e=>eventAvailableForMember(e,m)).forEach(e=>POSITIONS.forEach(p=>{possible++;const n=getCount(e.id,m.id,p.id);total+=n;if(n>0)types++;if(isSigned(e.id,m.id,p.id))signed++;if(isWanted(e.id,m.id,p.id))wanted++})));return{total,types,signed,wanted,possible,rate:possible?Math.round(types/possible*100):0}}
  function updateSummary(list){const s=statsFor(scopeMembers());$("ownedTotal").textContent=s.total;$("ownedTypes").textContent=s.types;$("signedTotal").textContent=s.signed}
  function complete(e,m){return POSITIONS.every(p=>getCount(e.id,m.id,p.id)>0)}
  function renderPositionRow(e,m,p,compact=false){const row=document.createElement("div");row.className=compact?"mini-pos":"pos-row";row.innerHTML=compact?`<div class="mini-label">${p.name}</div><div class="mini-actions"><button class="minus">−</button><b class="num">${getCount(e.id,m.id,p.id)}</b><button class="plus">＋</button><button class="wide sign ${isSigned(e.id,m.id,p.id)?"on":""}">✍️</button><button class="wide want ${isWanted(e.id,m.id,p.id)?"on":""}">♡</button></div>`:`<span>${p.name}</span><div class="pos-actions"><button class="icon-btn want ${isWanted(e.id,m.id,p.id)?"on":""}">♡</button><button class="icon-btn sign ${isSigned(e.id,m.id,p.id)?"on":""}">✍️</button><div class="counter"><button class="minus">−</button><span class="count num">${getCount(e.id,m.id,p.id)}</span><button class="plus">＋</button></div></div>`;
  row.querySelector(".minus").onclick=()=>{setCount(e.id,m.id,p.id,Math.max(0,getCount(e.id,m.id,p.id)-1));renderCollection()};row.querySelector(".plus").onclick=()=>{setCount(e.id,m.id,p.id,getCount(e.id,m.id,p.id)+1);renderCollection()};row.querySelector(".sign").onclick=()=>{toggleSign(e.id,m.id,p.id);renderCollection()};row.querySelector(".want").onclick=()=>{toggleWant(e.id,m.id,p.id);renderCollection()};return row}
  function renderMemberCard(e,m){const card=document.createElement("article");card.className="event-card";card.innerHTML=`<div class="event-head"><div class="event-topline"><div><div class="period">${esc(e.period||e.officialName)}</div><div class="work">${esc(e.work)}</div></div><div class="badges"><span class="badge">${esc(e.category)}</span>${isNewEvent(e)?'<span class="badge new-badge">NEW</span>':''}${complete(e,m)?'<span class="badge complete">COMPLETE</span>':''}</div></div></div><div class="member-line">${m.emoji} ${m.name}</div><div class="positions"></div><div class="event-footer"></div>`;
  POSITIONS.forEach(p=>card.querySelector(".positions").appendChild(renderPositionRow(e,m,p)));const f=card.querySelector(".event-footer");if(e.officialUrl)f.innerHTML=`<span></span><a href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式サイト ↗</a>`;else f.remove();return card}
  function renderAllCard(e){const card=document.createElement("article");card.className="event-card";const eligible=eligibleMembersForEvent(e),owned=eligible.reduce((t,m)=>t+POSITIONS.reduce((s,p)=>s+getCount(e.id,m.id,p.id),0),0),want=eligible.reduce((t,m)=>t+POSITIONS.filter(p=>isWanted(e.id,m.id,p.id)).length,0),comp=eligible.filter(m=>complete(e,m)).length;card.innerHTML=`<div class="event-head"><div class="event-topline"><div><div class="period">${esc(e.period||e.officialName)}</div><div class="work">${esc(e.work)}</div><div class="all-summary">所持 ${owned}枚 ／ 欲しい ${want}種 ／ コンプ ${comp}/${eligible.length}人</div></div><div class="badges">${isNewEvent(e)?'<span class="badge new-badge">NEW</span>':''}<span class="badge">${esc(e.category)}</span></div></div></div><div class="event-footer"><button class="expand-btn">${state.expanded[e.id]?"閉じる":`${eligible.length}人分を開く`}</button>${e.officialUrl?`<a href="${e.officialUrl}" target="_blank" rel="noopener noreferrer">公式サイト ↗</a>`:""}</div>`;card.querySelector(".expand-btn").onclick=()=>{state.expanded[e.id]=!state.expanded[e.id];renderCollection()};if(state.expanded[e.id]){const box=document.createElement("div");box.className="all-members";eligible.forEach(m=>{const r=document.createElement("div");r.className="all-row";r.innerHTML=`<div class="all-name">${m.emoji} ${m.name}${isGraduated(m)?'<span class="mini-graduated">卒業</span>':''}</div><div class="all-pos-grid"></div>`;POSITIONS.forEach(p=>r.querySelector(".all-pos-grid").appendChild(renderPositionRow(e,m,p,true)));box.appendChild(r)});card.insertBefore(box,card.querySelector(".event-footer"))}return card}
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


  function missingMemberOptions(){
    const active=MEMBERS.filter(m=>!isGraduated(m)).map(m=>`<option value="${m.id}" ${state.missingMemberId===m.id?"selected":""}>${m.emoji} ${m.name}</option>`).join("");
    const graduated=MEMBERS.filter(isGraduated).map(m=>`<option value="${m.id}" ${state.missingMemberId===m.id?"selected":""}>${m.emoji} ${m.name}（卒業）</option>`).join("");
    return `<option value="">全メンバー横断</option><optgroup label="現役メンバー">${active}</optgroup><optgroup label="卒業メンバー">${graduated}</optgroup>`;
  }
  function missingPositionOptions(){
    return `<option value="">全ポジション</option>`+POSITIONS.map(p=>`<option value="${p.id}" ${state.missingPositionId===p.id?"selected":""}>${p.name}</option>`).join("");
  }
  function groupedMissingItems(){
    const q=normalizeText(state.missingSearch);
    const members=state.missingMemberId?MEMBERS.filter(m=>m.id===state.missingMemberId):MEMBERS;
    const positionIds=state.missingPositionId?[state.missingPositionId]:POSITIONS.map(p=>p.id);
    const groups=[];
    members.forEach(m=>eligibleEventsForMember(m).forEach(e=>{
      if(q&&!eventSearchText(e).includes(q))return;
      const missing=POSITIONS.filter(p=>positionIds.includes(p.id)&&getCount(e.id,m.id,p.id)===0);
      if(missing.length)groups.push({m,e,positions:missing});
    }));
    return groups.sort((a,b)=>b.e.sort-a.e.sort||a.m.name.localeCompare(b.m.name,"ja"));
  }
  function renderMissing(){
    const groups=groupedMissingItems();
    const typeCount=groups.reduce((sum,g)=>sum+g.positions.length,0);
    $("missingPage").innerHTML=`
      <div class="page-head"><h2>🔎 未所持一覧</h2><p>${groups.length}イベント・${typeCount}種類が未所持です</p></div>
      <div class="missing-controls">
        <select id="missingMemberFilter">${missingMemberOptions()}</select>
        <select id="missingPositionFilter">${missingPositionOptions()}</select>
        <div class="searchbox missing-search"><span>🔍</span><input id="missingSearchInput" type="search" value="${esc(state.missingSearch)}" placeholder="年月・楽曲名・ツアー名など"></div>
      </div>
      <div class="list-page">${groups.length?groups.map(x=>`
        <div class="item">
          <div class="item-title">${x.m.emoji} ${x.m.name}${isGraduated(x.m)?'<span class="mini-graduated">卒業</span>':''}</div>
          <div class="item-meta">${isNewEvent(x.e)?'<span class="inline-new">NEW</span>':''}${esc(x.e.period)}｜${esc(x.e.work)}｜${esc(x.e.category)}</div>
          <div class="item-tags">${x.positions.map(p=>`<span class="pill missing-pill">${p.name}</span>`).join("")}</div>
        </div>`).join(""):'<div class="empty">条件に該当する未所持データはありません。</div>'}</div>`;
    document.getElementById("missingMemberFilter").onchange=e=>{state.missingMemberId=e.target.value;savePreferences();renderMissing()};
    document.getElementById("missingPositionFilter").onchange=e=>{state.missingPositionId=e.target.value;savePreferences();renderMissing()};
    document.getElementById("missingSearchInput").oninput=e=>{state.missingSearch=e.target.value;savePreferences();renderMissing()};
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
  function validDateString(value){return typeof value==="string"&&!Number.isNaN(Date.parse(value))}
  function sanitizeBackupMap(value,type){
    if(!validObject(value))throw new Error(`${type}データがオブジェクトではありません`);
    const clean={};
    for(const [key,item] of Object.entries(value)){
      if(typeof key!=="string"||!key.includes("__"))throw new Error(`${type}データのキー形式が不正です`);
      if(type==="所持"){
        const n=Number(item);
        if(!Number.isInteger(n)||n<0||n>999)throw new Error(`${type}データの値が不正です`);
        if(n>0)clean[key]=n;
      }else{
        if(item!==true&&item!==false)throw new Error(`${type}データの値が不正です`);
        if(item===true)clean[key]=true;
      }
    }
    return clean;
  }
  function validateBackupPayload(payload){
    if(!validObject(payload))throw new Error("JSONの中身が正しくありません");
    if(payload.app!=="equal-love-photo-manager")throw new Error("別のアプリのバックアップです");
    if(!Number.isInteger(Number(payload.backupVersion)))throw new Error("バックアップのバージョンが不正です");
    if(!validDateString(payload.exportedAt))throw new Error("バックアップ作成日時がありません");
    if(!validObject(payload.data))throw new Error("バックアップデータがありません");
    return {
      exportedAt:new Date(payload.exportedAt),
      counts:sanitizeBackupMap(payload.data.counts,"所持"),
      signs:sanitizeBackupMap(payload.data.signs,"直筆"),
      wants:sanitizeBackupMap(payload.data.wants,"欲しい")
    };
  }
  function formatBackupDate(date){
    return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
  }
  function validateMasterData(){
    const issues=[];
    const required=Array.isArray(APP_CONFIG.requiredEventFields)?APP_CONFIG.requiredEventFields:["officialName","id","sort","category","period","work","officialUrl","addedDate"];
    const idSeen=new Map(),sortSeen=new Map();
    EVENTS.forEach((e,index)=>{
      const row=index+1;
      required.forEach(field=>{
        if(e[field]===undefined||e[field]===null||String(e[field]).trim()===""){
          issues.push({level:field==="officialUrl"?"warning":"error",type:"必須項目抜け",message:`${row}件目：${field} が空です`});
        }
      });
      if(e.id){
        if(idSeen.has(e.id))issues.push({level:"error",type:"event_id重複",message:`${e.id}（${idSeen.get(e.id)}件目・${row}件目）`});
        else idSeen.set(e.id,row);
      }
      if(e.sort!==undefined&&e.sort!==null&&e.sort!==""){
        const key=String(e.sort);
        if(sortSeen.has(key))issues.push({level:"error",type:"sort重複",message:`sort ${key}（${sortSeen.get(key)}件目・${row}件目）`});
        else sortSeen.set(key,row);
      }
      if(e.officialUrl&& !/^https:\/\/.+/i.test(e.officialUrl)){
        issues.push({level:"warning",type:"URL形式",message:`${e.id}：HTTPSのURLではありません`});
      }
      if(e.addedDate&&!/^\d{4}-\d{2}-\d{2}$/.test(e.addedDate)){
        issues.push({level:"error",type:"追加日形式",message:`${e.id}：addedDateはYYYY-MM-DD形式にしてください`});
      }
    });
    MEMBERS.forEach(m=>{
      ["includeEventIds","excludeEventIds"].forEach(field=>{
        const ids=Array.isArray(m[field])?m[field]:[];
        ids.forEach(id=>{
          if(!EVENTS.some(e=>e.id===id))issues.push({level:"warning",type:"例外設定",message:`${m.name}：${field}の ${id} がevents.jsonにありません`});
        });
      });
      const overlap=(m.includeEventIds||[]).filter(id=>(m.excludeEventIds||[]).includes(id));
      overlap.forEach(id=>issues.push({level:"error",type:"例外設定重複",message:`${m.name}：${id} が表示・非表示の両方に設定されています`}));
    });
    return issues;
  }
  let pendingBackup=null;
  function importBackupFile(file){
    if(!file)return;
    pendingBackup=null;
    const msg=document.getElementById("backupMessage");
    const preview=document.getElementById("backupPreview");
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const payload=JSON.parse(reader.result);
        pendingBackup=validateBackupPayload(payload);
        preview.innerHTML=`
          <div class="backup-preview-title">✅ バックアップを確認しました</div>
          <div class="backup-preview-date">作成日時：${formatBackupDate(pendingBackup.exportedAt)}</div>
          <div class="backup-preview-counts">
            <span>所持 ${Object.keys(pendingBackup.counts).length}件</span>
            <span>直筆 ${Object.keys(pendingBackup.signs).length}件</span>
            <span>欲しい ${Object.keys(pendingBackup.wants).length}件</span>
          </div>
          <button id="restoreBackupButton" class="primary-action">このバックアップを復元</button>`;
        preview.className="backup-preview valid";
        msg.textContent="内容に問題はありません。作成日時と件数を確認してから復元してください。";
        msg.className="backup-message success";
        document.getElementById("restoreBackupButton").onclick=restorePendingBackup;
      }catch(error){
        console.error(error);
        pendingBackup=null;
        preview.innerHTML="";
        preview.className="backup-preview invalid";
        msg.textContent=`読み込みを中止しました：${error.message}`;
        msg.className="backup-message error";
      }
    };
    reader.onerror=()=>{
      pendingBackup=null;
      msg.textContent="ファイルの読み込みに失敗しました。";
      msg.className="backup-message error";
    };
    reader.readAsText(file);
  }
  function restorePendingBackup(){
    if(!pendingBackup)return;
    const summary=`作成日時：${formatBackupDate(pendingBackup.exportedAt)}\n所持 ${Object.keys(pendingBackup.counts).length}件\n直筆 ${Object.keys(pendingBackup.signs).length}件\n欲しい ${Object.keys(pendingBackup.wants).length}件`;
    if(!confirm(`現在のデータを上書きします。\n\n${summary}\n\n復元しますか？`))return;
    localStorage.setItem(COUNT_KEY,JSON.stringify(pendingBackup.counts));
    localStorage.setItem(SIGN_KEY,JSON.stringify(pendingBackup.signs));
    localStorage.setItem(WANT_KEY,JSON.stringify(pendingBackup.wants));
    alert("復元が完了しました。画面を再読み込みします。");
    location.reload();
  }
  function deleteAllUserData(){
    if(!confirm("所持枚数・直筆・欲しい情報・フィルター設定をすべて削除します。\nこの操作は元に戻せません。\n\n続けますか？"))return;
    const answer=prompt("最終確認です。\n削除する場合は「全削除」と入力してください。");
    if(answer!=="全削除"){
      const msg=document.getElementById("backupMessage");
      if(msg){msg.textContent="入力が一致しなかったため、削除を中止しました。";msg.className="backup-message error"}
      return;
    }
    [COUNT_KEY,SIGN_KEY,WANT_KEY,PREF_KEY].forEach(key=>localStorage.removeItem(key));
    alert("すべての保存データを削除しました。画面を再読み込みします。");
    location.reload();
  }
  function renderBackup(){
    const s=backupStats();
    const issues=validateMasterData();
    const errors=issues.filter(x=>x.level==="error");
    const warnings=issues.filter(x=>x.level==="warning");
    const issueRows=issues.slice(0,50).map(x=>`<li class="${x.level}"><b>${esc(x.type)}</b><span>${esc(x.message)}</span></li>`).join("");
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
        <p>選択したファイルを自動検査し、作成日時と件数を表示してから復元します。</p>
        <input id="importBackupInput" class="file-input" type="file" accept=".json,application/json">
        <label for="importBackupInput" class="secondary-action">バックアップファイルを選択</label>
        <div id="backupPreview" class="backup-preview"></div>
        <div class="backup-warning">⚠️ 壊れたJSON・別形式のJSON・不正な値を含むファイルは復元できません。</div>
      </div>
      <div class="panel data-check-panel">
        <div class="data-check-head">
          <div><h3>🧪 データ不備チェック</h3><p>events.jsonとメンバー例外設定を自動確認します。</p></div>
          <span class="check-result ${errors.length?"ng":warnings.length?"warning":"ok"}">${errors.length}エラー・${warnings.length}警告</span>
        </div>
        ${issues.length?`<ul class="issue-list">${issueRows}</ul>${issues.length>50?`<p class="issue-more">ほか${issues.length-50}件</p>`:""}`:'<div class="check-perfect">✅ 重複・必須項目抜け・URL抜け・例外設定の問題はありません。</div>'}
      </div>
      <div class="panel danger-panel">
        <div class="backup-icon">🗑️</div>
        <h3>保存データを全削除</h3>
        <p>所持枚数・直筆・欲しい情報・保存済みフィルター設定を削除します。確認は2段階です。</p>
        <button id="deleteAllDataButton" class="danger-action">すべての保存データを削除</button>
      </div>
      <div id="backupMessage" class="backup-message"></div>`;
    document.getElementById("exportBackupButton").onclick=exportBackup;
    document.getElementById("importBackupInput").onchange=e=>importBackupFile(e.target.files?.[0]);
    document.getElementById("deleteAllDataButton").onclick=deleteAllUserData;
  }

  function createMemberButton(m){
    const b=document.createElement("button");
    b.className=`member-card${isGraduated(m)?" graduated":""}`;
    b.style.background=isGraduated(m)?"linear-gradient(135deg,#e8e8e8,#fff)":`linear-gradient(135deg,${m.soft},#fff)`;
    b.innerHTML=`${state.memberId===m.id?'<span class="last-used">前回</span>':''}<span class="emoji">${m.emoji}</span><span class="name">${m.name}</span><span class="small">${isGraduated(m)?`${m.graduation}｜`:""}所持：${memberTotal(m.id)}枚</span>`;
    b.onclick=()=>openMember(m.id);
    return b;
  }
  MEMBERS.filter(m=>!isGraduated(m)).forEach(m=>$("memberGrid").appendChild(createMemberButton(m)));
  const all=document.createElement("button");all.className="member-card all";all.innerHTML=`<span class="emoji">🌈</span><span><span class="name">全メンバー</span><span class="small">イベントごとに対象メンバー分をまとめて管理</span></span>`;all.onclick=openAll;$("memberGrid").appendChild(all);
  MEMBERS.filter(isGraduated).forEach(m=>$("graduatedMemberGrid").appendChild(createMemberButton(m)));
  $("searchInput").value=state.search;
  $("categoryFilter").value=state.category;
  $("sortOrder").value=state.sort;
  $("ownershipFilter").value=state.ownership;
  $("newFilter").value=state.newFilter;
  $("backButton").onclick=()=>{$("managerScreen").classList.add("hidden");$("homeScreen").classList.remove("hidden");window.scrollTo(0,0)};
  $("searchInput").oninput=e=>{state.search=e.target.value;savePreferences();renderCollection()};
  $("categoryFilter").onchange=e=>{state.category=e.target.value;savePreferences();renderCollection()};
  $("sortOrder").onchange=e=>{state.sort=e.target.value;savePreferences();renderCollection()};
  $("ownershipFilter").onchange=e=>{state.ownership=e.target.value;savePreferences();renderCollection()};
  $("newFilter").onchange=e=>{state.newFilter=e.target.value;savePreferences();renderCollection()};
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  const topButton=document.createElement("button");
  topButton.id="backToTop";
  topButton.className="back-to-top";
  topButton.setAttribute("aria-label","ページ上部へ戻る");
  topButton.textContent="↑";
  topButton.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
  document.body.appendChild(topButton);
  const toggleTopButton=()=>topButton.classList.toggle("visible",window.scrollY>500);
  window.addEventListener("scroll",toggleTopButton,{passive:true});
  toggleTopButton();
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
