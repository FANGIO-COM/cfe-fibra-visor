Backend – Visor de Fibra RA

Este backend expone una API REST en Python + FastAPI que sirve los datos de la red de fibra y sus puntos asociados (HIT y SITIOS), junto con métricas (km totales, avance, etc.) para que el frontend (React + React-Leaflet) construya el visor.

1. ¿Qué resuelve este backend?

Antes, el visor se generaba con un solo HTML gigante desde un script de Python (Folium).
Eso mezclaba en un mismo archivo:

Datos (shapefiles).

Cálculos (km, estados, KPIs).

Interfaz (mapa, estilos, filtros, medición).

El objetivo del backend es separar la lógica de datos de la interfaz:

Python se queda con:

Cargar shapefiles / ZIP.

Calcular longitudes en km y KPIs.

Exponer la info vía API (JSON/GeoJSON).

React (frontend) se encargará después de:

Pintar el mapa.

Mostrar KPIs, filtros y herramientas.

2. Estructura del backend
backend/
  app/
    __init__.py
    config.py        # Rutas de datos y constantes
    data_loader.py   # Carga y preparación de datos (fibra, HIT, SITIO)
    kpi.py           # Cálculo de indicadores (km, % avance, etc.)
    main.py          # Definición de FastAPI y endpoints
  data/
    RA - RUTAS RENAyA.shp   # Shapefile de la red de fibra
    RA - RUTAS RENAyA.*     # Archivos asociados al shapefile
    RENAyA_R4.zip           # ZIP con capas de puntos HIT y SITIO
  requirements.txt

3. Flujo general de datos
3.1. Fuentes

Fibra: data/RA - RUTAS RENAyA.shp

Puntos (ZIP): data/RENAyA_R4.zip

Capa HIT.shp

Capa SITIO.shp

3.2. Proceso principal (load_base_data())

En app/data_loader.py:

Leer shapefile de fibra

Si no hay CRS, se asume WGS84 (EPSG:4326).

Detectar columnas de interés
Por nombre aproximado (para soportar cambios de esquema):

estado (estado del tramo: construido / planeado / etc.)

tec (tecnología)

zona

id (identificador de tramo)

origen (HIT / nodo origen)

Normalizar atributos

estado se normaliza a valores como construido, planeado (también se contempla en_obra).

Se copian tec, zona, id, origen desde las columnas detectadas.

Se agrega dataset = "RA - RUTAS RENAyA".

Calcular longitud de cada tramo en km (long_km)

Función: km_lengths(gdf: GeoDataFrame) -> Series.

Soporta LineString y MultiLineString con coordenadas 2D, 3D o 4D (x, y, z, m).

Identifica si las coordenadas parecen estar en grados (lon/lat) o en unidades métricas:

Si parecen grados → usa pyproj.Geod (elipsoide WGS84) y suma distancias geodésicas vértice a vértice.

Si no → asume unidades métricas y usa distancia euclidiana.

Devuelve km con 3 decimales.

Cargar HIT y SITIO

Descomprime RENAyA_R4.zip.

Carga HIT.shp y SITIO.shp si existen.

Reproyecta a WGS84.

Resultado de load_base_data():

gdf_fibra → red de fibra con atributos (estado, tec, zona, id, origen, long_km, dataset).

gdf_hit → puntos HIT (o None si no existieran).

gdf_sitio → puntos SITIO (o None).

4. Cálculo de KPIs

Archivo: app/kpi.py.

A partir de gdf_fibra, gdf_hit y gdf_sitio se calculan:

total_km
Suma de long_km para todos los tramos.

km_construido
Suma de long_km para tramos con estado == "construido".

porcentaje_construido
km_construido / total_km * 100 (redondeado).

hits
Número de registros en la capa HIT.

sitios
Número de registros en la capa SITIO.

detalle_por_estado
Lista con km por estado. Ejemplo real:

{
  "total_km": 5485.329,
  "km_construido": 4816.684,
  "porcentaje_construido": 88,
  "hits": 34,
  "sitios": 237,
  "detalle_por_estado": [
    { "estado": "construido", "km": 4816.684, "unidad": "km" },
    { "estado": "planeado",   "km":  668.645, "unidad": "km" }
  ]
}

5. API – Endpoints actuales

Archivo: app/main.py
Framework: FastAPI.

Nota: se usa un @lru_cache(maxsize=1) en get_data() para que los shapefiles se carguen sólo una vez y se reutilicen en todas las llamadas.

5.1. GET /health

Descripción: Verifica que el servicio está arriba.

Respuesta:

{ "status": "ok" }

5.2. GET /api/fibra

Descripción: Devuelve la red de fibra en GeoJSON.

Uso: El frontend lo usa para pintar las líneas.

Propiedades principales de cada feature:

estado

tec

zona

id

origen

long_km

dataset

5.3. GET /api/hits

Descripción: Devuelve los puntos HIT en GeoJSON.

Uso:

Mostrar nodos de origen.

Servir como puntos de inicio para la herramienta de medición.

5.4. GET /api/sitios

Descripción: Devuelve los sitios en GeoJSON.

Uso:

Mostrar sitios intermedios/finales.

Servir como puntos para medir tramos HIT → División → Final.

5.5. GET /api/kpis

Descripción: Devuelve los indicadores globales.

Ejemplo de respuesta:

{
  "total_km": 5485.329,
  "km_construido": 4816.684,
  "porcentaje_construido": 88,
  "hits": 34,
  "sitios": 237,
  "detalle_por_estado": [
    { "estado": "construido", "km": 4816.684, "unidad": "km" },
    { "estado": "planeado",   "km":  668.645, "unidad": "km" }
  ]
}


Uso:

El frontend usa esto para tarjetas/resúmenes de avance.

También se puede usar para reportes futuros.

6. Mecanismo de carga y rendimiento

Para evitar recargar los shapefiles en cada request, se usa un cache simple en memoria:

En main.py, la función get_data() está decorada con:

@lru_cache(maxsize=1)
def get_data():
    return load_base_data()


La primera vez que se llama, ejecuta load_base_data() (carga archivos, calcula longitudes, etc.).

En llamadas posteriores reutiliza el resultado ya cargado.

Opcionalmente se puede añadir:

@app.on_event("startup")
def preload_data():
    get_data()


para forzar la carga de datos al arrancar el servidor en lugar de esperar a la primera llamada.

7. Cómo ejecutar el backend
7.1. Instalar dependencias

Desde la carpeta backend/:

pip install -r requirements.txt

7.2. Ejecutar el servidor de desarrollo
uvicorn app.main:app --reload

7.3. Endpoints útiles para probar

http://127.0.0.1:8000/health

http://127.0.0.1:8000/api/fibra

http://127.0.0.1:8000/api/hits

http://127.0.0.1:8000/api/sitios

http://127.0.0.1:8000/api/kpis

Documentación automática (Swagger UI):

http://127.0.0.1:8000/docs

8. Notas y pendientes

La lógica de UI (mapa, estilos, filtros, medición HIT → División → Final) no está en el backend, estará en el frontend React.

CORS está actualmente abierto (allow_origins=["*"]); para producción se recomienda restringirlo, por ejemplo:

allow_origins = [
    "http://localhost:5173",       # desarrollo frontend
    "https://tu-dominio.com"       # producción
]


Próximo paso natural en el backend:

Endpoint de opciones/metadatos para filtros:

GET /api/opciones


Ejemplo de respuesta esperada:

{
  "estados": ["construido", "planeado"],
  "tecnologias": ["FO", "RADIO", "..."],
  "zonas": ["Occidente", "Pacífico", "..."]
}


A futuro se puede:

Conectar a una BD (PostgreSQL/PostGIS).

Implementar filtrado desde el backend, por ejemplo:

GET /api/fibra?estado=construido&tec=FO&zona=Occidente


y variantes similares para /api/kpis.