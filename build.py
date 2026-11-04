"""Slår sammen js-modulene til js/bundle.js, så appen også virker når index.html åpnes
direkte fra disken (file://), der nettlesere blokkerer ES-moduler.

Kjør etter endringer i js/:  python build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
ORDER = ["data.js", "calc.js", "store.js", "app.js"]

parts = []
for name in ORDER:
    src = (ROOT / "js" / name).read_text(encoding="utf-8")
    src = re.sub(r"^import .*?;\s*$", "", src, flags=re.M | re.S)
    src = re.sub(r"^export (const|function|async function|let|class) ", r"\1 ", src, flags=re.M)
    parts.append(f"// ---- {name} ----\n{src.strip()}\n")

out = "// Generert av build.py – ikke rediger direkte.\n(() => {\n'use strict';\n" + "\n".join(parts) + "})();\n"
(ROOT / "js" / "bundle.js").write_text(out, encoding="utf-8")
print(f"js/bundle.js skrevet ({len(out)} tegn)")
