# Contribuir al Proyecto Visor Fibra CFE

¡Bienvenido! 🎉 Gracias por tu interés en contribuir al **visor de fibra CFE**.  
Este repositorio contiene:

- `backend/` → API en **FastAPI** (Python) para servir fibra, puntos y KPIs.
- `frontend/` → App **React + Vite + Leaflet + Tailwind** para el visor web.

Para mantener un flujo de trabajo organizado, seguimos una estructura de ramas clara y algunas reglas básicas de commits.

---

## 📁 Estructura general del repositorio

- `backend/`
  - API FastAPI
  - Carga de shapefiles / GeoData
  - Cálculo de longitudes (km), estados, KPIs
- `frontend/`
  - Visor de mapa (React + Leaflet)
  - Capas de fibra, HIT, Sitios
  - Paneles de KPIs, filtros y medición de tramos
- `docs/` *(opcional)*  
  - Diagramas, decisiones de diseño, notas funcionales

Cuando abras issues o hagas PRs, intenta indicar si tu cambio afecta a **backend**, **frontend** o **ambos**.

---

## 🌿 Estructura de ramas

Usamos un esquema tipo *Gitflow* simplificado:

### 🔵 `main` (Producción)

- Rama **estable** del proyecto.
- Debe reflejar el estado listo para desplegar (por ejemplo, a AWS Lightsail).
- No se hacen commits directos aquí.
- Se actualiza mediante *pull requests* desde `develop` o `hotfix/*`.

### 🟢 `develop` (Desarrollo)

- Rama donde se integran los cambios en curso (backend + frontend).
- Contiene la versión “en progreso” del visor.
- Antes de liberar a producción, se valida lo que hay en `develop`.

### 🟡 `feature/*` (Nuevas funcionalidades)

- Se crean desde `develop` para desarrollar cambios concretos.
- Pueden ser de backend, frontend o ambos.
- Ejemplos:
  - `feature/backend-kpis-fibra`
  - `feature/frontend-mapa-medicion`
  - `feature/frontend-filtros-estado-zona`
  - `feature/backend-carga-nuevos-shapefiles`
- Cuando se termina la funcionalidad y se revisa, se fusiona de vuelta en `develop`.

### 🟠 `hotfix/*` (Correcciones urgentes en producción)

- Se crean desde `main` para corregir errores críticos que afectan el uso del visor en producción.
- Ejemplos:
  - `hotfix/backend-fix-km-totales`
  - `hotfix/frontend-fix-mapa-no-carga`
- Después de la corrección:
  - Se fusionan en `main` (para arreglar producción).
  - Se fusionan también en `develop` (para mantener coherencia).

### 🔴 `release/*` (Preparación de versión)

- Se crean desde `develop` al preparar un nuevo despliegue estable.
- Aquí se hacen pruebas finales, se afinan textos, estilos, etc.
- Ejemplos:
  - `release/v0.1.0-mvp`
  - `release/v1.0.0`
- Cuando la versión está lista:
  - Se fusiona en `main`.
  - Se fusiona también en `develop` (por si se hicieron ajustes menores durante la release).

---

## 🏷️ Nombres de ramas

Formato recomendado:

| Tipo de rama        | Prefijo    | Ejemplos                                     |
|---------------------|-----------|----------------------------------------------|
| Nueva funcionalidad | `feature/`| `feature/frontend-leyenda-estado`           |
| Corrección urgente  | `hotfix/` | `hotfix/backend-fix-long_km-na`             |
| Preparación release | `release/`| `release/v0.2.0-medicion-hit-division`      |

Reglas:

- Minúsculas.
- Palabras separadas por guiones `-`.
- Incluye si es `frontend`, `backend` o ambos cuando sea útil.

---

## 🚀 Flujo de trabajo básico

1. **Crear rama para una nueva funcionalidad** (desde `develop`):

   ```bash
   git checkout develop
   git pull
   git checkout -b feature/nombre-de-la-funcionalidad
   ```

2. **Desarrollar y hacer commits**:

   ```bash
   git add .
   git commit -m "feat(frontend): añadir panel de medición de fibra"
   ```

3. **Actualizar tu rama con cambios recientes de `develop`** (si hace falta):

   ```bash
   git checkout develop
   git pull
   git checkout feature/nombre-de-la-funcionalidad
   git merge develop
   # o rebase si el equipo lo prefiere
   ```

4. **Abrir Pull Request hacia `develop`**:

   En la descripción del PR, indica:

   - Qué parte afecta:
     - Backend (FastAPI, `data_loader`, endpoints `/api/fibra`, `/api/kpis`, etc.)
     - Frontend (React, Leaflet, paneles, hooks)
   - Si hay cambios visuales, agrega capturas de pantalla.
   - Cualquier detalle relevante de diseño o impacto en el usuario.

5. **Preparar una release**:

   ```bash
   git checkout develop
   git checkout -b release/v0.1.0
   # pruebas, pequeños ajustes, etc.
   git checkout main
   git merge release/v0.1.0
   git tag v0.1.0
   git checkout develop
   git merge release/v0.1.0
   ```

6. **Crear un hotfix si hay bug en producción**:

   ```bash
   git checkout main
   git checkout -b hotfix/fix-descripcion-del-bug
   # corregir
   git commit -m "fix(backend): corregir cálculo de km totales"
   git checkout main
   git merge hotfix/fix-descripcion-del-bug
   git checkout develop
   git merge hotfix/fix-descripcion-del-bug
   ```

---

## 🧪 Recomendaciones específicas del proyecto

### Backend (FastAPI + GeoPandas)

Antes de hacer commit:

- Verifica que los endpoints principales respondan:

  - `GET /api/fibra`
  - `GET /api/kpis`

- Si tocas el cálculo de longitudes (`long_km`) o estados:

  - Asegúrate de no romper el formato esperado por el frontend (propiedades como `estado`, `tec`, `zona`, `long_km`, `dataset`).

- Mantén la lógica de lectura de shapefiles y la normalización de columnas en un solo lugar (`data_loader.py`).

### Frontend (React + Leaflet + Tailwind)

Antes de hacer commit:

- Comprueba que el mapa carga:

  - Capa de fibra RA.
  - Capas de HIT y Sitios si están activas.

- Si cambias paneles (KPIs, filtros, medición, leyenda):

  - Verifica que los nombres de propiedades (`estado`, `tec`, `zona`, `long_km`, etc.) sigan alineados con la API.

- Evita meter secretos o URLs sensibles en el código:

  - Usa variables de entorno donde aplique.

---

## 📝 Convención de mensajes de commit

Formato:

```text
<tipo>(<área>): <descripción breve>

<Descripción opcional más detallada>
```

### Ejemplos

```text
feat(frontend): agregar panel de filtros por estado y zona

Ahora el usuario puede filtrar la fibra por estado (construido/planeado) y zona.
```

```text
fix(backend): corregir cálculo de long_km con geometrías 3D

Se ajusta la función km_lengths para ignorar Z/M y usar cálculo geodésico WGS84.
```

### Tipos recomendados

| Tipo       | Uso                                                |
|------------|----------------------------------------------------|
| `feat`     | Nueva funcionalidad                                |
| `fix`      | Corrección de errores                              |
| `chore`    | Tareas de mantenimiento (configs, etc.)            |
| `docs`     | Cambios en documentación                           |
| `refactor` | Reestructurar código sin cambiar comportamiento    |
| `test`     | Añadir o ajustar pruebas                           |
| `style`    | Formato (espaciado, comillas, etc.)                |
| `perf`     | Mejoras de rendimiento                             |

---

## 📌 Reglas generales

- Crea una rama por cada cambio o conjunto pequeño de cambios.  
- Haz commits claros y frecuentes, en lugar de uno enorme al final.  
- No hagas commits directos en `main`.  
- Mantén la compatibilidad entre backend y frontend (contratos de la API).  
- Documenta cambios importantes en comportamiento o endpoints.  
