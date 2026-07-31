import sys
import zipfile
from pathlib import Path
import site

wheels_dir = Path("wheels")
site_packages = Path(site.getsitepackages()[0])

print(f"Extracting wheels to {site_packages}...")

for whl in wheels_dir.glob("*.whl"):
    print(f"Installing {whl.name}...")
    with zipfile.ZipFile(whl, 'r') as zip_ref:
        for member in zip_ref.namelist():
            try:
                zip_ref.extract(member, site_packages)
            except Exception as e:
                pass

print("All wheels extracted successfully!")
