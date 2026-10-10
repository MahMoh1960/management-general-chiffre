/* Déverrouillage : les chapitres (ch1.js à ch11.js) sont chiffrés (AES-GCM, clé dérivée par PBKDF2). */
(function(){
var SALT_B64='KMRWgr4gsILyVMfQ4i20Cg==',ITER=600000,K='mg_key';
var enc=new TextEncoder(),dec=new TextDecoder();
function b64(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function tob64(buf){var a=new Uint8Array(buf),s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
function norm(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function ids(){return Object.keys(window.ENC||{}).map(Number).sort(function(a,b){return a-b})}
function one(key,id){var p=b64(window.ENC[id]);return crypto.subtle.decrypt({name:'AES-GCM',iv:p.slice(0,12)},key,p.slice(12)).then(function(b){return dec.decode(b)})}
function load(key){
  return Promise.all(ids().map(function(id){return one(key,id)})).then(function(srcs){
    window.COURS=[];
    srcs.forEach(function(s){(0,eval)(s)});
  });
}
function fail(msg){
  var d=document.createElement('div');d.id='gate';
  d.innerHTML='<div class="gbox"><h2>Application indisponible</h2><p>'+msg+'</p></div>';
  document.body.appendChild(d);
}
window.MG_READY=new Promise(function(resolve){
  if(!(window.crypto&&crypto.subtle)){fail('Ce navigateur ne permet pas le déverrouillage (connexion sécurisée https requise).');return}
  if(!ids().length){fail('Contenu introuvable. Vérifiez la connexion et rechargez la page.');return}
  function gate(){
    var g=document.createElement('div');g.id='gate';
    g.innerHTML='<div class="gbox"><img src="icon-192.png" alt="Logo" width="96" height="96"><h2>Accès protégé</h2><p>Saisissez le code d\'accès pour ouvrir l\'application.</p><input type="password" id="gc" autocomplete="off" autocapitalize="off" placeholder="Code d\'accès"><label class="gl"><input type="checkbox" id="gs"> Afficher le code</label><button class="btn" id="gb">Ouvrir</button><p id="ge" class="ge"></p></div>';
    document.body.appendChild(g);
    var busy=false;
    function check(){
      if(busy)return;
      var v=norm(document.getElementById('gc').value);
      if(!v)return;
      busy=true;
      var e=document.getElementById('ge'),b=document.getElementById('gb');
      e.textContent='Vérification…';b.disabled=true;
      crypto.subtle.importKey('raw',enc.encode(v),'PBKDF2',false,['deriveKey']).then(function(km){
        return crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(SALT_B64),iterations:ITER,hash:'SHA-256'},km,{name:'AES-GCM',length:256},true,['decrypt']);
      }).then(function(key){
        return load(key).then(function(){
          return crypto.subtle.exportKey('raw',key).then(function(raw){
            try{localStorage.setItem(K,tob64(raw))}catch(x){}
            g.parentNode.removeChild(g);resolve();
          });
        });
      }).catch(function(){
        busy=false;b.disabled=false;
        e.textContent='Code incorrect.';
        document.getElementById('gc').value='';
      });
    }
    document.getElementById('gb').onclick=check;
    document.getElementById('gc').onkeydown=function(ev){if(ev.key==='Enter')check()};
    document.getElementById('gs').onchange=function(){document.getElementById('gc').type=this.checked?'text':'password'};
  }
  var stored=null;try{stored=localStorage.getItem(K)}catch(x){}
  if(stored){
    crypto.subtle.importKey('raw',b64(stored),{name:'AES-GCM'},true,['decrypt']).then(load).then(resolve).catch(function(){try{localStorage.removeItem(K)}catch(x){}gate()});
  }else{gate()}
});
})();
