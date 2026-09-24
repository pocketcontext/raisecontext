#!/usr/bin/env python3
"""Exercise RaiseContext through HTTP against an isolated temporary database."""
import argparse
import concurrent.futures
import contextlib
import json
from pathlib import Path
import socket
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

@contextlib.contextmanager
def server(binary):
    with tempfile.TemporaryDirectory(prefix='raisecontext-test-') as tmp:
        hooks=Path(tmp)/'pb_hooks'
        shutil.copytree(ROOT/'pb_hooks',hooks)
        (hooks/'failure_fixture.pb.js').write_text('''
onRecordCreateExecute((e) => {
  if(e.record.getString('record') === 'auditfailure001') throw new Error('Synthetic audit failure');
  e.next();
}, 'audit_log');
onRecordCreateExecute((e) => {
  if(e.record.id === 'dirfailure00001') throw new Error('Synthetic directory failure');
  e.next();
}, 'user_directory');
''')
        common = [str(Path(binary).resolve()), '--dir', str(Path(tmp)/'pb_data'), '--migrationsDir', str(ROOT/'pb_migrations'), '--hooksDir', str(hooks)]
        result = subprocess.run(common+['superuser','upsert','admin@example.com','SyntheticAdminPassword123!'],cwd=ROOT,capture_output=True,text=True)
        assert result.returncode == 0, result.stdout+result.stderr
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        with open(Path(tmp)/'server.log','w+') as log:
            proc=subprocess.Popen(common+['serve','--http',f'127.0.0.1:{port}'],cwd=ROOT,stdout=log,stderr=log)
            def request(method,path,body=None,token=None,expected=200):
                headers={'Content-Type':'application/json'}
                if token: headers['Authorization']=token
                req=urllib.request.Request(f'http://127.0.0.1:{port}'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
                try:
                    with urllib.request.urlopen(req,timeout=20) as r: status,raw=r.status,r.read()
                except urllib.error.HTTPError as e: status,raw=e.code,e.read()
                assert status in (expected if isinstance(expected,tuple) else (expected,)), (method,path,status,raw.decode())
                return json.loads(raw) if raw else None
            try:
                for _ in range(150):
                    try: request('GET','/api/health'); break
                    except (OSError,AssertionError):
                        if proc.poll() is not None: log.seek(0); raise AssertionError(log.read())
                        time.sleep(.1)
                else: raise AssertionError('Server startup timed out')
                request.base_url = f'http://127.0.0.1:{port}'
                yield request
            finally:
                proc.terminate();proc.wait(timeout=15)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--binary',required=True);args=parser.parse_args()
    with server(args.binary) as request:
        path=lambda table: '/api/collections/'+table+'/records'
        admin=request('POST','/api/collections/_superusers/auth-with-password',{'identity':'admin@example.com','password':'SyntheticAdminPassword123!'})['token']
        user=request('POST',path('users'),{'email':'agent@example.com','name':'Synthetic agent','password':'SyntheticUserPassword123!','passwordConfirm':'SyntheticUserPassword123!'},admin)
        token=request('POST','/api/collections/users/auth-with-password',{'identity':'agent@example.com','password':'SyntheticUserPassword123!'})['token']
        create=lambda table,body: request('POST',path(table),body,token)
        def patch(table,row,body,expected=200):
            return request('PATCH',path(table)+'/'+row['id'],dict(expected_revision=row['revision'],**body),token,expected)
        request('POST',path('organizations'),{'id':'auditfailure001','name':'Audit rollback'},token,(400,500))
        request('GET',path('organizations')+'/auditfailure001',token=token,expected=404)
        org=create('organizations',{'name':'Synthetic Ventures'})
        assert org['revision']==1 and org['created_by']==user['id']
        request('PATCH',path('organizations')+'/'+org['id'],{'name':'Missing revision'},token,400)
        updated=patch('organizations',org,{'description':'Synthetic investor'})
        patch('organizations',org,{'name':'Stale'},409)
        patch('organizations',updated,{'revision':42},400)
        def race(i): return patch('organizations',updated,{'description':f'Concurrent {i}'},(200,409))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(race,range(2)))
        assert sum('id' in r for r in results)==1
        person=create('people',{'name':'Synthetic Investor','organization':org['id']})
        round_=create('rounds',{'name':'Synthetic seed','currency':'USD','target_minor':100000000,'status':'active'})
        payload={'round':round_['id'],'organization':org['id'],'stage':'research','currency':'USD'}
        opportunity=create('opportunities',payload)
        request('POST',path('opportunities'),payload,token,400)
        request('POST',path('opportunities'),dict(payload,person=person['id']),token,400)
        request('POST',path('opportunities'),dict(payload,organization='',person=person['id'],currency='EUR'),token,400)
        patch('rounds',round_,{'currency':'EUR'},400)
        patch('opportunities',opportunity,{'stage':'passed'},400)
        participant=create('opportunity_participants',{'opportunity':opportunity['id'],'person':person['id'],'role':'partner','active':True})
        create('notes',{'opportunity':opportunity['id'],'kind':'assessment','title':'Synthetic fit','body':'Test evidence'})
        request('POST',path('notes'),{'kind':'research','title':'Unlinked','body':'Test'},token,400)
        create('activities',{'opportunity':opportunity['id'],'kind':'meeting','title':'Synthetic meeting','status':'planned'})
        create('drafts',{'person':person['id'],'body':'Unsent synthetic draft','status':'draft'})
        create('messages',{'person':person['id'],'direction':'incoming','body':'Synthetic received message','occurred_at':'2026-09-24 12:00:00.000Z'})
        commitment=create('commitments',{'opportunity':opportunity['id'],'amount_minor':10000,'currency':'USD','status':'indicated'})
        receipt={'commitment':commitment['id'],'amount_minor':4000,'currency':'USD','status':'recorded','received_at':'2026-09-24 12:00:00.000Z','evidence':'Synthetic bank reference'}
        request('POST',path('receipts'),receipt,token,400)
        patch('commitments',commitment,{'status':'signed'},400)
        signed=patch('commitments',commitment,{'status':'signed','signed_at':'2026-09-24 12:00:00.000Z','evidence':'Synthetic signed reference'})
        first=create('receipts',receipt)
        request('POST',path('receipts'),dict(receipt,currency='EUR'),token,400)
        request('POST',path('receipts'),dict(receipt,amount_minor=7000),token,400)
        request('POST',path('receipts'),dict(receipt,amount_minor=1.5),token,400)
        patch('commitments',signed,{'status':'cancelled'},400)
        patch('commitments',signed,{'amount_minor':3000},400)
        patch('receipts',first,{'amount_minor':3000},400)
        voided=patch('receipts',first,{'status':'void','void_reason':'Synthetic correction'})
        patch('receipts',voided,{'status':'recorded'},400)
        # Competing receipts are serialized with validation and cannot exceed the commitment.
        def fund(i): return request('POST',path('receipts'),dict(receipt,amount_minor=7000),token,(200,400))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: funded=list(pool.map(fund,range(2)))
        assert sum('id' in row for row in funded)==1, funded
        request('DELETE',path('organizations')+'/'+org['id'],token=token,expected=(403,404))
        request('POST',path('audit_log'),{'action':'create'},token,403)
        rows=request('POST','/api/context/query',{'sql':'SELECT id, name FROM organizations'},token)
        assert rows['rows']
        request('POST','/api/context/query',{'sql':'SELECT * FROM users'},token,400)
        audit=request('GET',path('audit_log')+'?perPage=100',token=token)['items']
        assert any(row['record']==org['id'] and row['actor']==user['id'] for row in audit)
        # A failed batch must not persist a preceding valid write.
        before=request('GET',path('organizations'),token=token)['totalItems']
        request('POST','/api/batch',{'requests':[{'method':'POST','url':path('organizations'),'body':{'name':'Rolled back'}},{'method':'POST','url':path('receipts'),'body':dict(receipt,currency='EUR')}]},token,400)
        assert request('GET',path('organizations'),token=token)['totalItems']==before
    print('RaiseContext integration checks passed')

if __name__=='__main__': main()
