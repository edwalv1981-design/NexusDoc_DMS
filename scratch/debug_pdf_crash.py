import json
import subprocess
import os

dummy_data = {
    "corpNameSA": "TEST COMPANY SA",
    "capitalSocial": "10000",
    "directors": [
        {"firstName": "John", "lastName": "Doe", "passport": "123", "nationality": "US", "email": "j@d.com", "address": "Addr 1"},
        {"firstName": "Jane", "lastName": "Doe", "passport": "456", "nationality": "US", "email": "j2@d.com", "address": "Addr 2"},
        {"firstName": "Jim", "lastName": "Doe", "passport": "789", "nationality": "US", "email": "j3@d.com", "address": "Addr 3"}
    ],
    "shareholders": [],
    "dignitaries": {}
}

data_json = json.dumps(dummy_data)
# template_name, output_path, data_json, logo_path (opcional)
cmd = ["python", "server/scripts/fill_pdf_expert.py", "corporacion", "scratch/test_out.pdf", data_json]

try:
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    print("STDOUT:", result.stdout)
except subprocess.CalledProcessError as e:
    print("ERROR CODE:", e.returncode)
    print("STDOUT:", e.stdout)
    print("STDERR:", e.stderr)
