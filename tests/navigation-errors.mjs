// Somente erros do WebKit ligados a um request cancelado por uma navegação
// efetivamente concluída podem receber a classificação esperada.
export function expectedNavigationCancellation(error, requests, intents, engine, origin) {
  if(engine!=='WebKit')return false
  const match=error.stack?.match(/Fetch API cannot load (https?:\/\/\S+) due to access control checks\./)
  if(!match)return false
  const url=new URL(match[1])
  if(url.origin!==origin||!['/api/auth/me','/api/album'].includes(url.pathname))return false
  return requests.some(q=>q.url===url.href&&q.method==='GET'&&q.failure==='Load request cancelled'&&
    Math.abs(q.failedAt-error.at)<=500&&intents.some(n=>n.document===q.document&&
      q.at<=n.at&&n.at<=q.failedAt&&n.committed&&q.failedAt<=n.completedAt))
}
export function observeNavigationErrors(page,engine,origin){
  const requests=[],errors=[],intents=[];const map=new Map();let document=0,id=0
  page.on('framenavigated',frame=>{if(frame===page.mainFrame()){document++;for(const n of intents)if(!n.committed){n.committed=true;n.completedAt=Date.now()}}})
  page.on('request',q=>{const item={id:++id,url:q.url(),method:q.method(),document,at:Date.now()};requests.push(item);map.set(q,item)})
  page.on('requestfailed',q=>Object.assign(map.get(q)??{},{failure:q.failure()?.errorText,failedAt:Date.now()}))
  page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,at:Date.now(),document}))
  return {requests,errors,intents,begin(){intents.push({document,at:Date.now(),committed:false,completedAt:Infinity})},
    classify(){return errors.map(e=>({...e,expected:expectedNavigationCancellation(e,requests,intents,engine,origin)}))}}
}
