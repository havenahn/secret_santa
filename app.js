const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const $=id=>document.getElementById(id);
let state={roomId:null,participants:[],assignments:{}};
function show(id){$(id).classList.remove("hidden")} function hide(id){$(id).classList.add("hidden")}
function setError(id,msg){$(id).textContent=msg||""}
function makeRoomCode(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeDerangement(names){let x;do{x=shuffle(names)}while(names.some((n,i)=>n===x[i]));const o={};names.forEach((n,i)=>o[n]=x[i]);return o}

$("joinRoom").onclick=()=>{const code=$("roomKey").value.trim().toUpperCase();setError("homeError","");if(!/^[A-Z0-9]{6}$/.test(code)){setError("homeError","6자리 방 키를 입력해주세요.");return}loadRoom(code)};
$("roomKey").addEventListener("keydown",e=>{if(e.key==="Enter")$("joinRoom").click()});

$("createRoom").onclick=()=>{hide("home");show("names");$("count").focus();setError("nameError","")};
$("makeNames").onclick=()=>{const n=Number($("count").value);setError("nameError","");if(!Number.isInteger(n)||n<2||n>100){setError("nameError","2~100명의 인원을 입력해주세요.");return}$("nameInputs").innerHTML="";for(let i=0;i<n;i++){const r=document.createElement("div");r.className="name-row";const s=document.createElement("span");s.textContent=i+1;const x=document.createElement("input");x.className="name-input";x.placeholder=`이름 ${i+1}`;r.append(s,x);$("nameInputs").append(r)}show("draw");$("nameInputs").querySelector("input")?.focus()};

$("draw").onclick=async()=>{setError("nameError","");const names=[...document.querySelectorAll(".name-input")].map(x=>x.value.trim());if(names.some(x=>!x)){setError("nameError","모든 이름을 입력해주세요.");return}if(new Set(names).size!==names.length){setError("nameError","중복 이름이 있어요. 서로 다른 이름을 사용해주세요.");return}state.participants=names;state.assignments=makeDerangement(names);state.roomId=makeRoomCode();try{if(SUPABASE_URL&&SUPABASE_ANON_KEY)await saveOnline();else saveLocal()}catch(e){console.error(e);setError("nameError","방을 만들지 못했어요. 잠시 후 다시 시도해주세요.");return}openRoom()};
function saveLocal(){localStorage.setItem("manitto:"+state.roomId,JSON.stringify({participants:state.participants,assignments:state.assignments,createdAt:Date.now()}))}
async function saveOnline(){const r=await fetch(SUPABASE_URL+"/rest/v1/rooms",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Prefer":"return=minimal"},body:JSON.stringify({room_code:state.roomId,participants:state.participants,assignments:state.assignments})});if(!r.ok)throw new Error(await r.text())}

function openRoom(){hide("home");hide("names");hide("loading");show("room");$("roomCode").textContent=state.roomId;$("personSelect").innerHTML='<option value="">내 이름을 선택하세요</option>';state.participants.forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n;$("personSelect").append(o)});$("result").innerHTML="";const base=location.pathname.split("/room/")[0].replace(/\/$/,"");history.replaceState(null,"",base+"/room/"+state.roomId)}

$("copyLink").onclick=async()=>{const url=location.href;try{await navigator.clipboard.writeText(url)}catch{const t=document.createElement("textarea");t.value=url;document.body.append(t);t.select();document.execCommand("copy");t.remove()}$("copyLink").textContent="✓ 링크 복사됨";$("copyLink").classList.add("copied");setTimeout(()=>{$("copyLink").textContent="🔗 방 링크 복사";$("copyLink").classList.remove("copied")},1800)};
$("reveal").onclick=()=>{const n=$("personSelect").value;if(!n){$("result").innerHTML='<div class="error">내 이름을 선택해주세요.</div>';return}$("result").innerHTML=`<div class="label">${esc(n)}님의 마니또는</div><div class="name">🎁 ${esc(state.assignments[n])}</div>`};
$("deleteRoom").onclick=async()=>{
  if(!state.roomId) return;
  const ok=confirm(
    "이 마니또 방을 정말 삭제할까요?\n\n삭제하면 모든 참가자가 이 방에 들어갈 수 없게 됩니다."
  );
  if(!ok) return;

  $("deleteRoom").disabled=true;
  $("deleteRoom").textContent="삭제하는 중...";

  try{
    if(SUPABASE_URL && SUPABASE_ANON_KEY){
      const r=await fetch(
        SUPABASE_URL+"/rest/v1/rooms?room_code=eq."+encodeURIComponent(state.roomId),
        {
          method:"DELETE",
          headers:{
            "apikey":SUPABASE_ANON_KEY,
            "Authorization":"Bearer "+SUPABASE_ANON_KEY
          }
        }
      );
      if(!r.ok) throw new Error(await r.text());
    }else{
      localStorage.removeItem("manitto:"+state.roomId);
    }

    state={roomId:null,participants:[],assignments:{}};
    const base=location.pathname.split("/room/")[0].replace(/\/$/,"");
    history.replaceState(null,"",base+"/");
    $("roomKey").value="";
    $("count").value="";
    $("nameInputs").innerHTML="";
    hide("room");
    hide("names");
    show("home");
    setError("homeError","마니또 방이 삭제되었습니다.");
  }catch(e){
    console.error(e);
    $("deleteRoom").disabled=false;
    $("deleteRoom").textContent="🗑️ 마니또 지우기";
    alert("방을 삭제하지 못했어요. Supabase의 DELETE 정책이 설정되어 있는지 확인해주세요.");
  }
};

$("newGame").onclick=()=>{state={roomId:null,participants:[],assignments:{}};const base=location.pathname.split("/room/")[0].replace(/\/$/,"");history.replaceState(null,"",base+"/");$("roomKey").value="";$("count").value="";$("nameInputs").innerHTML="";hide("room");hide("names");show("home")};
$("backHome").onclick=()=>{hide("names");show("home");$("roomKey").focus()};

async function loadRoom(code){hide("home");hide("names");show("loading");try{let data=null;if(SUPABASE_URL&&SUPABASE_ANON_KEY){const r=await fetch(SUPABASE_URL+"/rest/v1/rooms?room_code=eq."+encodeURIComponent(code)+"&select=participants,assignments",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY}});if(r.ok){const rows=await r.json();if(rows[0])data=rows[0]}}else{const raw=localStorage.getItem("manitto:"+code);if(raw)data=JSON.parse(raw)}if(!data)throw new Error("not found");state.roomId=code;state.participants=data.participants;state.assignments=data.assignments;openRoom()}catch(e){console.error(e);hide("loading");show("home");$("roomKey").value=code;setError("homeError","이 마니또 방을 찾을 수 없어요. 방 키를 확인해주세요.")}}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

(function(){const p=location.pathname.match(/\/room\/([^/]+)/i);const q=new URLSearchParams(location.search).get("room");if(p)loadRoom(p[1].toUpperCase());else if(q)loadRoom(q.toUpperCase())})();
