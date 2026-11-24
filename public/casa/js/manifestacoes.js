// A mesma ordem narrativa da apresentação Three.js, integrada à casa CSS 3D.
export const MANIFESTACOES = [
  { id:'espelho', fonte:'espelho-loira', lenda:'loira-do-banheiro', nome:'Loira do Banheiro', indice:0, duracao:5.8, espera:1.1 },
  { id:'lobo', fonte:'lobo-stumpp', lenda:'peter-stumpp', nome:'Peter Stumpp', indice:11, duracao:4.4, espera:.3 },
  { id:'saci', fonte:'saci-redemoinho', lenda:null, nome:'Saci · uma corrente de ar', indice:31, duracao:5.1, espera:.3 },
  { id:'alta', fonte:'alta-colunas', lenda:'hachishakusama', nome:'Hachishakusama', indice:5, duracao:4.5, espera:.3 },
  { id:'boitata', fonte:'boitata-cinzas', lenda:'boitata', nome:'Boitatá', indice:54, duracao:5.4, espera:.3 },
];

export function criarDiretorDaCasa(eventos, apresentacao, hooks) {
  let ativo=null, decorrido=0, espera=0, silencio=0, passo=0, disposed=false, completa=false;
  const vistos=new Set();
  const cancelar=()=>{ if(ativo)hooks.limpar(ativo);ativo=null;decorrido=0;espera=0; };
  return {
    atualizar(dt, contexto) {
      if(disposed)return;
      if(!contexto.dentro){cancelar();return;}
      // Pausa real: painéis/aba oculta não consomem duração ou antecipação.
      if(contexto.pausado)return;
      dt=Math.max(0,dt);
      if(ativo){
        decorrido+=dt;hooks.quadro(ativo,Math.min(1,decorrido/ativo.duracao),contexto.reduzir);
        if(decorrido>=ativo.duracao){vistos.add(ativo.id);cancelar();silencio=apresentacao?2.4:8;passo++;if(apresentacao&&passo===eventos.length)completa=true;}
        return;
      }
      silencio=Math.max(0,silencio-dt);if(silencio||completa){espera=0;return;}
      const e=apresentacao?eventos[passo]:eventos.find(e=>e.indice===contexto.indice&&!vistos.has(e.id));
      if(!e||!contexto.perto){espera=0;return;}
      espera+=dt;
      if(espera>=e.espera){ativo=e;decorrido=0;espera=0;hooks.iniciar(e);}
    },
    cancelar,
    inspecionar:()=>({ativo:ativo?.id??null,progresso:ativo?decorrido/ativo.duracao:0,passo,completa,vistos:[...vistos],disposed}),
    dispose(){if(disposed)return;cancelar();disposed=true;},
  };
}

const formas = {
 espelho:`<path d="M62 579V179Q65 50 180 29Q295 50 298 179V579Z" fill="#2d372e" stroke="#a28b60" stroke-width="10"/>
 <path d="M77 562V180Q79 71 180 51Q281 71 283 180V562Z" fill="url(#m-vidro)" stroke="#c3b58a" stroke-width="2"/>
 <path d="M43 586H317M56 600H304M62 175H42M298 175H318" stroke="#6d6046" stroke-width="8"/>
 <path d="M141 40Q180 4 219 40M152 24Q180 61 208 24" fill="none" stroke="#ab9568" stroke-width="4"/>
 <g class="manifestacao-reflexo"><path d="M137 310Q120 390 101 533H259Q241 390 223 310Z" fill="#b6b9a1"/>
 <ellipse cx="180" cy="275" rx="29" ry="41" fill="#d0c6ac"/><path d="M150 277Q132 230 180 225Q228 230 210 277M150 262Q141 325 125 390M210 262Q219 325 235 390" stroke="#c8bb82" stroke-width="12" fill="none"/>
 <path d="M164 276H173M188 276H197M175 301H185" stroke="#34332a" stroke-width="3"/></g>
 <path d="M90 165L153 73M238 533L270 486M87 456L139 378M110 430L126 408" stroke="#c2c8b5" opacity=".18" stroke-width="2"/>
 <path d="M102 190Q180 169 263 190M87 459Q180 436 276 459" fill="none" stroke="#9a8f69" opacity=".2"/>`,
 lobo:`<ellipse cx="180" cy="563" rx="143" ry="18" fill="#000" opacity=".45"/>
 <g class="manifestacao-lobo"><path d="M24 421L55 405L73 369L112 379Q164 329 219 353L247 324L258 282L284 310L312 300L305 335L340 357L321 378L288 380L267 417L252 451L250 538L230 551L226 465L211 425L147 433L124 485L118 546L94 551L99 470L77 443L38 446Z" fill="#161e1b" stroke="#8e9e8f" stroke-width="2"/>
 <path d="M75 409L92 386L109 404L130 374L148 392L170 366L191 381L216 367M257 354L276 341L299 348" stroke="#a2a98e" opacity=".5" fill="none"/>
 <path d="M287 332L298 334" stroke="#d5b179" stroke-width="3"/><path d="M308 364L328 363" stroke="#b9b9a4" stroke-width="2"/>
 <path d="M51 420Q10 430 22 461" stroke="#26342c" stroke-width="16" fill="none"/></g>`,
 saci:`<ellipse cx="180" cy="567" rx="116" ry="19" fill="#000" opacity=".35"/>
 <g class="manifestacao-ar"><path d="M65 511Q288 570 300 466Q305 392 100 427Q34 445 70 479Q121 516 267 458M109 407Q288 378 253 348Q210 313 92 356M127 547Q201 571 260 525" fill="none" stroke="#a8ac93" opacity=".48" stroke-width="3"/>
 <path d="M83 465L102 454L100 472ZM272 403L289 390L282 414ZM128 351L140 337L144 354Z" fill="#918665"/></g>
 <g class="manifestacao-saci"><path d="M143 243Q140 210 166 198Q187 174 215 194L221 228L242 240Z" fill="#9d382c" stroke="#b96548" stroke-width="2"/>
 <ellipse cx="184" cy="260" rx="33" ry="37" fill="#73513a"/>
 <path d="M168 290Q136 346 152 399L178 430L183 513L164 540L197 538L207 516L205 421L222 386Q217 329 200 291Z" fill="#634831" stroke="#ad9470" stroke-width="2"/>
 <path d="M158 316L126 353L104 337M211 317L237 348L264 331" fill="none" stroke="#826044" stroke-width="12" stroke-linecap="round"/>
 <path d="M201 275H230V264H244V279H231" stroke="#bea172" fill="none" stroke-width="4"/>
 <path d="M239 249Q224 231 240 214" fill="none" stroke="#b5b39c" opacity=".35" stroke-width="2"/></g>`,
 alta:`<ellipse cx="180" cy="573" rx="74" ry="10" fill="#000" opacity=".3"/>
 <g class="manifestacao-alta"><path d="M160 170Q142 256 132 360L115 568H247L224 358Q216 245 198 170Z" fill="#c2c6b6" opacity=".75"/>
 <path d="M165 200L156 526M192 227L207 546M177 322L176 557" stroke="#58685d" stroke-width="3" opacity=".4"/>
 <path d="M143 207L110 367M213 205L247 362" stroke="#c5c5af" stroke-width="12" stroke-linecap="round"/>
 <ellipse cx="179" cy="134" rx="25" ry="36" fill="#c5c7b0"/><path d="M151 142Q132 91 180 87Q220 90 209 144L199 116Q175 110 157 131Z" fill="#263028"/>
 <path d="M149 139Q139 173 145 219M209 139Q222 176 215 223" fill="none" stroke="#263028" stroke-width="9"/>
 <path d="M135 99Q177 74 219 98" fill="none" stroke="#c5c7b0" stroke-width="11"/></g>`,
 boitata:`<ellipse cx="180" cy="545" rx="157" ry="34" fill="url(#m-fogo)"/>
 <g class="manifestacao-fogo"><path d="M22 501Q75 429 135 474T226 440Q192 393 257 378Q302 368 331 414" stroke="#b46631" stroke-width="29" opacity=".18" fill="none"/>
 <path d="M22 501Q75 429 135 474T226 440Q192 393 257 378Q302 368 331 414" stroke="#d9a34c" stroke-width="9" fill="none"/>
 <path d="M22 501Q75 429 135 474T226 440Q192 393 257 378Q302 368 331 414" stroke="#f2dd9c" stroke-width="2" fill="none"/>
 <path d="M327 398Q353 405 342 423L324 424L315 413Z" fill="#e8bd65"/>
 <path d="M64 440l4-9M113 457l-4-10M178 474l5-8M245 416l-4-11M290 367l5-10M210 380l3-10" stroke="#d9b574" stroke-width="2" opacity=".65"/></g>`,
};

export function iniciarManifestacoes(Bau) {
 const c=Bau.corredor,params=new URLSearchParams(location.search);
 const demo=params.get('apresentacao')==='1'&&params.get('demonstracao')==='1';
 const eventos=MANIFESTACOES.map(e=>({...e,indice:e.lenda?Math.max(0,Bau.lendas.findIndex(l=>l.id===e.lenda)):e.indice}));
 const root=c.adicionar('div','manifestacao','left:540px;top:120px;width:360px;height:600px;display:none');root.setAttribute('aria-hidden','true');
 const legenda=document.createElement('p');legenda.id='manifestacao-legenda';legenda.setAttribute('role','status');document.body.append(legenda);
 let svg=null;
 if(demo)document.body.classList.add('demonstracao');
 const diretor=criarDiretorDaCasa(eventos,demo,{
  iniciar(e){
   root.innerHTML=`<svg width="360" height="600" viewBox="0 0 360 600" class="manifestacao-${e.id}" aria-hidden="true"><defs><linearGradient id="m-vidro" x2="1" y2="1"><stop stop-color="#6f827c"/><stop offset=".48" stop-color="#0e1a1a"/><stop offset="1" stop-color="#29362d"/></linearGradient><radialGradient id="m-fogo"><stop stop-color="#b68d42" stop-opacity=".35"/><stop offset="1" stop-color="#b68d42" stop-opacity="0"/></radialGradient></defs>${formas[e.id]}</svg>`;
   svg=root.firstElementChild;root.style.display='';root.style.opacity='0';root.style.transform=`translateZ(${-c.estado.camZ-950}px)`;
   legenda.textContent=e.nome;legenda.classList.add('ver');
   if(e.id==='espelho')Bau.som.sussurro();if(e.id==='lobo')Bau.som.rangido();if(e.id==='saci')Bau.som.vento();if(e.id==='alta')Bau.som.popopo();
  },
  quadro(e,p,reduzir){
   root.style.opacity=String(Math.min(1,p*5,(1-p)*5));
   root.classList.toggle('movimento-reduzido',reduzir);
   // Mínimos movimentos locais; o plano continua no mundo, não na interface.
   const x=reduzir?0:e.id==='lobo'?Math.sin((p-.5)*Math.PI)*120:e.id==='saci'?Math.sin(p*Math.PI*2)*18:0;
   svg.style.transform=`translateX(${x}px)`;
   const reflexo=root.querySelector('.manifestacao-reflexo');if(reflexo)reflexo.style.opacity=String(Math.max(0,Math.min(1,(p-.2)*6,(.84-p)*6))*.78);
  },
  limpar(){root.style.display='none';root.replaceChildren();legenda.classList.remove('ver');legenda.textContent='';},
 });
 return {
  atualizar(dt){diretor.atualizar(dt,{dentro:c.estado.dentro,indice:c.estado.i,perto:Math.abs(c.estado.camZ-c.estado.alvoZ)<65,pausado:document.hidden||!document.getElementById('dossie').hidden,reduzir:Bau.ciclo.reduzir()});},
  inspecionar:diretor.inspecionar,
  dispose(){diretor.dispose();root.remove();legenda.remove();},
 };
}
