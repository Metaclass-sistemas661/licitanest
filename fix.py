import re

filepath = r'c:\Users\andre\Desktop\LICITANEST\landing\index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'\s*<!--.\s*Simulação de icones auxiliares.*?</a>'
match = re.search(pattern, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), '')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Removed arrow link completely')
else:
    print('Not found')
