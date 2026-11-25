# Clima de Ruta

App web instalable (PWA) en español con el clima en vivo de **North Brunswick, NJ** y **Marlboro, NJ**.

- Condiciones actuales, pronóstico por hora de hoy y pronóstico diario de 16 días (°F y mph).
- Tendencia de los días 17 a 45 con el modelo extendido ECMWF EC46 (promedio de 51 escenarios y % de escenarios con precipitación). Es menos preciso que el pronóstico normal.
- Datos en vivo de [Open-Meteo](https://open-meteo.com/) (sin clave de API): API de pronóstico y API estacional.
- Funciona sin conexión mostrando la última respuesta real recibida, con su hora.

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Abre la URL publicada en el celular y usa **Agregar a pantalla de inicio**
   (Safari: botón Compartir; Chrome: menú ⋮ → *Instalar app*).

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | La app |
| `manifest.json` | Datos para instalarla |
| `sw.js` | Service worker (caché y modo sin conexión) |
| `icon.svg`, `icon-*.png` | Ícono propio |
