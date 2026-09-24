#!/usr/bin/env python3
"""Portable CLI against isolated application data, including stale-write rejection."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from integration import ROOT, server

parser=argparse.ArgumentParser()
parser.add_argument('--binary',required=True)
parser.add_argument('--write-schema',action='store_true')
args=parser.parse_args()
with server(args.binary) as request, tempfile.TemporaryDirectory(prefix='raisecontext-skill-') as tmp:
    admin=request('POST','/api/collections/_superusers/auth-with-password',{'identity':'admin@example.com','password':'SyntheticAdminPassword123!'})['token']
    password='SyntheticSkillPassword123!'
    request('POST','/api/collections/users/records',{'email':'skill@example.com','name':'Synthetic skill','password':password,'passwordConfirm':password},admin)
    token=request('POST','/api/collections/users/auth-with-password',{'identity':'skill@example.com','password':password})['token']
    schema=request('GET','/api/context/schema',token=token)
    snapshot=ROOT/'skills/raisecontext/references/schema.json'
    if args.write_schema: snapshot.write_text(json.dumps(schema,indent=2)+'\n')
    assert json.loads(snapshot.read_text())==schema,'Schema changed; review and regenerate snapshot'
    skill=Path(tmp)/'portable'
    shutil.copytree(ROOT/'skills/raisecontext',skill)
    env={**os.environ,'HOME':tmp,'XDG_CACHE_HOME':str(Path(tmp)/'cache'),'RAISECONTEXT_URL':request.base_url,'RAISECONTEXT_USER_EMAIL':'skill@example.com','RAISECONTEXT_USER_PASSWORD':password}
    def cli(*argv,expected=0):
        result=subprocess.run(['python3',str(skill/'scripts/rc.py'),*argv],env=env,cwd=tmp,capture_output=True,text=True)
        assert password not in result.stdout+result.stderr and token not in result.stdout+result.stderr
        assert result.returncode==expected,(argv,result.stdout,result.stderr)
        return result.stdout
    cli('whoami');cli('check')
    org=json.loads(cli('create','organizations','{"name":"Synthetic investor"}'))
    row=json.loads(cli('get','organizations',org['id']))
    assert row['name']=='Synthetic investor'
    body=json.dumps({'name':'Updated synthetic investor','expected_revision':org['revision']})
    cli('update','organizations',org['id'],body)
    cli('update','organizations',org['id'],body,expected=4)
    cli('update','organizations',org['id'],'{"name":"No revision"}',expected=2)
    cli('query','SELECT name FROM organizations')
    cli('batch',json.dumps([{'method':'POST','url':'/api/collections/organizations/records','body':{'name':'Batch synthetic investor'}}]))
    cli('batch',json.dumps([{'method':'POST','url':'/api/collections/users/records','body':{}}]),expected=2)
    cli('logout')
print('Portable skill and schema checks passed.')
