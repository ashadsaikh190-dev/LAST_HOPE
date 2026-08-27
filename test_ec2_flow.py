import requests
import json

base = 'http://3.110.135.92'

# 1. Register / Login a test student
reg_payload = {
    'firstName': 'Rahul',
    'lastName': 'Sharma',
    'email': 'rahul.sharma@example.com',
    'password': 'StudentPassword123!',
    'phone': '+919876500001'
}

r_reg = requests.post(f'{base}/api/auth/register', json=reg_payload, timeout=10)
print('Register Status:', r_reg.status_code)
if r_reg.status_code in [200, 201]:
    token = r_reg.json()['data']['token']
else:
    r_login = requests.post(f'{base}/api/auth/login', json={'email': reg_payload['email'], 'password': reg_payload['password']}, timeout=10)
    print('Login Status:', r_login.status_code)
    token = r_login.json()['data']['token']

headers = {'Authorization': f'Bearer {token}'}

# 2. Get Programs
r_prog = requests.get(f'{base}/api/programs', headers=headers, timeout=10)
progs = r_prog.json().get('data', [])
print(f'Programs count: {len(progs)}')
for p in progs:
    name = p.get('name')
    code = p.get('code')
    fee = p.get('tuitionFee')
    print(f' - {name} ({code}) -> Rs {fee}/yr')

# 3. Get Student Documents Checklist
r_docs = requests.get(f'{base}/api/documents', headers=headers, timeout=10)
docs = r_docs.json().get('data', [])
print(f'\nDocuments checklist for student: {len(docs)} document cards')
for d in docs:
    dtype = d.get('documentType')
    status = d.get('status')
    req = d.get('isRequired')
    print(f' - [{status}] {dtype} (Mandatory: {req})')
