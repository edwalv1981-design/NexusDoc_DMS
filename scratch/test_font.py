import fitz
try:
    print(fitz.get_text_length('test', fontname='helv', fontsize=10))
    print('OK helv')
except Exception as e:
    print(f'FAIL helv: {e}')

try:
    print(fitz.get_text_length('test', fontname='Helvetica', fontsize=10))
    print('OK Helvetica')
except Exception as e:
    print(f'FAIL Helvetica: {e}')
