"""Arma landing/dist/: index.html como documento completo + assets.

index.html se escribe sin <!doctype>/<head>/<body> porque así lo pide Artifact (claude.ai).
Para cualquier otro hosting (Netlify Drop, Vercel, GitHub Pages) se sube la carpeta dist/.
Uso: python3 landing/build.py
"""
import pathlib
import shutil

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"

HEAD = """<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>
</head>
<body>
"""

src = (ROOT / "index.html").read_text(encoding="utf-8")
if DIST.exists():
    shutil.rmtree(DIST)
shutil.copytree(ROOT / "assets", DIST / "assets")
(DIST / "index.html").write_text(HEAD + src + "\n</body>\n</html>\n", encoding="utf-8")
print("dist listo:", DIST)
