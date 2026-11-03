import {$,config,abis,state,esc,link,form,field,read,tx,mine,start,button,chainTime} from '../core.js';
import {nice,tick,optional,many} from '../w3kit.js';
const ZERO='0x0000000000000000000000000000000000000000';
const tally={round:0,pot:0n,price:0n};
let deadline=0,skew=0,live=false;
const two=n=>String(n).padStart(2,'0');
const clockText=s=>{s=Math.max(0,Math.floor(s));return `${two(Math.floor(s/60))}:${two(s%60)}`;};
const short=a=>`${a.slice(0,6)}…${a.slice(-4)}`;
/** The hill: a stepped pixel slope, the king's pole and flag (their banner), and pennants of earlier kings down the slope. */
function scene(king,flag,crowns){
 const pennants=crowns.slice(1,7).map((c,i)=>{const x=70+i*58,y=300-i*14-(i>2?(i-2)*10:0);return `<g class="old"><path d="M${x} ${y}v-26" class="pole"/><path d="M${x} ${y-26}h16l-5 5 5 5h-16z" style="fill:hsl(${(parseInt(c.king.slice(2,8),16)%360)},70%,62%)"/></g>`;}).reverse().join('');
 const banner=esc((flag||'(no flag)').slice(0,24));
 return `<svg class="hill" viewBox="0 0 640 360" role="img" aria-label="${king?`The hill, held by ${esc(short(king))}`:'The hill is empty'}">
  <rect width="640" height="360" class="sky"/><g class="stars"><rect x="60" y="40" width="4" height="4"/><rect x="200" y="70" width="4" height="4"/><rect x="520" y="50" width="4" height="4"/><rect x="420" y="96" width="3" height="3"/><rect x="110" y="120" width="3" height="3"/></g>
  <g class="moon"><rect x="540" y="40" width="40" height="40"/><rect x="532" y="48" width="8" height="24"/><rect x="580" y="48" width="8" height="24"/><rect x="548" y="32" width="24" height="8"/><rect x="548" y="80" width="24" height="8"/></g>
  <path class="far" d="M0 300h80v-20h60v-20h80v20h60v-10h80v20h60v-30h80v20h80v20h60v60H0z"/>
  <path class="slope" d="M0 360v-40h80v-20h60v-20h50v-20h40v-20h40v-20h40v-20h60v20h40v20h40v20h40v20h50v20h60v20h40v40z"/>
  <path class="grass" d="M0 320h80v-20h60v-20h50v-20h40v-20h40v-20h40v-20h60v20h40v20h40v20h40v20h50v20h60v20h40v6H0z"/>
  ${pennants}
  <g class="pole-g"><path d="M330 180V70" class="pole king-pole"/><rect x="330" y="70" width="${Math.max(120,banner.length*11+30)}" height="40" class="flag"/><text x="345" y="96" class="flag-text">${banner}</text></g>
  ${king?`<g class="king"><rect x="300" y="150" width="20" height="30" class="body"/><rect x="302" y="134" width="16" height="16" class="head"/><path d="M300 134v-14l5 6 5-8 5 8 5-6v14z" class="crown"/></g>`:'<text x="320" y="166" text-anchor="middle" class="empty-text">UNCLAIMED</text>'}
 </svg>`;
}
function panel(r,id,credit,rang){
 const king=r.king!==ZERO,yours=king&&mine(r.king);
 let html=`<div class="throne-head"><span class="eyebrow">Round ${id+1}</span><h2>${!king?'The hill is empty':rang?'The bell has rung':yours?'You hold the hill':'Take the hill'}</h2></div>`;
 if(rang)html+=`<p>${yours?'You won':`${esc(short(r.king))} won`}: ring the bell to pay out ${nice(r.pot*7000n/10000n)} BOT and start the next round.</p>`+form('settle','','Ring the bell',async()=>tx('Hillking','settle'));
 else if(yours)html+='<p>Hold on. Anyone who takes the hill now pays you a 10% toll and resets the clock.</p>';
 else html+=`<p>${king?`Dethrone ${esc(short(r.king))}: they get a 10% toll, the rest grows the pot, and the clock restarts.`:'First claim of the round starts the clock.'}</p>`
  +form('claim',optional(field('flag','Plant a flag (your banner)','','text','maxlength="48" placeholder="gm from the summit"')),`Claim for ${nice(r.price)} BOT`,async f=>{if(new TextEncoder().encode(f.flag||'').length>48)throw Error('Keep the flag to 48 bytes.');await tx('Hillking','claim',[f.flag||''],r.price);});
 if(credit>0n)html+=`<div class="purse"><span class="sub">Your winnings and tolls</span><strong>${nice(credit,18,6)} BOT</strong>${button('Withdraw',()=>tx('Hillking','withdraw'),true)}</div>`;
 return html;
}
function controls(){
 $('list-title').textContent='The summit';
 $('controls').innerHTML='<div class="throne-head"><span class="eyebrow">King of the hill</span><h2>Take the hill</h2></div><p>The crown price, the clock and the claim button appear here once the hill is live.</p>';
 $('rules').innerHTML='<ul><li>Pay exactly the crown price to become king. Each claim raises the price 2%.</li><li>Every claim resets the clock to 10 minutes.</li><li>The dethroned king gets 10% of the new claim; 90% grows the pot.</li><li>When the clock runs out: king 70%, next round 25%, treasury 5%.</li><li>Payouts wait in the contract until you withdraw them.</li></ul>';
}
async function render(){
 const [id,r]=await read('Hillking','current'),now=await chainTime();skew=now-Date.now()/1000;const n=Number(id);
 const [crowns,credit,prev]=await Promise.all([read('Hillking','recentCrowns',[id,10n]),state.account?read('Hillking','credit',[state.account]):0n,n>0?many([...Array(Math.min(n,6)).keys()].map(k=>({address:config.contracts.Hillking,abi:abis.Hillking,functionName:'getRound',args:[BigInt(n-1-k)]}))):[]]);
 const king=r.king!==ZERO,rang=king&&now>=Number(r.deadline);deadline=Number(r.deadline)-skew;live=king&&!rang;
 Object.assign(tally,{round:n+1,pot:r.pot,price:r.price});
 $('controls').innerHTML=panel(r,n,credit,rang);
 const left=king?Number(r.deadline)-now:600;
 const ladder=crowns.length?`<ol class="ladder">${crowns.map((c,i)=>`<li class="${i===0?'top':''}"><span class="rank">${i===0?'♛':i+1}</span><span class="who">${mine(c.king)?'you':link(c.king)}</span><span class="banner">${esc(c.flag)||'—'}</span><span class="mono">${nice(c.paid,18,5)}</span></li>`).join('')}</ol>`:'<p class="empty">No crowns yet this round.</p>';
 const hist=prev.length?`<div class="history"><h3>Past kings</h3><ul>${prev.filter(Boolean).map((p,k)=>`<li><span>Round ${n-k}</span><span>${p.king===ZERO?'—':mine(p.king)?'you':link(p.king)}</span><b class="mono">${nice(p.prize)} BOT</b><span class="tiny">${p.crowns} crowns</span></li>`).join('')}</ul></div>`:'';
 return `<div class="summit">
  ${scene(king?r.king:null,crowns[0]?.flag,crowns)}
  <div class="scoreboard">
   <div class="clock${left<=60&&king&&!rang?' danger':''}${rang?' rang':''}"><span class="sub">${!king?'Clock starts on first claim':rang?'Bell rang':'Time left'}</span><strong id="clock" aria-live="off">${rang?'00:00':clockText(left)}</strong></div>
   <div><span class="sub">Pot</span><strong>${nice(r.pot)} BOT</strong><span class="tiny">King takes ${nice(r.pot*7000n/10000n)}${r.carried>0n?` · ${nice(r.carried)} carried in`:''}</span></div>
   <div><span class="sub">Crown price</span><strong>${nice(r.price,18,5)} BOT</strong><span class="tiny">Next: ${nice(r.price*10200n/10000n,18,5)} · toll to king ${nice(r.price/10n,18,5)}</span></div>
  </div>
  ${king?`<p class="reign">${mine(r.king)?'You hold':`${link(r.king)} holds`} the hill${crowns[0]?.flag?` and flies “${esc(crowns[0].flag)}”`:''} · ${r.crowns} claim${r.crowns===1?'':'s'} this round</p>`:''}
  <h3 class="ladder-title">Crown ladder</h3>${ladder}${hist}
 </div>`;
}
function after(){
 tick(()=>{if(!live)return;const s=deadline-Date.now()/1000,el=$('clock');if(!el)return;el.textContent=clockText(s);el.parentElement.classList.toggle('danger',s<=60);if(s<=0){live=false;$('refresh').click();}});
}
function stats(empty){return [['Round',empty?'—':String(tally.round)],['Pot',empty?'—':`${nice(tally.pot)} BOT`],['Crown price',empty?'—':`${nice(tally.price,18,5)} BOT`]];}
start({controls,render,stats,after});
