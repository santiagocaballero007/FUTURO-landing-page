"""Arma landing/dist/: index.html como documento completo + assets.

index.html se escribe sin <!doctype>/<head>/<body> porque así lo pide Artifact (claude.ai).
Para cualquier otro hosting (Netlify Drop, Vercel, GitHub Pages) se sube la carpeta dist/.
Uso: python3 landing/build.py
"""
import pathlib
import shutil
import sys

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
# Lo que va antes del primer </style> (title, meta, fuentes y CSS) sube al <head>.
cut = src.index("</style>") + len("</style>")
head_part, body_part = src[:cut], src[cut:]
if DIST.exists():
    shutil.rmtree(DIST)
shutil.copytree(ROOT / "assets", DIST / "assets")
shutil.copy(ROOT / "404.html", DIST / "404.html")  # GitHub Pages la sirve en cualquier ruta que no exista
# Páginas aparte (documentos completos): canje de la tarjeta Fundador, lista de espera y voces del stand.
for sub in ("canje", "pronto", "voces"):
    if (ROOT / sub).is_dir():
        shutil.copytree(ROOT / sub, DIST / sub)
# Fuera de Artifact, las fuentes cargan sin bloquear el primer render (mejor FCP).
font = head_part[head_part.index('<link rel="stylesheet"'):]
font = font[: font.index(">") + 1]
if "--blocking-fonts" not in sys.argv:  # capturas: fuentes bloqueantes
    head_part = head_part.replace(font, font[:-1] + " media=\"print\" onload=\"this.media='all'\">\n<noscript>" + font + "</noscript>")
html = HEAD.replace("</head>", head_part + "\n</head>") + body_part + "\n</body>\n</html>\n"
(DIST / "index.html").write_text(html, encoding="utf-8")
print("dist listo:", DIST)
