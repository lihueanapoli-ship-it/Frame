# CineTrack 🎬

Web App Progresiva (PWA) para gestionar tus películas vistas y por ver.

## Tech Stack
- React + Vite
- TailwindCSS
- Lucide React
- TMDB API

## Configuración

1. **Instalar Dependencias**
   Asegúrate de tener Node.js instalado.
   ```bash
   npm install
   ```

2. **Configurar API Key**
   - Copia el archivo `.env.example` y renómbralo a `.env`.
   - Obtén tu API Key de [The Movie DB](https://www.themoviedb.org/documentation/api) y pégala en el archivo:
   ```
   VITE_TMDB_API_KEY=tu_api_key_aqui
   ```

3. **Correr Localmente**
   ```bash
   npm run dev
   ```

4. **Construir para Producción (PWA)**
   ```bash
   npm run build
   npm run preview
   ```

## Características PWA
- Totalmente instalable en móviles.
- Funciona offline (usa cache para assets).
- Diseño Mobile-First.
