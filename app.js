/*
  마니또 웹앱
  현재는 localStorage 모드로 바로 테스트할 수 있습니다.
  온라인 방 공유를 활성화하려면 아래 SUPABASE 설정을 입력하세요.
*/
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const $ = id => document.getElementById(id);
let state = { roomId:null, participants:[], assignments:{} };

function show(id){ $(id).classList.remove("hidden"); }
function hide(id){ $(id).classList.add("hidden"); }

function makeRoomCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s="";
  for(let i=0;i<6;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function makeDerangement(names){
  let shuffled;
  do { shuffled=shuffle(names); } while(names.some((n,i)=>n===shuffled[i]));
  const out={};
  names.forEach((n,i)=>out[n]=shuffled[i]);
  return out;
}

function setError(id,msg){ $(id).textContent=msg||""; }

$("makeNames").onclick=()=>{
  const n=Number($("count").value);
  setError("homeError","");
  if(!Number.isInteger(n)||n<2||n>100){setError("homeError","2~100명의 인원을 입력해주세요.");return;}
  $("nameInputs").innerHTML="";
  for(let i=0;i<n;i++){
    const row=document.createElement("div"); row.className="name-row";
    const num=document.createElement("span"); num.textContent=i+1;
    const input=document.createElement("input");
    input.className="name-input"; input.placeholder=`이름 ${i+1}`;
    row.append(num,input); $("nameInputs").append(row);
  }
  show("names");
  $("nameInputs").querySelector("input")?.focus();
};

$("draw").onclick=async()=>{
  setError("nameError","");
  const names=[...document.querySelectorAll(".name-input")].map(x=>x.value.trim());
  if(names.some(x=>!x)){setError("nameError","모든 이름을 입력해주세요.");return;}
  if(new Set(names).size!==names.length){setError("nameError","중복 이름이 있어요. 서로 다른 이름을 사용해주세요.");return;}

  state.participants=names;
  state.assignments=makeDerangement(names);
  state.roomId=makeRoomCode();

  try{
    if(SUPABASE_URL && SUPABASE_ANON_KEY) await saveOnline();
    else saveLocal();
  }catch(e){
    console.error(e);
    setError("nameError","온라인 저장에 실패했어요. 설정을 확인해주세요.");
    return;
  }
  openRoom();
};

function saveLocal(){
  localStorage.setItem("manitto:"+state.roomId,JSON.stringify({
    participants:state.participants,assignments:state.assignments,createdAt:Date.now()
  }));
  localStorage.setItem("lastManittoRoom",state.roomId);
}

async function saveOnline(){
  const r=await fetch(SUPABASE_URL+"/rest/v1/rooms",{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Prefer":"return=minimal"},
    body:JSON.stringify({room_code:state.roomId,participants:state.participants,assignments:state.assignments})
  });
  if(!r.ok) throw new Error(await r.text());
}

function openRoom(){
  hide("home"); hide("names"); hide("loading"); show("room");
  $("roomCode").textContent=state.roomId;
  $("personSelect").innerHTML='<option value="">내 이름을 선택하세요</option>';
  state.participants.forEach(n=>{
    const o=document.createElement("option");o.value=n;o.textContent=n;$("personSelect").append(o);
  });
  $("result").innerHTML="";
  history.replaceState(null,"",location.pathname.replace(/\/$/,"")+"/room/"+state.roomId);
}

$("copyLink").onclick=async()=>{
  const url=location.href;
  try{await navigator.clipboard.writeText(url)}catch{
    const ta=document.createElement("textarea");ta.value=url;document.body.append(ta);ta.select();document.execCommand("copy");ta.remove();
  }
  $("copyLink").textContent="✓ 링크 복사됨";
  $("copyLink").classList.add("copied");
  setTimeout(()=>{$("copyLink").textContent="🔗 방 링크 복사";$("copyLink").classList.remove("copied")},1800);
};

$("reveal").onclick=()=>{
  const n=$("personSelect").value;
  if(!n){$("result").innerHTML='<div class="error">내 이름을 선택해주세요.</div>';return;}
  $("result").innerHTML=`<div class="label">${escapeHtml(n)}님의 마니또는</div><div class="name">🎁 ${escapeHtml(state.assignments[n])}</div>`;
};

$("newGame").onclick=()=>{
  state={roomId:null,participants:[],assignments:{}};
  history.replaceState(null,"",location.pathname.split("/room/")[0]||"/");
  hide("room");show("home");$("count").value="";
};

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function loadRoom(code){
  hide("home");hide("names");show("loading");
  try{
    let data=null;
    if(SUPABASE_URL && SUPABASE_ANON_KEY){
      const r=await fetch(SUPABASE_URL+"/rest/v1/rooms?room_code=eq."+encodeURIComponent(code)+"&select=participants,assignments",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY}});
      if(r.ok){const rows=await r.json();if(rows[0])data=rows[0];}
    }else{
      const raw=localStorage.getItem("manitto:"+code);
      if(raw)data=JSON.parse(raw);
    }
    if(!data) throw new Error("not found");
    state.roomId=code;state.participants=data.participants;state.assignments=data.assignments;
    openRoom();
  }catch(e){
    hide("loading");show("home");
    setError("homeError","이 마니또 방을 찾을 수 없어요. 방 코드를 확인해주세요.");
  }
}

(function init(){
  const m=location.pathname.match(/\/room\/([^/]+)/i);
  if(m) loadRoom(m[1].toUpperCase());
})();
