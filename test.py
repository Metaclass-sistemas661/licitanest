with open(r'c:\Users\andre\Desktop\LICITANEST\landing\index.html', 'r', encoding='utf-8') as f:
    text = f.read()
import re
for m in re.finditer(r'<a.*login.*</a>', text):
    print(m.group(0))
