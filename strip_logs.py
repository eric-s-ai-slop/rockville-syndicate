import os

def strip_logs(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = [line for line in lines if 'console.log' not in line]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
        
    print(f"Stripped logs from {filepath}. Reduced from {len(lines)} to {len(new_lines)} lines.")

strip_logs('battleiq/battle.js')
strip_logs('public/minigames/battleiq/battle.js')
