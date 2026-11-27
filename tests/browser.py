import argparse, os, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
a=argparse.ArgumentParser();a.add_argument('--url');a.add_argument('--real',action='store_true');a.add_argument('--output',default='/tmp/diamond-results');args=a.parse_args()
out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
server=None
if not args.url:
 server=subprocess.Popen([sys.executable,'-m','http.server',os.environ.get('DIAMOND_PORT','8038'),'--bind','127.0.0.1'],cwd=pathlib.Path(__file__).resolve().parents[1],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 time.sleep(.4)
url=(args.url or 'http://127.0.0.1:'+os.environ.get('DIAMOND_PORT','8038')+'/')+'?seed=42'
try:
 with sync_playwright() as w:
  b=w.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox'])
  c=b.new_context(viewport={'width':390,'height':780},device_scale_factor=2,is_mobile=True,has_touch=True)
  pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('response',lambda r:errs.append(str(r.status)+' '+r.url) if r.status>=400 and not r.url.endswith('favicon.ico') else None)
  pg.add_init_script("""window._hidden=false;Object.defineProperty(document,'hidden',{get(){return window._hidden}})""")
  if not args.real:pg.clock.install()
  pg.goto(url,wait_until='load')
  pg.screenshot(path=out/'home.png')
  print('HTTP homepage:',pg.title(),flush=True)
  L=lambda s:pg.locator(s)
  nap=(lambda ms:pg.wait_for_timeout(ms)) if args.real else (lambda ms:pg.clock.run_for(ms))
  def touch(loc):
   x=loc.bounding_box();assert x,loc
   pg.touchscreen.tap(x['x']+x['width']/2,x['y']+x['height']/2)
  def ready(txt,limit=4000):
   for i in range(limit//25):
    if txt in L('#status').inner_text():return
    nap(25)
   assert False,(txt,L('#status').inner_text())
  touch(L('#mainAction'))
  pr=[]
  for i in range(6):
   ready('球已离手')
   if i==0 and not args.real:
    nap(200);pg.evaluate("window._hidden=true;document.dispatchEvent(new Event('visibilitychange'))")
    nap(2200);assert L('#you').inner_text()=='0'
    pg.evaluate("window._hidden=false;document.dispatchEvent(new Event('visibilitychange'))")
    assert '重新播放' in L('#status').inner_text();ready('球已离手')
   if i<4:
    nap(620 if i<2 else 920)
    touch(L('#swing'))
    if i==0:touch(L('#swing'))
   ready('你：');pr.append([L('#status').inner_text(),L('#detail').inner_text()])
   nap(1100)
  assert '练习完成' in L('#headline').inner_text()
  assert sum('坏球' in r[1] for r in pr)==1
  if not args.real:assert all('甜区' in r[0] or '普通命中' in r[0] for r in pr[:4]),pr
  print('PRACTICE',pr,flush=True)
  t=time.monotonic();touch(L('#subAction'));rows=[]
  for group in range(4):
   if group:
    assert '换边' in L('#headline').inner_text()
    touch(L('#mainAction'))
   for i in range(6):
    if group%2:
     assert L('[data-aim="bad"]').is_enabled()==(i<=3)
     touch(L('[data-speed="slow"]' if i%3==2 else '[data-speed="fast"]'))
     touch(L('[data-aim="bad"]' if i==3 else '[data-aim="outside"]'))
     if group==1 and i==0:
      pg.screenshot(path=out/'pitch.png')
      box=L('#throw').bounding_box();assert box['y']+box['height']<=780
     touch(L('#throw'));ready('AI：');assert L('#throw').is_disabled()
    else:
     ready('球已离手');nap(632 if i%2==0 else 927)
     # Real touch release is checked in practice; late buttons are disabled.
     if L('#swing').is_enabled():touch(L('#swing'))
     ready('你：')
    row=[group+1,i+1,L('#status').inner_text(),L('#detail').inner_text()]
    rows.append(row);nap(1100)
  seconds=time.monotonic()-t
  assert L('#role').inner_text()=='比赛结束' and '各打了 12 球' in L('#blurb').inner_text()
  print('MATCH',seconds,L('#blurb').inner_text(),rows,flush=True)
  pg.screenshot(path=out/'end.png')
  touch(L('#mainAction'));assert L('#you').inner_text()==L('#cpu').inner_text()=='0'
  assert L('#role').inner_text()=='你来击球'
  assert not errs,errs
  d=b.new_page(viewport={'width':1280,'height':900});d.clock.install();d.goto(url+'&rounds=1');d.locator('#subAction').click()
  d.clock.run_for(1350);d.clock.run_for(645);d.keyboard.down('Space');d.clock.run_for(10);d.keyboard.down('Space');d.keyboard.up('Space');d.clock.run_for(600)
  print('DESKTOP',d.locator('#status').inner_text(),d.locator('#detail').inner_text(),flush=True)
  assert '你：' in d.locator('#status').inner_text()
finally:
 if server:server.terminate()
