# Frame 🎬

> **Tu colección de cine personal, reinventada.**

Frame es una **Progressive Web App (PWA)** diseñada para los amantes del cine. Ofrece una experiencia visual inmersiva ("Cinematic Dark") para descubrir, buscar y organizar películas. Construida con tecnología moderna, Frame se siente como una aplicación nativa en tu dispositivo móvil.

![Frame Banner](https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop)

## ✨ Características Principales

-   **🎨 Diseño "Cinematic Dark" Premium**: Una interfaz oscura, elegante y minimalista con efectos de glassmorphism y micro-interacciones fluidas.
-   **📱 PWA Nativa**: Instálala en tu iPhone o Android. Funciona a pantalla completa y offline.
-   **🚀 Discovery Inteligente**:
    -   **Categorías Curadas**: Desde "Ganadoras del Oscar" y "Cine Argentino" hasta "Joyas Ocultas" y "Terror Recomendado".
    -   **Modo Sorpresa (🎲)**: ¿No sabes qué ver? Deja que Frame elija por ti con un solo toque.
-   **🔍 Búsqueda Global**: Encuentra cualquier película instantáneamente gracias a la integración con TMDB.
-   **⚡ Alto Rendimiento**: Optimizada con Vite y React para cargas instantáneas y transiciones suaves.

## 🛠️ Stack Tecnológico

El proyecto utiliza un stack moderno y potente:

-   **Core**: [React 18](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/) (Rápido como el rayo)
-   **Estilos**: [Tailwind CSS](https://tailwindcss.com/) + Animaciones custom
-   **Iconos**: [Lucide React](https://lucide.dev/) & Heroicons
-   **Datos**: [The Movie Database (TMDB) API](https://www.themoviedb.org/)
-   **PWA**: Vite PWA Plugin (Service Workers, Manifest, Cache Strategy)
-   **Routing**: React Router DOM 6

## 🚀 Cómo Empezar

Sigue estos pasos para correr el proyecto en tu máquina local:

### 1. Clonar y Preparar
```bash
# Instalar dependencias
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (puedes copiar `.env.example` si existe) y agrega tu API Key de TMDB:

```bash
VITE_TMDB_API_KEY=tu_api_key_de_tmdb_aqui
```
> 💡 *Puedes conseguir una API Key gratis registrándote en [TMDB](https://www.themoviedb.org/documentation/api).*

### 3. Correr en Desarrollo
```bash
npm run dev
```
La app estará disponible en `http://localhost:5173`.

### 4. Construir para Producción
Para probar la experiencia PWA completa (Service Workers, instalación):

```bash
npm run build
npm run preview
```

## 📱 Instalación en Móvil (PWA)

1.  Abre la aplicación en Chrome (Android) o Safari (iOS).
2.  **Android**: Toca en "Agregar a la pantalla de inicio" o en el banner de instalación si aparece.
3.  **iOS**: Toca el botón "Compartir" (Share) y selecciona "Agregar a Inicio" (Add to Home Screen).
4.  ¡Listo! Frame aparecerá como una app nativa en tu menú.

## 🤝 Contribución

¡Las pull requests son bienvenidas! Si tienes una idea para una nueva "Colección" o una mejora visual, no dudes en abrir un issue.

---

<p align="center">
  Hecho con ❤️ por Lihue Napoli
</p>
