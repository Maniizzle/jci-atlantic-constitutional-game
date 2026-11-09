/* Player identity and leaderboard client.
   - A random device id is made once and kept on this phone. It proves which player you are.
   - Names are claimed on the server (one device per name). If the server is unreachable,
     the name is kept locally and claimed later.                                            */
(function(){
  var K={name:"jci-name",dev:"jci-device",reg:"jci-name-registered"};
  var mem={};
  function sget(k){try{var v=localStorage.getItem(k);return v===null?(mem[k]||""):v}catch(e){return mem[k]||""}}
  function sset(k,v){mem[k]=v;try{localStorage.setItem(k,v)}catch(e){}}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function clean(s){return String(s||"").normalize("NFC").replace(/\s+/g," ").trim()}
  function key(s){return clean(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^\p{L}\p{N}]/gu,"")}

  function device(){
    var d=sget(K.dev);
    if(!/^[a-z0-9-]{20,40}$/.test(d)){
      d=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():
        Array.from({length:32},function(){return "0123456789abcdef"[Math.floor(Math.random()*16)]}).join("");
      sset(K.dev,d);
    }
    return d;
  }
  function name(){return clean(sget(K.name))}
  function registered(){var n=name();return !!n&&sget(K.reg)===key(n)}
  function setName(v,isRegistered){
    sset(K.name,v);sset(K.reg,isRegistered?key(v):"");
    document.dispatchEvent(new CustomEvent("jci-name",{detail:v}));
  }

  // ---- server calls ----
  var api={available:null}; // null = unknown, false = no leaderboard on this server
  function call(path,body){
    var opts={method:body?"POST":"GET",headers:{"x-device":device()}};
    if(body){opts.headers["content-type"]="application/json";opts.body=JSON.stringify(body)}
    return fetch(path,opts).then(function(r){
      var ct=r.headers.get("content-type")||"";
      if(r.status===404||ct.indexOf("json")<0){api.available=false;return {status:r.status,data:{ok:false,error:"unavailable"}}}
      return r.json().then(function(d){
        if(d&&d.error==="not-configured")api.available=false;else api.available=true;
        return {status:r.status,data:d};
      });
    }).catch(function(){return {status:0,data:{ok:false,error:"offline"}}});
  }
  function claim(n){
    return call("/api/name",{name:n}).then(function(res){
      if(res.data.ok){setName(res.data.name,true);return {ok:true}}
      return {ok:false,error:res.data.error,suggestions:res.data.suggestions||[]};
    });
  }

  var REASONS={
    taken:"Someone already plays as this name.",
    length:"Use 2 to 24 characters.",
    characters:"Use letters, numbers, spaces, dots, dashes or apostrophes.",
    blocked:"Please pick a different name.",
    offline:"Can't reach the leaderboard right now. Your name is saved on this phone for now.",
    unavailable:""
  };

  // ---- dialog ----
  var overlay=null,done=null,cancelled=null,lastFocus=null,timer=null,checkSeq=0;
  function build(){
    overlay=document.createElement("div");
    overlay.className="name-overlay";overlay.hidden=true;
    overlay.innerHTML=
      '<form class="panel name-box" role="dialog" aria-modal="true" aria-labelledby="jciNameTitle" novalidate>'+
        '<div class="band gold"><span>Player sign-in</span><span>JCI Atlantic</span></div>'+
        '<div class="name-body">'+
          '<h2 class="display" id="jciNameTitle">What should we <span class="hl">call you?</span></h2>'+
          '<p class="muted" id="jciNameIntro">Your name appears on the leaderboard. Each name belongs to one player.</p>'+
          '<label class="label" for="jciName">Your name</label>'+
          '<input id="jciName" name="jciName" type="text" maxlength="24" autocomplete="nickname" autocapitalize="words" placeholder="e.g. Amaka O." required>'+
          '<div class="name-status" id="jciNameStatus" aria-live="polite"></div>'+
          '<div class="row"><button type="button" class="btn" id="jciNameCancel">Cancel</button><button type="submit" class="btn main" id="jciNameGo">Let’s play</button></div>'+
        '</div>'+
      '</form>';
    document.body.appendChild(overlay);
    var form=overlay.querySelector("form"),input=overlay.querySelector("#jciName");
    form.addEventListener("submit",function(e){e.preventDefault();submit()});
    input.addEventListener("input",function(){clearTimeout(timer);status("");timer=setTimeout(check,350)});
    overlay.querySelector("#jciNameCancel").onclick=function(){close(false)};
    overlay.addEventListener("click",function(e){if(e.target===overlay)close(false)});
    overlay.addEventListener("keydown",function(e){if(e.key==="Escape")close(false)});
  }
  function status(html,kind){
    var s=overlay.querySelector("#jciNameStatus");s.className="name-status"+(kind?" "+kind:"");s.innerHTML=html;
  }
  function showSuggestions(msg,list){
    var chips=(list||[]).map(function(n){return '<button type="button" class="sugg">'+esc(n)+'</button>'}).join("");
    status(esc(msg)+(chips?'<div class="suggs"><span>Try:</span>'+chips+'</div>':""),"bad");
    overlay.querySelectorAll(".sugg").forEach(function(b){b.onclick=function(){
      var i=overlay.querySelector("#jciName");i.value=b.textContent;i.focus();check();
    }});
  }
  function localProblem(v){
    if(v.length<2||key(v).length<2)return "length";
    if(!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} .'’\-]*$/u.test(v))return "characters";
    return null;
  }
  function check(){
    var v=clean(overlay.querySelector("#jciName").value);
    if(!v){status("");return}
    var p=localProblem(v);if(p){status(esc(REASONS[p]),"bad");return}
    if(api.available===false)return;
    var seq=++checkSeq;
    call("/api/name?name="+encodeURIComponent(v)).then(function(res){
      if(seq!==checkSeq||!res.data.ok)return;
      if(res.data.available)status(res.data.yours?"✓ That’s your name.":"✓ Available","good");
      else if(res.data.reason==="taken")showSuggestions(REASONS.taken,res.data.suggestions);
      else status(esc(REASONS[res.data.reason]||"Pick a different name."),"bad");
    });
  }
  function submit(){
    var input=overlay.querySelector("#jciName"),go=overlay.querySelector("#jciNameGo");
    var v=clean(input.value),p=localProblem(v);
    if(p){status(esc(REASONS[p]),"bad");input.focus();return}
    if(registered()&&key(v)===key(name())){setName(v,true);close(true);return}
    go.disabled=true;status("Checking…");
    claim(v).then(function(r){
      go.disabled=false;
      if(r.ok){close(true);return}
      if(r.error==="taken"){showSuggestions(REASONS.taken,r.suggestions);input.focus();return}
      if(r.error==="offline"||r.error==="unavailable"||r.error==="not-configured"){setName(v,false);close(true);return}
      status(esc(REASONS[r.error]||"Something went wrong. Try again."),"bad");
    });
  }
  function ask(cb,message,onCancel){
    if(!overlay)build();
    done=cb||null;cancelled=onCancel||null;lastFocus=document.activeElement;
    var input=overlay.querySelector("#jciName");
    input.value=name();status(message?esc(message):"",message?"bad":"");
    overlay.querySelector("#jciNameGo").disabled=false;
    overlay.hidden=false;document.documentElement.classList.add("name-open");
    setTimeout(function(){input.focus();input.select()},30);
  }
  function close(ok){
    overlay.hidden=true;document.documentElement.classList.remove("name-open");
    var cb=done,nope=cancelled;done=null;cancelled=null;
    if(ok&&cb)cb(name());
    else{if(lastFocus&&lastFocus.focus)lastFocus.focus();if(!ok&&nope)nope()}
  }
  function require(cb){if(name())cb(name());else ask(cb)}

  // Names saved before the leaderboard existed get claimed quietly in the background.
  function syncLocalName(){
    var n=name();if(!n||registered())return Promise.resolve({ok:true});
    return claim(n);
  }

  // ---- scores ----
  // Returns {ok, week:{rank,of,best}, all:{...}} or {ok:false, error}
  function submitScore(s,retry){
    return syncLocalName().then(function(r){
      if(!r.ok&&r.error==="taken"){
        return new Promise(function(resolve){
          ask(function(){resolve(submitScore(s,true))},
            "Someone else already uses “"+name()+"” on the leaderboard. Pick another name to save your score.",
            function(){resolve({ok:false,error:"no-name"})});
        });
      }
      if(api.available===false)return {ok:false,error:"unavailable"};
      return call("/api/score",s).then(function(res){
        if(res.data.error==="no-name"&&!retry){sset(K.reg,"");return submitScore(s,true)}
        return res.data;
      });
    });
  }
  function leaderboard(q){
    return call("/api/leaderboard?"+new URLSearchParams(q).toString()).then(function(res){return res.data});
  }

  // A small status line for results screens
  function scoreLine(el,result,boardHref){
    if(!el)return;
    if(!result||!result.ok){
      var e=result&&result.error;
      el.innerHTML=e==="unavailable"||e==="not-configured"?"":
        e==="slow-down"?"Score not saved: too many games in the last hour. Take a short break.":
        e==="offline"?"Score not saved: you're offline.":
        e==="no-name"?"Score not saved: no name picked.":
        e==="duration"?"Score not saved: that was too fast to count.":
        "Score not saved this time.";
      el.hidden=!el.innerHTML;return;
    }
    var w=result.week;
    el.innerHTML=(w?'You’re <b>#'+w.rank+'</b> of '+w.of+' this week':'Saved to the leaderboard')+
      ' · <a href="'+boardHref+'">See leaderboard →</a>';
    el.hidden=false;
  }

  function chip(el){
    if(!el)return;
    function render(){var n=name();
      el.innerHTML=n?'<span class="who">Playing as <b>'+esc(n)+'</b></span><button type="button" class="change">Change</button>':'<button type="button" class="change">Add your name</button>';
      el.querySelector(".change").onclick=function(){ask()};}
    render();document.addEventListener("jci-name",render);
  }

  device();
  window.JCIPlayer={name:name,ask:ask,require:require,chip:chip,esc:esc,submitScore:submitScore,leaderboard:leaderboard,scoreLine:scoreLine,sync:syncLocalName};
})();
