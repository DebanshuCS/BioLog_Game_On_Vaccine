"""
package_demo.py — Packager script for ViroQuest Open Day Demo
Creates a clean, portable ZIP file of ViroQuest ready for distribution to any laptop or USB drive.
"""

import os
import zipfile
from datetime import datetime

IGNORE_DIRS = {'.git', '.gemini', '__pycache__', 'node_modules', '.vscode'}
IGNORE_EXTS = {'.zip', '.tmp'}

def make_zip():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"ViroQuest_OpenDay_Demo_{timestamp}.zip"
    zip_path = os.path.join(base_dir, zip_filename)

    print(f"📦 Packaging ViroQuest into: {zip_filename}...")
    file_count = 0

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                if any(file.endswith(ext) for ext in IGNORE_EXTS):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                zipf.write(full_path, rel_path)
                file_count += 1

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✅ Success! Packed {file_count} files ({size_mb:.2f} MB).")
    print(f"📁 Distribution file ready: {zip_path}")

if __name__ == '__main__':
    make_zip()
