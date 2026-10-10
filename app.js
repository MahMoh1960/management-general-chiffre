(function(){
function boot(){
"use strict";
var $=function(s){return document.querySelector(s)};
var app=$('#app'),title=$('#title'),back=$('#back');
var PLAN=window.PLAN||[],COURS=window.COURS||[];
var prog={};
try{prog=JSON.parse(localStorage.getItem('mg_prog')||'{}')}catch(e){}
function save(){try{localStorage.setItem('mg_prog',JSON.stringify(prog))}catch(e){}}
var notes={};
try{notes=JSON.parse(localStorage.getItem('mg_notes')||'{}')}catch(e){}
function saveNotes(){try{localStorage.setItem('mg_notes',JSON.stringify(notes))}catch(e){}}
var settings={fs:100};
try{var st=JSON.parse(localStorage.getItem('mg_set')||'{}');if(st.fs)settings.fs=st.fs}catch(e){}
function saveSet(){try{localStorage.setItem('mg_set',JSON.stringify(settings))}catch(e){}}
function applySet(){document.documentElement.style.fontSize=settings.fs+'%'}
applySet();
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function plain(h){return String(h).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()}
function byId(id){for(var i=0;i<COURS.length;i++){if(COURS[i].id===id)return COURS[i]}return null}
var EX={};
COURS.forEach(function(c){(c.exercices||[]).forEach(function(e,i){e.id=e.id||('c'+c.id+'-'+(i+1));e.chap=c.id;EX[e.id]=e})});
function quizPool(){return Object.keys(EX).map(function(k){return EX[k]}).filter(function(e){return e.type==='qcm'||e.type==='vf'})}
var timer=null;
function stopTimer(){if(timer){clearInterval(timer);timer=null}}

function setNav(k){
  var as=document.querySelectorAll('nav a');
  for(var i=0;i<as.length;i++){as[i].className=as[i].getAttribute('data-k')===k?'on':''}
}
function head(t,showBack){title.textContent=t;back.hidden=!showBack}
back.onclick=function(){if(history.length>1){history.back()}else{location.hash='#/'}};

/* ---------- Accueil ---------- */
function home(){
  head('Management Général',false);setNav('home');
  var nrev=reviewList().length;
  var h='<p><small class="muted">Cours, exercices et solutions. Tout le contenu fonctionne hors ligne.</small></p>'+
  '<div class="tabs"><a href="#/search">Recherche</a><a href="#/rev">Révision ('+nrev+')</a><a href="#/fav">Favoris</a><a href="#/biblio">Bibliographie</a></div>';
  PLAN.forEach(function(p){
    var c=byId(p.id);
    if(c){
      var ex=(c.exercices||[]).filter(function(e){return e.type!=='cas'});
      var done=ex.filter(function(e){return prog[e.id]===1}).length;
      var pc=ex.length?Math.round(100*done/ex.length):0;
      h+='<div class="card"><a class="chap" href="#/ch/'+p.id+'/cours"><div class="num">'+p.id+'</div><div style="flex:1"><b>'+p.titre+'</b><br><small class="muted">'+p.resume+'</small><div class="bar"><i style="width:'+pc+'%"></i></div></div></a></div>';
    }else{
      h+='<div class="card"><div class="chap off"><div class="num">'+p.id+'</div><div><b>'+p.titre+'</b><br><small class="muted">'+p.resume+' — à venir</small></div></div></div>';
    }
  });
  app.innerHTML=h;
}

/* ---------- Chapitre ---------- */
function tabs(id,cur){
  var T=[['cours','Cours'],['synthese','Synthèse'],['mots','Mots-clés'],['exos','Exercices'],['biblio','Références']];
  return '<div class="tabs">'+T.map(function(t){return '<a class="'+(t[0]===cur?'on':'')+'" href="#/ch/'+id+'/'+t[0]+'">'+t[1]+'</a>'}).join('')+'</div>';
}
function chapter(id,tab,sec){
  var c=byId(id);
  if(!c){location.hash='#/';return}
  head('Chapitre '+c.id,true);setNav('home');
  var h='<h2 style="color:var(--tx);margin:6px 0">'+c.titre+'</h2>'+tabs(id,tab);
  if(tab==='cours'){
    h+='<div class="card"><b>Objectifs d\'apprentissage</b><ul>'+c.objectifs.map(function(o){return '<li>'+o+'</li>'}).join('')+'</ul></div>';
    c.sections.forEach(function(s,i){
      var k=id+':'+i,nt=notes[k]||{};
      var op=(sec!==undefined&&sec!==null)?(i===sec):(i===0);
      h+='<details id="s'+i+'"'+(op?' open':'')+'><summary>'+s.titre+'</summary><div class="body">'+s.html+
      '<div class="tools"><button class="fav'+(nt.f?' on':'')+'" data-k="'+k+'">'+(nt.f?'★ Favori':'☆ Ajouter aux favoris')+'</button>'+
      '<textarea data-k="'+k+'" placeholder="Ma note personnelle sur cette section…">'+esc(nt.n||'')+'</textarea></div></div></details>';
    });
  }else if(tab==='synthese'){
    h+='<div class="card"><b>Fiche de synthèse</b><ul>'+c.synthese.map(function(o){return '<li>'+o+'</li>'}).join('')+'</ul></div>';
  }else if(tab==='mots'){
    h+=c.motsCles.map(motCard).join('');
  }else if(tab==='exos'){
    h+='<p><small class="muted">Répondez, puis lisez la justification. Les cas pratiques ont un corrigé détaillé.</small></p>';
    h+=c.exercices.map(card).join('');
  }else if(tab==='biblio'){
    h+='<div class="card"><b>Références</b><ul>'+c.biblio.map(function(o){return '<li>'+o+'</li>'}).join('')+'</ul></div>';
    if(c.noteBiblio)h+='<div class="note">'+c.noteBiblio+'</div>';
  }
  app.innerHTML=h;
  if(tab==='exos')bindExos();
  if(tab==='cours')bindTools();
  window.scrollTo(0,0);
  if(tab==='cours'&&sec!==undefined&&sec!==null){var el=document.getElementById('s'+sec);if(el)el.scrollIntoView()}
}
function bindTools(){
  Array.prototype.forEach.call(app.querySelectorAll('button.fav'),function(b){
    b.onclick=function(){
      var k=b.getAttribute('data-k');notes[k]=notes[k]||{};
      notes[k].f=notes[k].f?0:1;saveNotes();
      b.className='fav'+(notes[k].f?' on':'');b.textContent=notes[k].f?'★ Favori':'☆ Ajouter aux favoris';
    };
  });
  Array.prototype.forEach.call(app.querySelectorAll('textarea[data-k]'),function(t){
    t.oninput=function(){var k=t.getAttribute('data-k');notes[k]=notes[k]||{};notes[k].n=t.value;saveNotes()};
  });
}
function motCard(m){
  return '<div class="card"><b>'+m.fr+'</b> &nbsp; <span class="ar">'+m.ar+'</span><br><small>'+m.def+'</small></div>';
}

/* ---------- Exercices ---------- */
function card(ex){
  var lab=ex.type==='qcm'?'QCM':ex.type==='vf'?'Vrai / Faux':'Cas pratique';
  var h='<div class="card" data-id="'+ex.id+'"><div class="lvl">'+lab+(ex.niveau?' · '+ex.niveau:'')+'</div>';
  if(ex.type==='qcm'){
    h+='<p>'+ex.q+'</p>'+ex.choix.map(function(c,i){return '<button class="ch" data-i="'+i+'">'+String.fromCharCode(65+i)+'. '+c+'</button>'}).join('')+'<div class="fb" hidden></div>';
  }else if(ex.type==='vf'){
    h+='<p>'+ex.q+'</p><button class="vf" data-v="1">Vrai</button> <button class="vf" data-v="0">Faux</button><div class="fb" hidden></div>';
  }else{
    h+='<p><b>'+ex.titre+'</b></p>'+ex.enonce;
    ex.questions.forEach(function(q,i){
      h+='<details><summary>'+(i+1)+'. '+q.q+'</summary><div class="body">'+q.solution+'</div></details>';
    });
  }
  return h+'</div>';
}
function bindExos(){
  var cards=app.querySelectorAll('.card[data-id]');
  Array.prototype.forEach.call(cards,function(cd){
    var ex=EX[cd.getAttribute('data-id')];
    if(!ex||ex.type==='cas')return;
    var btns=cd.querySelectorAll('button');
    Array.prototype.forEach.call(btns,function(b){
      b.onclick=function(){
        var ok;
        if(ex.type==='qcm'){
          var i=+b.getAttribute('data-i');ok=(i===ex.rep);
          Array.prototype.forEach.call(btns,function(x){
            var xi=+x.getAttribute('data-i');
            if(xi===ex.rep)x.className='ch ok';
            else if(x===b)x.className='ch ko';
            x.disabled=true;
          });
        }else{
          var v=b.getAttribute('data-v')==='1';ok=(v===ex.rep);
          Array.prototype.forEach.call(btns,function(x){
            var xv=x.getAttribute('data-v')==='1';
            if(xv===ex.rep)x.className='vf ok';
            else if(x===b)x.className='vf ko';
            x.disabled=true;
          });
        }
        var fb=cd.querySelector('.fb');
        fb.hidden=false;
        fb.innerHTML=(ok?'<b style="color:var(--ok)">Correct.</b> ':'<b style="color:var(--ko)">Incorrect.</b> ')+ex.just;
        prog[ex.id]=ok?1:0;save();
      };
    });
  });
}

/* ---------- Examen blanc ---------- */
var exam=null;
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function examHome(){
  stopTimer();head('Examen blanc',false);setNav('exam');
  var n=quizPool().length;
  var h='<div class="card"><b>Examen blanc chronométré</b><p>Questions tirées au hasard parmi les QCM et vrai/faux de tous les chapitres disponibles ('+n+' questions au total). Aucune correction avant la fin.</p>';
  if(n<1){h+='<p>Aucune question disponible.</p>'}
  else{
    var nb=Math.min(30,n);
    h+='<p>Durée : '+nb+' minute(s) pour '+nb+' questions.</p><button class="btn" id="go">Commencer</button>';
  }
  app.innerHTML=h+'</div>';
  var g=$('#go');if(g)g.onclick=startExam;
}
function startExam(){
  var qs=shuffle(quizPool()).slice(0,30);
  exam={qs:qs,i:0,ans:[],end:Date.now()+qs.length*60000};
  timer=setInterval(tick,1000);
  examQ();
}
function tick(){
  var left=Math.max(0,exam.end-Date.now());
  var t=$('#tm');
  if(t){var m=Math.floor(left/60000),s=Math.floor(left/1000)%60;t.textContent=m+':'+(s<10?'0':'')+s}
  if(left<=0){examEnd()}
}
function examQ(){
  var q=exam.qs[exam.i];
  var h='<div class="card"><span class="timer" id="tm"></span><div class="lvl">Question '+(exam.i+1)+' / '+exam.qs.length+'</div><p>'+q.q+'</p>';
  if(q.type==='qcm'){
    h+=q.choix.map(function(c,i){return '<button class="ch" data-i="'+i+'">'+String.fromCharCode(65+i)+'. '+c+'</button>'}).join('');
  }else{
    h+='<button class="vf" data-v="1">Vrai</button> <button class="vf" data-v="0">Faux</button>';
  }
  h+='</div>';
  app.innerHTML=h;tick();
  Array.prototype.forEach.call(app.querySelectorAll('button'),function(b){
    b.onclick=function(){
      exam.ans[exam.i]=q.type==='qcm'?+b.getAttribute('data-i'):(b.getAttribute('data-v')==='1');
      exam.i++;
      if(exam.i>=exam.qs.length)examEnd();else examQ();
    };
  });
}
function examEnd(){
  stopTimer();
  if(!exam)return;
  var ok=0,h='';
  exam.qs.forEach(function(q,i){
    var good=exam.ans[i]===q.rep;if(good)ok++;
    var given=exam.ans[i];
    var gtxt=given===undefined?'sans réponse':(q.type==='qcm'?String.fromCharCode(65+given):(given?'Vrai':'Faux'));
    var rtxt=q.type==='qcm'?String.fromCharCode(65+q.rep):(q.rep?'Vrai':'Faux');
    h+='<div class="card"><div class="lvl">Question '+(i+1)+' · '+(good?'<span style="color:var(--ok)">correct</span>':'<span style="color:var(--ko)">incorrect</span>')+'</div><p>'+q.q+'</p><small>Votre réponse : '+gtxt+' · Bonne réponse : '+rtxt+'</small><div class="fb">'+q.just+'</div></div>';
  });
  var sc=Math.round(20*ok/exam.qs.length*10)/10;
  head('Résultat',false);
  app.innerHTML='<div class="card"><div class="big">'+sc+' / 20</div><p>'+ok+' bonne(s) réponse(s) sur '+exam.qs.length+'.</p><button class="btn" id="again">Nouvel examen</button></div>'+h;
  $('#again').onclick=function(){location.hash='#/exam';examHome()};
  exam=null;
  window.scrollTo(0,0);
}

/* ---------- Glossaire ---------- */
function gloss(){
  head('Glossaire',false);setNav('gloss');
  var all=[];
  COURS.forEach(function(c){c.motsCles.forEach(function(m){all.push(m)})});
  all.sort(function(a,b){return a.fr.localeCompare(b.fr,'fr')});
  app.innerHTML='<input type="search" id="q" placeholder="Rechercher un terme (français ou arabe)"><div id="gl"></div>';
  function draw(){
    var q=$('#q').value.trim().toLowerCase();
    var r=all.filter(function(m){return !q||(m.fr+' '+m.ar+' '+m.def).toLowerCase().indexOf(q)>=0});
    $('#gl').innerHTML=r.length?r.map(motCard).join(''):'<p>Aucun résultat.</p>';
  }
  $('#q').oninput=draw;draw();
}

/* ---------- Progression ---------- */
function progress(){
  head('Progression',false);setNav('prog');
  var tot=0,good=0,bad=0;
  var rows='';
  COURS.forEach(function(c){
    var ex=c.exercices.filter(function(e){return e.type!=='cas'});
    var g=ex.filter(function(e){return prog[e.id]===1}).length;
    var b=ex.filter(function(e){return prog[e.id]===0}).length;
    tot+=ex.length;good+=g;bad+=b;
    rows+='<tr><td>Chapitre '+c.id+'</td><td>'+g+'</td><td>'+b+'</td><td>'+(ex.length-g-b)+'</td></tr>';
  });
  app.innerHTML='<div class="card"><div class="big">'+(tot?Math.round(100*good/tot):0)+' %</div><p>de questions réussies ('+good+' sur '+tot+').</p></div>'+
  '<div class="card"><table><tr><th>Chapitre</th><th>Réussies</th><th>Ratées</th><th>Non faites</th></tr>'+rows+'</table></div>'+
  '<button class="btn sec" id="rst">Réinitialiser la progression</button>';
  $('#rst').onclick=function(){if(confirm('Effacer toute la progression ?')){prog={};save();progress()}};
}


/* ---------- Recherche dans tout le cours ---------- */
var IDX=null;
function buildIdx(){
  if(IDX)return IDX;
  IDX=[];
  COURS.forEach(function(c){
    c.sections.forEach(function(sc,i){IDX.push({c:c,i:i,t:sc.titre,x:plain(sc.html)})});
  });
  return IDX;
}
function hl(txt,q){
  var re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
  return esc(txt).replace(new RegExp('('+esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>');
}
function searchPage(){
  head('Recherche',true);setNav('plus');
  app.innerHTML='<input type="search" id="q" placeholder="Rechercher dans tout le cours (3 lettres minimum)"><p><small class="muted" id="cnt"></small></p><div id="res"></div>';
  function draw(){
    var q=$('#q').value.trim(),lq=q.toLowerCase();
    if(lq.length<3){$('#res').innerHTML='';$('#cnt').textContent='';return}
    var out=[],n=0;
    buildIdx().forEach(function(e){
      var lt=e.t.toLowerCase(),lx=e.x.toLowerCase();
      var p=lx.indexOf(lq);
      if(p<0&&lt.indexOf(lq)<0)return;
      n++;
      if(out.length>=40)return;
      var sn='';
      if(p>=0){var a=Math.max(0,p-60),b=Math.min(e.x.length,p+q.length+90);sn=(a>0?'… ':'')+e.x.slice(a,b)+(b<e.x.length?' …':'')}
      out.push('<div class="card"><a href="#/ch/'+e.c.id+'/cours/'+e.i+'" style="text-decoration:none"><small class="muted">Chapitre '+e.c.id+'</small><br><b>'+hl(e.t,q)+'</b></a>'+(sn?'<br><small>'+hl(sn,q)+'</small>':'')+'</div>');
    });
    $('#cnt').textContent=n+' section(s) trouvée(s)'+(n>40?' (40 premières affichées)':'');
    $('#res').innerHTML=out.join('')||'<p>Aucun résultat.</p>';
  }
  $('#q').oninput=draw;
}

/* ---------- Révision ciblée ---------- */
function reviewList(){return quizPool().filter(function(e){return prog[e.id]===0})}
function reviewPage(){
  head('Révision ciblée',true);setNav('plus');
  var l=reviewList();
  var h='<div class="card"><b>Questions à revoir</b><p>'+(l.length?l.length+' question(s) ratée(s). Répondez de nouveau : une bonne réponse la retire de la liste.':'Aucune question ratée pour le moment. Faites des exercices dans les chapitres : celles que vous manquez apparaîtront ici.')+'</p></div>';
  h+=l.map(function(e){return '<div class="lvl" style="margin-top:12px">Chapitre '+e.chap+'</div>'+card(e)}).join('');
  app.innerHTML=h;bindExos();
}

/* ---------- Favoris et notes ---------- */
function favPage(){
  head('Favoris et notes',true);setNav('plus');
  var h='',n=0;
  Object.keys(notes).sort(function(a,b){var x=a.split(':'),y=b.split(':');return (+x[0]-+y[0])||(+x[1]-+y[1])}).forEach(function(k){
    var v=notes[k];if(!v||(!v.f&&!(v.n&&v.n.trim())))return;
    var p=k.split(':'),c=byId(+p[0]);if(!c||!c.sections[+p[1]])return;
    n++;
    h+='<div class="card"><a href="#/ch/'+c.id+'/cours/'+p[1]+'" style="text-decoration:none"><small class="muted">Chapitre '+c.id+'</small> '+(v.f?'★':'')+'<br><b>'+c.sections[+p[1]].titre+'</b></a>'+(v.n&&v.n.trim()?'<div class="fb">'+esc(v.n).replace(/\n/g,'<br>')+'</div>':'')+'</div>';
  });
  app.innerHTML=(n?'':'<div class="card"><p>Aucun favori ni note. Dans un chapitre, ouvrez une section : en bas, ajoutez-la aux favoris ou écrivez une note.</p></div>')+h;
}

/* ---------- Bibliographie générale ---------- */
function allRefs(){
  var map={};
  COURS.forEach(function(c){
    (c.biblio||[]).forEach(function(r){
      var t=plain(r),m=t.match(/^(.*?\(\s*\d{4}[^)]*\))/);
      var key=(m?m[1]:t.slice(0,40)).toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùü]/g,'');
      if(!map[key]||r.length>map[key].r.length)map[key]={r:r,c:[]};
      if(map[key].c.indexOf(c.id)<0)map[key].c.push(c.id);
    });
  });
  var a=Object.keys(map).map(function(k){return map[k]});
  a.sort(function(x,y){return plain(x.r).localeCompare(plain(y.r),'fr')});
  return a;
}
function biblioPage(){
  head('Bibliographie générale',true);setNav('plus');
  var a=allRefs();
  app.innerHTML='<div class="note"><b>À vérifier.</b> Ces références ont été citées de mémoire : contrôlez auteurs, titres, années, éditions et pagination dans un catalogue (WorldCat, Google Scholar, BnF) avant tout usage académique.</div><input type="search" id="q" placeholder="Filtrer par auteur, titre ou année"><p><small class="muted" id="cnt"></small></p><div id="bl"></div>';
  function draw(){
    var q=$('#q').value.trim().toLowerCase();
    var r=a.filter(function(x){return !q||plain(x.r).toLowerCase().indexOf(q)>=0});
    $('#cnt').textContent=r.length+' référence(s) sur '+a.length;
    $('#bl').innerHTML=r.map(function(x){return '<div class="card">'+x.r+'<br><small class="muted">Chapitre(s) : '+x.c.join(', ')+'</small></div>'}).join('')||'<p>Aucun résultat.</p>';
  }
  $('#q').oninput=draw;draw();
}

/* ---------- Installation (PWA) ---------- */
var deferredInstall=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e});
window.addEventListener('appinstalled',function(){deferredInstall=null});
function isStandalone(){return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true}
function installPage(){
  head('Installer l\'application',true);setNav('plus');
  var h='';
  if(isStandalone()){h+='<div class="card"><b>Application installée</b><p>Vous utilisez déjà Management Général en mode application. Le contenu fonctionne hors ligne.</p></div>'}
  else{
    h+='<div class="card"><b>Installer sur ce téléphone</b><p>L\'installation ajoute l\'icône « MAHFOUD\'S APK » à l\'écran d\'accueil et ouvre l\'application en plein écran, comme une application ordinaire, avec accès hors ligne.</p>'+
    (deferredInstall?'<button class="btn" id="inst">Installer maintenant</button>':'<p><small class="muted">Le bouton d\'installation automatique n\'est pas disponible dans ce navigateur pour le moment : utilisez la méthode manuelle ci-dessous.</small></p>')+'</div>';
  }
  h+='<div class="card"><b>Méthode manuelle (Chrome, Android)</b><ol><li>Ouvrez cette page dans <b>Chrome</b> (et non dans un navigateur intégré à une autre application).</li><li>Appuyez sur le menu <b>⋮</b> en haut à droite.</li><li>Choisissez <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>.</li><li>Confirmez : l\'icône apparaît sur l\'écran d\'accueil.</li></ol></div>'+
  '<div class="card"><b>Mises à jour</b><p>Lorsqu\'une nouvelle version est publiée, l\'application la récupère automatiquement à la prochaine ouverture avec connexion. Votre progression, vos favoris et vos notes sont conservés sur ce téléphone ; pensez à les sauvegarder dans « Réglages » avant de désinstaller ou de changer de téléphone.</p></div>';
  app.innerHTML=h;
  var b=$('#inst');
  if(b)b.onclick=function(){
    if(!deferredInstall)return;
    deferredInstall.prompt();
    deferredInstall.userChoice.then(function(){deferredInstall=null;installPage()},function(){});
  };
}

/* ---------- Réglages, export, à propos ---------- */
function setPage(){
  head('Réglages',true);setNav('plus');
  var data=JSON.stringify({v:1,prog:prog,notes:notes});
  app.innerHTML='<div class="card"><b>Taille du texte</b><p>Actuelle : <span id="fs">'+settings.fs+'</span> %</p><button class="btn sec" id="fm">A −</button><button class="btn sec" id="fp">A +</button><button class="btn sec" id="f0">Normale</button></div>'+
  '<div class="card"><b>Sauvegarder / restaurer</b><p><small class="muted">Copiez ce texte pour sauvegarder votre progression, vos favoris et vos notes (par exemple dans un message ou une note). Pour restaurer, collez-le dans la zone puis appuyez sur Importer.</small></p>'+
  '<textarea id="ex" style="min-height:110px">'+esc(data)+'</textarea><button class="btn" id="cp">Copier</button><button class="btn sec" id="dl">Télécharger</button><button class="btn sec" id="im">Importer</button><p id="msg"></p></div>'+
  '<div class="card"><b>Code d\'accès</b><p><small class="muted">Si un code d\'accès est actif, l\'application le demande à l\'ouverture une seule fois sur cet appareil. Appuyez ci-dessous pour le redemander.</small></p><button class="btn sec" id="lk">Verrouiller maintenant</button></div>';
  $('#lk').onclick=function(){try{localStorage.removeItem('mg_key')}catch(e){}location.reload()};
  function fs(v){settings.fs=Math.max(80,Math.min(160,v));saveSet();applySet();$('#fs').textContent=settings.fs}
  $('#fm').onclick=function(){fs(settings.fs-10)};
  $('#fp').onclick=function(){fs(settings.fs+10)};
  $('#f0').onclick=function(){fs(100)};
  $('#cp').onclick=function(){
    var t=$('#ex');t.select();
    var done=false;try{done=document.execCommand('copy')}catch(e){}
    if(navigator.clipboard&&!done){navigator.clipboard.writeText(t.value).then(function(){$('#msg').textContent='Copié.'},function(){$('#msg').textContent='Sélectionnez le texte et copiez-le manuellement.'});return}
    $('#msg').textContent=done?'Copié.':'Sélectionnez le texte et copiez-le manuellement.';
  };
  $('#dl').onclick=function(){
    try{var b=new Blob([$('#ex').value],{type:'application/json'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='management-sauvegarde.json';document.body.appendChild(a);a.click();document.body.removeChild(a);$('#msg').textContent='Téléchargement lancé (sinon, utilisez Copier).'}catch(e){$('#msg').textContent='Téléchargement impossible : utilisez Copier.'}
  };
  $('#im').onclick=function(){
    try{
      var o=JSON.parse($('#ex').value);
      if(!o||typeof o!=='object'||typeof o.prog!=='object'||typeof o.notes!=='object')throw 0;
      if(!confirm('Remplacer la progression, les favoris et les notes actuels ?'))return;
      prog=o.prog;notes=o.notes;save();saveNotes();$('#msg').textContent='Import réussi.';
    }catch(e){$('#msg').textContent='Texte invalide : import annulé.'}
  };
}
function plusPage(){
  head('Plus',false);setNav('plus');
  var L=[['#/install','📲','Installer l\'application','Ajouter l\'icône à l\'écran d\'accueil (mode application)'],['#/search','🔍','Recherche dans le cours','Retrouver un terme dans toutes les sections'],['#/rev','🔁','Révision ciblée','Rejouer les questions ratées ('+reviewList().length+')'],['#/fav','★','Favoris et notes','Vos sections favorites et vos annotations'],['#/biblio','📚','Bibliographie générale','Toutes les références des chapitres, dédoublonnées'],['#/set','⚙','Réglages et sauvegarde','Taille du texte, export et import'],['#/about','ℹ','À propos','Présentation, contenu et avertissements']];
  app.innerHTML='<div class="menu">'+L.map(function(x){return '<div class="card"><a class="item" href="'+x[0]+'"><div class="ic">'+x[1]+'</div><div><b>'+x[2]+'</b><br><small class="muted">'+x[3]+'</small></div></a></div>'}).join('')+'</div>';
}
function aboutPage(){
  head('À propos',true);setNav('plus');
  var q=quizPool().length,cas=0,mots=0,sec=0;
  COURS.forEach(function(c){mots+=(c.motsCles||[]).length;sec+=c.sections.length;(c.exercices||[]).forEach(function(e){if(e.type==='cas')cas++})});
  app.innerHTML='<div class="card" style="text-align:center"><img src="icon-192.png" alt="Logo" width="96" height="96"><h2 style="margin:8px 0">Management Général</h2><b>MAHFOUD\'S APK</b><br><small class="muted">Créé par Mahfoud · © 2026 · Tous droits réservés</small></div>'+
  '<div class="card"><b>Présentation</b><p>Cours didactique de management général, avec exercices corrigés, glossaire français/arabe, examen blanc chronométré et suivi de progression. L\'application fonctionne hors ligne.</p><p>Contenu : '+COURS.length+' chapitres, '+sec+' sections, '+q+' questions (QCM et vrai/faux), '+cas+' cas pratiques, '+mots+' termes de glossaire, '+allRefs().length+' références distinctes.</p></div>'+
  '<div class="note"><b>Avertissements.</b> Les références bibliographiques ont été citées de mémoire : elles doivent être vérifiées avant tout usage académique. Les entreprises, chiffres et exemples (notamment « Atlas Conserves ») sont fictifs et illustratifs. Les textes réglementaires cités sont à contrôler dans les sources officielles.</div>'+
  '<div class="card"><b>Droits d\'auteur</b><p>Management Général a été créé par Mahfoud. © 2026 Mahfoud. Tous droits réservés. Toute reproduction ou diffusion, totale ou partielle, nécessite l\'autorisation de l\'auteur.</p></div>'+
  '<div class="card"><b>Parcours</b><p>Cours → Synthèse → Mots-clés → Exercices → Références ; puis Examen blanc et Révision ciblée.</p></div>';
}

/* ---------- Routeur ---------- */
function route(){
  stopTimer();
  var h=location.hash||'#/';
  var m;
  if((m=h.match(/^#\/ch\/(\d+)\/?(\w*)\/?(\d*)/))){chapter(+m[1],m[2]||'cours',m[3]!==''?+m[3]:null)}
  else if(h==='#/search'){searchPage()}
  else if(h==='#/rev'){reviewPage()}
  else if(h==='#/fav'){favPage()}
  else if(h==='#/biblio'){biblioPage()}
  else if(h==='#/set'){setPage()}
  else if(h==='#/about'){aboutPage()}
  else if(h==='#/install'){installPage()}
  else if(h==='#/plus'){plusPage()}
  else if(h==='#/exam'){examHome()}
  else if(h==='#/gloss'){gloss()}
  else if(h==='#/prog'){progress()}
  else{home()}
}
window.addEventListener('hashchange',route);
route();
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(function(){});
}
}
(window.MG_READY||Promise.resolve()).then(boot);
})();
