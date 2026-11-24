import test from 'node:test'
import assert from 'node:assert/strict'
import {expectedNavigationCancellation as classify} from './navigation-errors.mjs'
const origin='http://localhost:5175',url=origin+'/api/album'
const error={stack:`Fetch API cannot load ${url} due to access control checks.`,at:150}
const request={url,method:'GET',document:1,at:10,failure:'Load request cancelled',failedAt:150}
const intent={document:1,at:100,committed:true,completedAt:160}
const check=(e=error,q=request,n=intent,engine='WebKit')=>classify(e,[q],[n],engine,origin)
test('WebKit: apenas cancelamento correlacionado a saída confirmada é esperado',()=>{assert.equal(check(),true);assert.equal(check(error,request,{...intent,committed:false}),false);assert.equal(check(error,request,{...intent,at:151}),false);assert.equal(check(error,{...request,at:120}),false);assert.equal(check(error,request,{...intent,document:2}),false)})
test('CORS real, falha de rede ativa e erros arbitrários não são filtrados',()=>{assert.equal(check(error,{...request,failure:'Blocked by CORS'}),false);assert.equal(check(error,{...request,method:'POST'}),false);assert.equal(check(error,{...request,failedAt:900}),false);assert.equal(check({stack:'Erro CORS real',at:150}),false);assert.equal(check({...error,stack:error.stack.replace('/api/album','/api/legends')}),false);assert.equal(check({...error,stack:error.stack.replace('localhost:5175','evil.invalid')}),false);assert.equal(check(error,request,intent,'Chromium'),false)})
