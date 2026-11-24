import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { MANIFESTACOES, criarDiretorDaCasa } from '../public/casa/js/manifestacoes.js'
import { SEQUENCIA_APRESENTACAO } from '../src/experience/hauntings/EventCatalog.ts'

function rig(demo=true){
 const calls=[],events=MANIFESTACOES.map(e=>({...e,duracao:.4,espera:.2}));
 const d=criarDiretorDaCasa(events,demo,{iniciar:e=>calls.push('start:'+e.id),quadro:(e,p,r)=>calls.push(['frame',e.id,p,r]),limpar:e=>calls.push('end:'+e.id)});
 const ctx={dentro:true,pausado:false,perto:true,indice:0,reduzir:false};
 const step=(n=1)=>{for(let i=0;i<n;i++)d.atualizar(.1,ctx)};
 return{d,ctx,calls,step};
}
test('a apresentação da casa mantém as cinco lendas na ordem aprovada',()=>{
 assert.deepEqual(MANIFESTACOES.map(e=>e.id),['espelho','lobo','saci','alta','boitata']);
 assert.deepEqual(MANIFESTACOES.map(e=>e.fonte),SEQUENCIA_APRESENTACAO);
 const r=rig();r.step(160);
 assert.deepEqual(r.calls.filter(x=>typeof x==='string'&&x.startsWith('start')),['start:espelho','start:lobo','start:saci','start:alta','start:boitata']);
 assert.equal(r.d.inspecionar().completa,true);assert.equal(r.d.inspecionar().ativo,null);
 r.step(100);assert.equal(r.calls.filter(x=>typeof x==='string'&&x.startsWith('start')).length,5);
});
test('diálogo/aba oculta pausam a manifestação sem consumir duração',()=>{
 const r=rig();r.step(3);assert.equal(r.d.inspecionar().ativo,'espelho');
 const p=r.d.inspecionar().progresso;r.ctx.pausado=true;r.step(100);assert.equal(r.d.inspecionar().progresso,p);
 r.ctx.pausado=false;r.step(5);assert.equal(r.d.inspecionar().ativo,null);
});
test('a exploração normal exige proximidade e mantém a visita individual por lenda',()=>{
 const r=rig(false);r.ctx.perto=false;r.step(100);assert.equal(r.d.inspecionar().ativo,null);
 r.ctx.perto=true;r.step(8);assert.deepEqual(r.d.inspecionar().vistos,['espelho']);
 r.step(100);assert.equal(r.calls.filter(x=>x==='start:espelho').length,1);
 r.ctx.indice=11;r.step(4);assert.equal(r.d.inspecionar().ativo,'lobo');
});
test('retornar ao jardim e descartar limpam o efeito uma única vez',()=>{
 const r=rig();r.step(3);r.ctx.dentro=false;r.step();assert.equal(r.d.inspecionar().ativo,null);
 assert.equal(r.calls.filter(x=>x==='end:espelho').length,1);
 r.d.dispose();r.d.dispose();r.ctx.dentro=true;r.step(100);assert.equal(r.d.inspecionar().disposed,true);
 assert.equal(r.calls.filter(x=>x==='start:espelho').length,1);
});
test('movimento reduzido é transmitido ao render sem impedir a apresentação',()=>{
 const r=rig();r.ctx.reduzir=true;r.step(160);assert.equal(r.d.inspecionar().completa,true);
 assert.ok(r.calls.filter(Array.isArray).every(c=>c[3]===true));
});
test('quadros lentos não prolongam artificialmente a duração da aparição',()=>{
 const r=rig();r.step(2);assert.equal(r.d.inspecionar().ativo,'espelho');
 r.d.atualizar(.6,r.ctx);assert.equal(r.d.inspecionar().ativo,null);
 assert.deepEqual(r.d.inspecionar().vistos,['espelho']);
});
function clockRig(){
 const window=new EventTarget(),document=new EventTarget(),media=new EventTarget();document.hidden=false;document.documentElement={dataset:{}};media.matches=false;
 let now=0,id=0;const native=new Map();
 const ctx={window,document,Bau:null,matchMedia:()=>media,performance:{now:()=>now},localStorage:{getItem:()=>null},setTimeout:(fn,ms)=>{native.set(++id,{fn,at:now+ms});return id},clearTimeout:id=>native.delete(id)};
 window.Bau={};ctx.Bau=window.Bau;vm.runInNewContext(readFileSync('public/casa/js/ciclo.js','utf8'),ctx);
 const advance=ms=>{now+=ms;for(const[k,t]of [...native])if(t.at<=now){native.delete(k);t.fn()}};
 return{c:window.Bau.ciclo,advance,native,window};
}
test('relógios ocultos preservam atraso restante e não acumulam intervalos',()=>{
 const r=clockRig();let calls=0;r.c.repetir(()=>calls++,100);r.advance(40);r.c.pausar(true);r.advance(2000);assert.equal(calls,0);assert.equal(r.native.size,0);
 r.c.pausar(false);r.advance(59);assert.equal(calls,0);r.advance(1);assert.equal(calls,1);assert.equal(r.native.size,1);
 r.c.dispose();assert.equal(r.native.size,0);assert.equal(r.c.inspecionar().listeners,0);r.advance(1000);assert.equal(calls,1);
});
test('cancelar dentro do callback não rearma intervalo; listeners são removidos',()=>{
 const r=clockRig();let calls=0,clicks=0;const id=r.c.repetir(()=>{calls++;r.c.cancelar(id)},100);
 r.c.ouvir(r.window,'click',()=>clicks++);r.window.dispatchEvent(new Event('click'));r.advance(100);r.advance(1000);
 assert.equal(calls,1);r.c.dispose();r.window.dispatchEvent(new Event('click'));assert.equal(clicks,1);
});
test('ambiente aguarda a manifestação, preservando atalhos e o agendamento original',()=>{
 const timers=[],marks=[];let active='espelho',whispers=0;
 const random=Object.create(Math);random.random=()=>0;
 const Bau={ciclo:{reduzir:()=>false,depois:(fn,ms)=>timers.push({fn,ms})},
  manifestacoes:{inspecionar:()=>({ativo:active})},
  corredor:{estado:{dentro:true,yaw:0,camZ:0},kit:{D:20000,esq:{},dir:{},naEsq:(p,w)=>p-w/2,naDir:(p,w)=>p-w/2,criar:(_tag,classe)=>{const el={classe,remove(){}};marks.push(el);return el}}},
  gore:{escrita:()=>''},som:{sussurro:()=>whispers++}};
 vm.runInNewContext(readFileSync('public/casa/js/aparicoes.js','utf8'),{window:{Bau},Bau,Math:random,document:{hidden:false,getElementById:()=>({hidden:true})}});
 Bau.aparicoes.iniciar();assert.equal(timers[0].ms,6000);
 timers.shift().fn();assert.equal(marks.length,0);assert.equal(timers[0].ms,7000);
 Bau.aparicoes.forcar(1);assert.equal(marks.length,1,'Atalho manual continua disponível durante uma manifestação');
 active=null;timers.shift().fn();assert.equal(marks.length,2);assert.equal(whispers,2);
 assert.ok(timers.some(t=>t.ms===7000),'A seleção ambiental retoma o intervalo original');
});
