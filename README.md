# Cada Día

Aplicación estática de hábitos, sin compilación ni servidor de datos. Requiere un navegador moderno con soporte de `dialog` y `localStorage`.

## Ejecutar

Desde la carpeta del proyecto:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Abre el puerto 8765 en tu navegador. Las fuentes de Google son opcionales: hay fuentes de sistema como alternativa.

## Datos y rachas

- Los datos se guardan únicamente en el navegador. Exporta copias JSON para conservarlos o transferirlos. Importar reemplaza los datos actuales tras confirmación.
- Una copia dañada bloquea las escrituras; Exportar permite descargar su contenido original antes de importar una copia válida.
- Los hábitos tienen fecha de creación y días programados. Los descansos no cuentan como días cumplidos ni rompen la racha. El día actual pendiente no rompe todavía la racha.
- Archivar entra en vigor mañana y conserva las obligaciones históricas y el día actual. Puedes deshacer el archivado antes de que entre en vigor.
- Editar permite cambiar nombre y símbolo. Para cambiar la frecuencia, archiva el hábito y crea uno nuevo: así conservas el calendario histórico.
- La migración de datos antiguos usa la primera fecha completada como creación, o la fecha actual si no hay registros. La versión anterior no guardaba la fecha real de creación y no es posible reconstruirla con exactitud.
- No se permite completar fechas futuras. Las rachas se calculan respecto al día actual; el resumen y la lista corresponden al día seleccionado.

## Pruebas

Con Node.js:

```sh
node tests/habits-core.test.js
```

Pruebas funcionales: con el servidor anterior activo, Playwright disponible y Chromium instalado:

```sh
node tests/browser.cjs
```

Puedes indicar `BASE_URL` y `CHROMIUM_PATH` para otro puerto o ejecutable. Las pruebas usan un contexto de navegador aislado y no modifican tus datos personales.
