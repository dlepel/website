/* Lineage — AUTO-TIMING TOOL (narration-anchored appearance times)
   node retime.js          -> REPORT only
   node retime.js --apply   -> rewrite t/quiet in timeline-data-v2.js
   Rule: a leaf/world appears 0.5s before the first caption that names it;
   never before its parent; unnamed nodes cascade in just before the next
   NAMED node of their line; unnamed world events are marked quiet (dot only). */
'use strict';
var fs=require('fs');
var APPLY=process.argv.indexOf('--apply')!==-1;
var DIR=__dirname, DATA_FILE=DIR+'/timeline-data-v2.js', CAP_FILE=DIR+'/timeline-captions-v2.js';
var LEAD=0.5, CASCADE=0.5;
function norm(s){return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\bdit\b.*$/,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
var W={}; new Function('window',fs.readFileSync(CAP_FILE,'utf8'))(W);
var SENT=(W.LINEAGE_SENTENCES||W.SENT).slice().sort(function(a,b){return a.t-b.t;});
var CAPN=SENT.map(function(s){return {t:s.t,n:norm(s.text)};});
var D={}; new Function('window',fs.readFileSync(DATA_FILE,'utf8'))(D);
var DATA=D.LINEAGE_DATA, PEOPLE=DATA.PEOPLE, WORLDS=DATA.WORLDS, BY={};
PEOPLE.forEach(function(p){BY[p.id]=p;});
function findPersonMention(p){
  var nm=norm(p.name); if(!nm) return null;
  var toks=nm.split(' ').filter(function(t){return t!=='de'&&t!=='la'&&t!=='du'&&t!=='le';});
  if(!toks.length) return null;
  var given=toks[0], surname=toks[toks.length-1];
  for(var i=0;i<CAPN.length;i++){var c=CAPN[i].n;
    if(toks.length===1){ if(given.length>=5&&c.indexOf(given)>=0) return {t:CAPN[i].t,via:given}; continue; }
    if(c.indexOf(given)>=0&&surname.length>=4&&c.indexOf(surname)>=0) return {t:CAPN[i].t,via:given+'+'+surname};
  } return null;
}
function findWorldMention(w){
  var label=norm(w.label).replace(/\b\d{3,4}\b/g,' ').replace(/\s+/g,' ').trim();
  var stop={the:1,of:1,and:1,a:1,in:1,to:1,war:1,wars:1,years:1,year:1,reign:1,begins:1,ends:1,signed:1,king:1,kings:1,french:1,france:1,new:1,great:1,first:1,with:1,its:1,had:1,was:1,british:1,britain:1,gains:1,personal:1,takes:1,effect:1,grants:1,begin:1,royal:1};
  var words=label.split(' '), phrases=[];
  for(var k=0;k<words.length-1;k++){ if(words[k].length>=4&&words[k+1].length>=4) phrases.push(words[k]+' '+words[k+1]); }
  var solo=words.filter(function(t){return t.length>=6&&!stop[t];});
  for(var i=0;i<CAPN.length;i++){var c=CAPN[i].n;
    for(var j=0;j<phrases.length;j++){ if(c.indexOf(phrases[j])>=0) return {t:CAPN[i].t,via:phrases[j]}; }
    for(var s=0;s<solo.length;s++){ if(c.indexOf(solo[s])>=0) return {t:CAPN[i].t,via:solo[s]}; }
  } return null;
}
var persons=PEOPLE.filter(function(p){return p.kind==='person'||p.kind==='founder'||p.kind==='descendant';});
var spouses=PEOPLE.filter(function(p){return p.kind==='spouse';});
persons.forEach(function(p){var m=findPersonMention(p);p._m=m;p._newT=m?+(m.t-LEAD).toFixed(2):null;});
var byLine={}; persons.forEach(function(p){(byLine[p.line]=byLine[p.line]||[]).push(p);});
Object.keys(byLine).forEach(function(L){
  var arr=byLine[L].slice().sort(function(a,b){return (b.gen||0)-(a.gen||0);});
  for(var i=0;i<arr.length;i++){ if(arr[i]._newT==null){
    var nextT=null,k=i+1; while(k<arr.length){if(arr[k]._newT!=null){nextT=arr[k]._newT;break;}k++;}
    var prevT=null,j=i-1; while(j>=0){if(arr[j]._newT!=null){prevT=arr[j]._newT;break;}j--;}
    if(nextT!=null){arr[i]._newT=+(nextT-CASCADE).toFixed(2);arr[i]._deferred='before-next';}
    else if(prevT!=null){arr[i]._newT=+(prevT+CASCADE).toFixed(2);arr[i]._deferred='after-prev';}
    else {arr[i]._newT=0;arr[i]._deferred='orphan';}
  }}
  var groups={}; arr.forEach(function(p){ if(p._deferred==='before-next'){(groups[p._newT]=groups[p._newT]||[]).push(p);} });
  Object.keys(groups).forEach(function(tk){var g=groups[tk]; g.forEach(function(p,idx){ p._newT=+(+tk-(g.length-1-idx)*CASCADE).toFixed(2); });});
});
persons.slice().sort(function(a,b){return (b.gen||0)-(a.gen||0);}).forEach(function(p){
  (p.parents||[]).forEach(function(pid){var par=BY[pid]; if(par&&par._newT!=null&&p._newT!=null&&p._newT<=par._newT+0.2){p._newT=+(par._newT+0.2).toFixed(2);}});
});
spouses.forEach(function(sp){var owner=BY[sp.spouseOf];var m=findPersonMention(sp);sp._m=m;
  var base=owner&&owner._newT!=null?owner._newT+CASCADE:sp.t;
  sp._newT=m?Math.max(+(m.t-LEAD).toFixed(2),base):+base.toFixed(2);});
WORLDS.forEach(function(w){var m=findWorldMention(w);w._m=m;w._newT=m?+(m.t-LEAD).toFixed(2):null;w._quiet=!m;});
function fmt(t){if(t==null)return '---';var m=Math.floor(t/60),s=Math.round(t%60);return m+':'+(s<10?'0':'')+s;}
if(!APPLY){
  var named=0,deferred=0;
  console.log('PEOPLE  id  name : curT -> newT  [via]');
  PEOPLE.filter(function(p){return p.kind!=='union';}).slice().sort(function(a,b){return (a._newT==null?1e9:a._newT)-(b._newT==null?1e9:b._newT);}).forEach(function(p){
    var tag=p._m?'['+p._m.via+']':(p._deferred?'[DEF '+p._deferred+']':'[w/person]'); if(p._m)named++;else deferred++;
    console.log((p.line||'?')+(p.gen||'')+' '+p.id.padEnd(14)+' '+(p.name||'').slice(0,24).padEnd(24)+' '+fmt(p.t)+' -> '+fmt(p._newT)+' '+tag);
  });
  console.log('\nWORLD EVENTS:');
  WORLDS.forEach(function(w){console.log((w._quiet?'QUIET ':'NAMED ')+w.id.padEnd(12)+' '+fmt(w.t)+' -> '+(w._newT==null?'(dot only)':fmt(w._newT))+'  '+w.label.slice(0,38)+(w._m?'  ['+w._m.via+']':''));});
  console.log('\nSUMMARY people named='+named+' deferred='+deferred+' | worlds named='+WORLDS.filter(function(w){return !w._quiet;}).length+' quiet='+WORLDS.filter(function(w){return w._quiet;}).length);
} else {
  var src=fs.readFileSync(DATA_FILE,'utf8'),n=0;
  PEOPLE.concat(WORLDS).forEach(function(o){ if(o._newT==null) return;
    var re=new RegExp("(id:\\s*'"+o.id.replace(/[-]/g,'\\$&')+"',[\\s\\S]{0,200}?\\bt:\\s*)[\\d.]+");
    var nv=src.replace(re,'$1'+o._newT); if(nv!==src){src=nv;n++;}
  });
  WORLDS.forEach(function(w){ if(w._quiet){ var re=new RegExp("(id:\\s*'"+w.id.replace(/[-]/g,'\\$&')+"',)([\\s\\S]{0,160}?label:)"); src=src.replace(re,'$1 quiet: true,$2'); } });
  fs.writeFileSync(DATA_FILE,src);
  console.log('APPLIED: rewrote '+n+' t-values + quiet flags into '+DATA_FILE);
}
