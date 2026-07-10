import re

paths = [
    'crates/shared/src/lib.rs',
    'crates/daemon/src/routes/auth.rs'
]

def repl(m):
    return f'#[sqlx(rename = "{m.group(1).lower()}")]'

for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'#\[sqlx\(rename\s*=\s*"([^"]+)"\)\]', repl, content)
    
    with open(p, 'w', encoding='utf-8') as f:
        f.write(new_content)
print("Done!")
