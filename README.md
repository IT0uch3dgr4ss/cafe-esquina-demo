# Café de la Esquina — Demo Web para Cafetería de Barrio

> **Demo funcional lista para deploy en Netlify/Vercel.** Código vanilla HTML/CSS/JS, cero dependencias, <50KB gzipped, panel admin autogestionable en localStorage.

## 🎯 Qué incluye

| Página | Descripción |
|--------|-------------|
| **Home** (`index.html`) | Hero con foto real, 3 pilares, carta destacada (scroll horizontal móvil), barra ubicación sticky, testimonio, footer completo |
| **Carta** (`carta.html`) | Filtros: búsqueda, categorías (chips sticky), alérgenos, dietas, favoritos · Vista grid/lista · Carrito sticky WhatsApp con mensaje pre-relleno |
| **Nosotros** (`nosotros.html`) | Historia, equipo (4 fichas), 6 valores, galería 6 fotos, CTA final |
| **Contacto** (`contacto.html`) | Info rápida + estado "Abierto ahora" dinámico, Google Maps embed, WhatsApp click-to-chat, formulario → WhatsApp, FAQ acordeón |

### Componentes transversales
- **Header sticky** con drawer móvil (logo, nav, CTA WhatsApp)
- **Location bar** móvil fixed bottom (3 iconos: Maps, Horario, WhatsApp) / desktop sidebar sticky
- **Footer** 4 columnas + schema.org LocalBusiness + OpenGraph + Twitter Cards
- **Panel Admin** (acceso: 5 clicks logo o `?admin=1`): edición inline precios/nombres, añadir/eliminar items, subir fotos base64, guardar/cargar JSON, exportar/importar backup. **Todo en localStorage, sin backend.**

---

## 🚀 Deploy en 30 segundos (Netlify)

### Opción A: Arrastrar carpeta (más rápido)
1. Entra en [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta **`cafe-esquina-demo`** completa
3. ¡Listo! Tu URL será algo como `https://random-name.netlify.app`

### Opción B: Git + Netlify (recomendado para producción)
```bash
# 1. Inicializa git en la carpeta
cd cafe-esquina-demo
git init
git add .
git commit -m "Initial commit: Café de la Esquina demo"

# 2. Crea repo en GitHub y pushea
gh repo create cafe-esquina-demo --public --source=. --push

# 3. En Netlify: "Add new site" → "Import from Git" → Selecciona tu repo
# Build command: (vacío)  |  Publish directory: .
# Deploy!
```

### Opción C: Vercel
```bash
npx vercel --prod
# O arrastra la carpeta en vercel.com/new
```

---

## 📁 Estructura del proyecto

```
cafe-esquina-demo/
├── index.html              # Home
├── carta.html              # Carta interactiva
├── nosotros.html           # Nosotros
├── contacto.html           # Contacto
├── 404.html                # Página 404 personalizada
├── _headers                # Headers Netlify (cache, seguridad, CSP)
├── _redirects              # URLs limpias (/carta en vez de /carta.html)
├── netlify.toml            # Config completa Netlify
├── README.md               # Este archivo
└── assets/
    ├── css/
    │   └── main.css        # Design tokens + todos los componentes (<50KB gz)
    ├── js/
    │   ├── main.js         # Header, drawer, filtros, carrito, location bar
    │   └── admin.js        # Panel admin (inline-edit, localStorage, backup)
    ├── data/
    │   └── menu.json       # Datos de la carta (categorías, items, settings)
    └── images/             # Coloca aquí tus .webp (ver sección imágenes)
```

---

## ⚙️ Panel Admin — Guía rápida

### Cómo abrirlo
1. **Método rápido:** Haz **5 clicks rápidos** en el logo (esquina superior izquierda)
2. **Método URL:** Añade `?admin=1` a cualquier URL: `https://tusitio.netlify.app/?admin=1`

### Qué puedes hacer
| Pestaña | Acciones |
|---------|----------|
| **Carta** | Editar nombre/precio inline (click → escribe → Enter), cambiar categoría, toggle disponible/popular, subir foto (base64 a localStorage), añadir/eliminar items |
| **Categorías** | CRUD: nombre, icono, orden, visible/oculto |
| **Ajustes** | WhatsApp, nombre negocio, dirección, horario semanal |
| **Herramientas** | Exportar backup JSON, importar backup, resetear a original |

### Flujo típico: "Cambiar precio del cortado en 3 segundos"
1. Abre panel admin (5 clicks logo)
2. Pestaña **Carta** → busca "Cortado"
3. Click en el precio `1.70€` → escribe `1.80` → **Enter**
4. Click **Guardar todo** (barra inferior) → ✅ Toast "Cambios guardados"
5. Cierra panel → la web ya muestra el nuevo precio

### Persistencia
- Todo se guarda en **localStorage** del navegador (`cafe-menu-data`, `cafe-categories-data`, `cafe-settings-data`)
- **No hay backend**. Si el usuario borra caché, vuelve al `menu.json` original
- Usa **Exportar backup** (botón Herramientas) para guardar un `.json` en tu ordenador
- Usa **Importar backup** para restaurar desde archivo

---

## 🖼️ Imágenes — WebP + LQIP

### Formato requerido
- **WebP** (recomendado) o JPG/PNG
- Tamaños sugeridos:
  - Hero: 1200w / 800w / 400w
  - Carta items: 600w / 400w / 300w
  - Galería/Equipo: 800w / 600w
- Compresión: 80% calidad, progresivo

### Placeholder LQIP (blur)
Cada `<img>` lleva `data-lqip="data:image/webp;base64,..."` — un placeholder 20px blur de ~200 bytes que se muestra mientras carga la imagen real.

**Generar LQIP rápido:**
```bash
# Con ImageMagick
magick input.jpg -resize 20x20 -blur 0x8 -quality 10 lqip.webp
# Luego: base64 -w 0 lqip.webp | sed 's/^/data:image\/webp;base64,/'
```

### Dónde colocar imágenes
```
/assets/images/
├── hero-interior.webp           # Hero Home
├── hero-about.webp              # Hero Nosotros
├── cafe-solo.webp               # Items carta (ver menu.json)
├── cortado.webp
├── ... (una por item)
├── team-maria.webp              # Equipo
├── team-carlos.webp
├── team-lucia.webp
├── team-david.webp
├── gallery-1.webp ... gallery-6.webp
├── avatar-testimonial.webp
├── og-home.webp                 # Open Graph 1200x630
├── og-carta.webp
├── og-nosotros.webp
├── og-contacto.webp
└── placeholder.webp             # Fallback genérico
```

> **Nota:** El `menu.json` ya incluye rutas `/assets/images/*.webp` y LQIPs base64 de ejemplo. Sustituye por tus fotos reales.

---

## ♿ Accesibilidad (WCAG AA)

- ✅ Contraste AA/AAA (tokens definidos en `design-tokens.css`)
- ✅ Focus visible siempre (`:focus-visible` + polyfill)
- ✅ ARIA labels, roles, `aria-expanded`, `aria-controls`, `aria-live`
- ✅ Touch targets ≥48px (botones, chips, tabs)
- ✅ `prefers-reduced-motion` desactiva animaciones >200ms
- ✅ `prefers-contrast: high` refuerza bordes
- ✅ Skip link primer elemento
- ✅ Semántica HTML5 (`<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`, `<article>`, `<section>`)
- ✅ Formularios con labels explícitos, `aria-describedby`, validación nativa

---

## ⚡ Performance

| Métrica | Objetivo | Estrategia |
|---------|----------|------------|
| **CSS+JS gzipped** | <50KB | Vanilla, sin frameworks, purge manual |
| **LCP** | <2.5s | Hero preload, WebP, LQIP, fonts `font-display: swap` |
| **INP** | <200ms | Event delegation, debounce 300ms, sin librerías pesadas |
| **CLS** | <0.1 | Aspect-ratio en imágenes, skeleton loaders, font-display |
| **TTFB** | <600ms | Netlify Edge CDN, headers cache |

### Optimizaciones incluidas
- Critical CSS inlineado en `<head>` (tokens + layout base)
- Fonts Google Fonts con `preload` + `font-display: swap`
- Imágenes `loading="lazy"` nativo + `width`/`height` explícitos
- `srcset`/`sizes` preparado (añade tus variantes en `<picture>`)
- Service Worker ready (añade `sw.js` si quieres offline)

---

## 🔧 Personalización rápida

### Colores y tipografía
Edita `assets/css/main.css` → sección `:root` (design tokens). O importa `design-tokens.css` si lo mantienes separado.

### Textos y copy
Todos los textos están en el HTML — búscalos y cámbialos. Tono de voz: *"Vecino de confianza, cercano, honesto"* (ver `design-spec.md`).

### Horario
En `assets/data/menu.json` → `settings.openingHours` y en `assets/js/main.js` → `locationBar.updateStatus()`.

### WhatsApp
Cambia `34600000000` por tu número real en:
- `menu.json` → `settings.whatsappNumber`
- Todos los `href="https://wa.me/34600000000..."` en HTML
- `main.js` → `openWhatsApp()`

### Google Maps
En `contacto.html` → `iframe src="https://www.google.com/maps/embed?pb=..."` — genera tu embed en [Google Maps → Compartir → Insertar mapa](https://maps.google.com).

---

## 📦 Scripts útiles (opcional)

```json
// package.json (crea uno si quieres)
{
  "scripts": {
    "dev": "npx serve . -p 8888",
    "build": "echo 'No build step needed'",
    "lint": "npx htmlhint *.html && npx stylelint assets/css/main.css",
    "test:a11y": "npx @axe-core/cli *.html",
    "compress": "npx imagemin assets/images/* --out-dir=assets/images"
  }
}
```

---

## 📄 Licencia y créditos

**Demo educativa/comercial** para el curso "Webs para locales de barrio en Canillejas".

- **Diseño y tokens:** `cafe-esquina-design-spec.md`, `design-tokens.css`
- **Fotografía:** Usa fotos reales del local (estilo documental, luz natural, tonos cálidos)
- **Iconos:** SVG inline (estilo Lucide, stroke 2px, redondeado)
- **Fuentes:** Fraunces (headings), DM Sans (body), JetBrains Mono (precios admin) — vía Google Fonts
- **Mapas:** Google Maps Embed (gratis, sin API key para uso básico)
- **Deploy:** Netlify / Vercel / Cloudflare Pages (gratis)

---

## 🆘 Soporte y dudas

¿Problemas con el deploy? ¿Quieres personalizar algo y no sabes cómo?

1. Revisa la consola del navegador (F12) por errores JS
2. Verifica que `assets/data/menu.json` se carga (Network tab)
3. El panel admin solo funciona en HTTPS o localhost
4. Para Netlify: revisa que `_headers`, `_redirects` y `netlify.toml` estén en la raíz del deploy

---

**¡Listo para servir!** ☕

*Saca el móvil, abre el enlace, cambia el precio del cortado. Tardas 3 segundos.*