/* Cenografia autoral em planos CSS/SVG; compartilha a câmera existente. */
window.Bau = window.Bau || {};
Bau.arte = (() => {
  function jardim(k, cartaz) {
    const camada = (prof, w, h, html, classe, base=900) => cartaz(720, prof, w, h, html, {classe,base});
    for (const [prof,w,h] of [[-3100,3200,280],[-1650,2400,220]]) {
      const bruma=camada(prof,w,h,'',prof===-1650?'arte-bruma arte-bruma-longe':'arte-bruma');bruma.innerHTML='<div class="arte-bruma-camada"></div>';
    }
    // Faixas no chão orientam o percurso sem ocultar as pedras.
    for (const prof of [-3800,-2500]) {
      const luz=k.criar('div','arte-luz-chao',`left:${Bau.jardim.caminhoX(prof)-340}px;top:${900-(600)}px;width:680px;height:600px;transform-origin:50% 100%;transform:translateZ(${-prof+300}px) rotateX(90deg)`,document.querySelector('.j-palco-chao'));
      luz.setAttribute('aria-hidden','true');
    }

  }
  function corredor(k) {
    // Um ritmo arquitetônico espaçado, recortado junto com as superfícies.
    for(let prof=-120;prof<k.D;prof+=1600) {
      const arco=k.criar('div','arte-arco',`left:0;top:0;width:1440px;height:900px;transform:translateZ(${-prof}px)`);
      k.recortar(arco,prof,prof);
      const piso=k.criar('div','arte-luz-piso',`left:100px;top:${k.noChao(prof+180,1000)}px;width:1240px;height:1000px`,k.chao);
      k.recortar(piso,prof-500,prof+900);
    }
    const prof=520, parede=k.dir;
    const console=k.criar('div','arte-console',`left:${k.naDir(prof,310)}px;top:650px;width:310px;height:250px`,parede,
      '<svg width="310" height="250" viewBox="0 0 310 250" aria-hidden="true"><path d="M12 25H298L286 55H24Z" fill="#3b3024" stroke="#897454" stroke-width="3"/><path d="M26 58H284V98H26Z" fill="#211c16" stroke="#66513a" stroke-width="2"/><path d="M40 100Q65 165 28 245M270 100Q245 165 282 245" fill="none" stroke="#3f3325" stroke-width="16"/><path d="M70 82H240" stroke="#8b7958" stroke-width="2"/><ellipse cx="155" cy="76" rx="9" ry="4" fill="#8b7958"/><path d="M203 22L213 0H240L251 22Z" fill="#787563"/><path d="M208 5H245" stroke="#aaa188" opacity=".4"/></svg>');
    k.recortar(console,prof-250,prof+250);
    const espelho=k.criar('div','arte-espelho',`left:${k.naDir(prof,240)}px;top:240px;width:240px;height:380px`,parede,
      '<div class="arte-vidro"><span class="arte-reflexo"></span></div>');
    k.recortar(espelho,prof-250,prof+250);
    const sombra=k.criar('div','arte-sombra-janela',`left:0;top:${k.noChao(1850,1600)}px;width:1440px;height:1600px`,k.chao);
    k.recortar(sombra,1050,2650);
  }
  return { jardim, corredor };
})();
