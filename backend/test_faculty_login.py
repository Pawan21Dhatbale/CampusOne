import urllib.request
import json

BASE_URL = 'http://127.0.0.1:5000/api/v1'

def post_json(endpoint, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(
        BASE_URL + endpoint,
        data=json.dumps(data).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

def get_json(endpoint, token):
    headers = {'Authorization': f'Bearer {token}'}
    req = urllib.request.Request(BASE_URL + endpoint, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

print("=== 1. Testing Login for Dr. Pramod Ganjewar ===")
status, body = post_json('/auth/login', {
    'email': 'pramodganjewar@mitaoe.ac.in',
    'password': 'password123'
})
print("Login status:", status, body.get("message"))
token = body['data']['access_token']
user = body['data']['user']
print("User:", user['full_name'], "| Email:", user['email'], "| Role:", user['role'])
print("Faculty Profile:", user.get('faculty_profile'))

print("\n=== 2. Testing Faculty Dashboard API ===")
status, dash = get_json('/faculty/dashboard', token)
print("Dashboard Stats:", dash['data']['stats'])

print("\n=== 3. Testing Faculty Personal Timetable API ===")
status, tt = get_json('/faculty/timetable', token)
slots = tt['data']['timetable']
print(f"Total personal timetable slots for Dr. Pramod Ganjewar: {len(slots)}")
for item in slots:
    print(f"  {item['day_of_week']} {item['start_time']}-{item['end_time']}: {item['subject_name']} ({item['room_number']})")

print("\n=== 4. Testing Login for Mr. Amitkumar A. Shinde (Class Coordinator) ===")
status, body2 = post_json('/auth/login', {
    'email': 'amitkumarshinde@mitaoe.ac.in',
    'password': 'password123'
})
print("Login status:", status, body2.get("message"))
user2 = body2['data']['user']
print("User:", user2['full_name'], "| Email:", user2['email'], "| Designation:", user2['faculty_profile']['designation'])
print("\n=== All verification passed successfully! ===")
