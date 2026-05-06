import re
content = open('server/scripts/fill_pdf_expert.py', 'r', encoding='utf-8').read()
fonts = re.findall(r'fontname=\"([^\"]+)\"', content)
print(f'Fonts found: {set(fonts)}')
