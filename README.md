# Landing de FUTURO

Publicada en https://claude.ai/artifact/PPYXqdhuJQp2B1w6MK1DVV

## Cómo editarla
- **Textos:** todo está en `index.html`. Busca la frase que quieras cambiar y edítala.
- **Colores y tipos:** están en el bloque `:root` al inicio del `<style>`. El ADN manda: un solo acento y el amarillo solo en subrayados.
- **Con Claude Code:** abre esta carpeta y pide el cambio ("cambia la pregunta 2 del FAQ por…"). Para que se actualice el mismo link, pide que lo republique como Artifact.

## Verla en tu compu
```bash
python3 landing/build.py
```
```bash
npx -y http-server@14.1.1 landing/dist -p 4322 -c-1
```
Abre http://localhost:4322. Este servidor soporta saltos dentro del video; `python -m http.server` no.

## Publicar en otro hosting
`python3 landing/build.py` arma `landing/dist/` como documento completo (`<head>`, fuentes asíncronas). Arrastra esa carpeta a https://app.netlify.com/drop, o súbela a Vercel o GitHub Pages. Con dominio propio, cambia `og:image` a una URL absoluta.

## Archivos
- `index.html`: la página. Va sin `<!doctype>`, `<head>` ni `<body>` porque así lo pide Artifact; `build.py` los agrega para `dist/`.
- `assets/`: hero.mp4 (4 clips de 3 s), promo.mp4 y promo.webp, fotos de universidades, voz-2045.mp3 y og.jpg.
- `og.html`: fuente de la imagen de portada `assets/og.jpg`. Para regenerarla, haz una captura de 1200×630 con Chrome headless.
- Créditos: videos de Pexels/Mixkit; fotos de Wikimedia Commons (Nacaru CC BY-SA 4.0, Dzo22 CC BY 4.0, Carlos Valenzuela CC BY-SA 4.0); audio generado con ElevenLabs.
