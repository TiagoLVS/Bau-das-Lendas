"""Etapa 08: somente serviços próprios e PostgreSQL de testes já preparado."""
from pathlib import Path
import os, socket, subprocess, sys, time
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
import httpx, psycopg
ROOT=Path(__file__).resolve().parents[2]
RUNTIME=ROOT/'tests/artifacts/compat-mobile/runtime'
OUT=ROOT/'tests/artifacts/etapa08'
load_dotenv(ROOT/'backend/.env.test',override=True)
u=make_url(os.environ['DATABASE_URL'])
assert os.environ['APP_ENV']=='test'and(u.host,u.port,u.database)==('127.0.0.1',55439,'bau_test')
data=RUNTIME/'pgdata'
assert(RUNTIME/'owned-test-cluster').is_file()and(data/'PG_VERSION').read_text().strip()=='18'
phase='navigation'
for port in(8000,5175,55439):
 with socket.socket()as s:
  s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind(('127.0.0.1',port))
api=front=None;logs=[];pg=False;failed=False
try:
 subprocess.run(['/usr/lib/postgresql/18/bin/pg_ctl','-D',str(data),'-l',str(OUT/'postgres.log'),'-o','-h 127.0.0.1 -p 55439 -k /tmp','-w','start'],check=True,stdout=subprocess.DEVNULL);pg=True
 with psycopg.connect(host=u.host,port=u.port,user=u.username,password=u.password,dbname='bau_test')as c:
  assert c.execute('SELECT version_num FROM alembic_version').fetchone()[0]=='0002'
  assert c.execute('SELECT count(*) FROM legends').fetchone()[0]==60
 print('Banco isolado existente conferido; nenhuma migration/seed.',flush=True)
 for name,args,cwd in [('api',[sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000','--no-proxy-headers'],ROOT/'backend'),('front',['node','node_modules/vite/bin/vite.js','preview','--outDir',str(RUNTIME/'dist'),'--host','127.0.0.1'],ROOT)]:
  f=(OUT/(phase+'-'+name+'.log')).open('w');logs.append(f);p=subprocess.Popen(args,cwd=cwd,stdout=f,stderr=f)
  if name=='api':api=p
  else:front=p
 for url in ['http://127.0.0.1:8000/api/health','http://localhost:5175/']:
  for _ in range(100):
   try:
    if httpx.get(url,timeout=1).status_code==200:break
   except httpx.HTTPError:pass
   time.sleep(.15)
  else:raise RuntimeError('Serviço de teste indisponível')
 env=dict(os.environ,BAU_TEST_ORIGIN='http://localhost:5175',BAU_TEST_DATABASE='bau_test',PLAYWRIGHT_BROWSERS_PATH=str(RUNTIME/'browsers'),BAU_MOBILE_PHASE=phase,BAU_NAV_ARTIFACT_DIR=str(OUT))
 scripts=os.environ.get('BAU_STABILIZATION_SCRIPTS','tests/chest-browser.mjs,tests/educational-integration.mjs,tests/stage03-auth-browser.mjs,tests/mobile-fixes-regression.mjs,tests/educational-navigation.mjs').split(',')
 for script in scripts:
  r=subprocess.run(['node',script],cwd=ROOT,env=env,timeout=900);failed=failed or r.returncode!=0;print(script,'exit',r.returncode,flush=True)
 if os.environ.get('BAU_STABILIZATION_REGRESSION')=='1':
  with(OUT/'python.log').open('w')as f:
   r=subprocess.run([sys.executable,'-m','pytest','tests/test_game.py','tests/test_security.py','tests/test_rewards.py','-k','not sqlite','-q','-p','no:cacheprovider'],cwd=ROOT/'backend',env=env,stdout=f,stderr=f,timeout=300)
  failed=failed or r.returncode!=0;print('Python relevante exit',r.returncode,flush=True)
finally:
 for p in(front,api):
  if p and p.poll()is None:p.terminate();p.wait(timeout=15)
 for f in logs:f.close()
 if pg:subprocess.run(['/usr/lib/postgresql/18/bin/pg_ctl','-D',str(data),'-m','fast','-w','stop'],check=True,stdout=subprocess.DEVNULL)
 print('FIM: serviços próprios encerrados; banco fictício preservado.',flush=True)

if failed:sys.exit(1)
