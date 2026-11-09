/* Shared player name: asked once before a game starts, kept on this device. */
(function(){
  var KEY="jci-name";
  function get(){try{return (localStorage.getItem(KEY)||"").trim()}catch(e){return window.__jciName||""}}
  function set(v){window.__jciName=v;try{localStorage.setItem(KEY,v)}catch(e){}
    document.dispatchEvent(new CustomEvent("jci-name",{detail:v}))}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

  var overlay=null,done=null,lastFocus=null;
  function build(){
    overlay=document.createElement("div");
    overlay.className="name-overlay";overlay.hidden=true;
    overlay.innerHTML=
      '<form class="panel name-box" role="dialog" aria-modal="true" aria-labelledby="jciNameTitle" novalidate>'+
        '<div class="band gold"><span>Player sign-in</span><span>JCI Atlantic</span></div>'+
        '<div class="name-body">'+
          '<h2 class="display" id="jciNameTitle">What should we <span class="hl">call you?</span></h2>'+
          '<p class="muted">Your name shows on your results. It stays on this phone.</p>'+
          '<label class="label" for="jciName">Your name</label>'+
          '<input id="jciName" name="jciName" type="text" maxlength="24" autocomplete="nickname" autocapitalize="words" placeholder="e.g. Amaka" required>'+
          '<p class="name-err" id="jciNameErr" hidden>Enter at least 2 letters.</p>'+
          '<div class="row"><button type="button" class="btn" id="jciNameCancel">Cancel</button><button type="submit" class="btn main">Let’s play</button></div>'+
        '</div>'+
      '</form>';
    document.body.appendChild(overlay);
    var form=overlay.querySelector("form"),input=overlay.querySelector("#jciName"),err=overlay.querySelector("#jciNameErr");
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var v=input.value.replace(/\s+/g," ").trim();
      if(v.length<2){err.hidden=false;input.focus();return}
      set(v);close(true);
    });
    input.addEventListener("input",function(){err.hidden=true});
    overlay.querySelector("#jciNameCancel").onclick=function(){close(false)};
    overlay.addEventListener("click",function(e){if(e.target===overlay)close(false)});
    overlay.addEventListener("keydown",function(e){if(e.key==="Escape")close(false)});
  }
  function ask(cb){
    if(!overlay)build();
    done=cb||null;lastFocus=document.activeElement;
    var input=overlay.querySelector("#jciName");
    input.value=get();overlay.querySelector("#jciNameErr").hidden=true;
    overlay.hidden=false;document.documentElement.classList.add("name-open");
    setTimeout(function(){input.focus();input.select()},30);
  }
  function close(ok){
    overlay.hidden=true;document.documentElement.classList.remove("name-open");
    var cb=done;done=null;
    if(ok&&cb)cb(get());else if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }
  function require(cb){var n=get();if(n)cb(n);else ask(cb)}
  function chip(el){
    if(!el)return;
    function render(){var n=get();
      el.innerHTML=n?'<span class="who">Playing as <b>'+esc(n)+'</b></span><button type="button" class="change">Change</button>':'<button type="button" class="change">Add your name</button>';
      el.querySelector(".change").onclick=function(){ask()};}
    render();document.addEventListener("jci-name",render);
  }
  window.JCIPlayer={name:get,ask:ask,require:require,chip:chip,esc:esc};
})();
