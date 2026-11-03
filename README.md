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
- Editar permite cambiar nombre, símbolo y frecuencia. Los cambios de días entran en vigor mañana y se guarda cada calendario anterior para conservar el historial y las rachas.
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

## Historial y categorías

La pantalla principal ofrece tres vistas: tarjetas con un mapa anual desplazable, tabla de cinco días y calendario mensual. Las flechas recorren años, bloques de cinco días o meses según la vista. El selector de mes permite saltar directamente a un periodo y Hoy vuelve a la fecha actual. Cada casilla informa de su fecha y estado; las fechas futuras y los días sin programar están bloqueados.

Puedes crear categorías y asignarles símbolos o emojis desde «＋ Categorías» o desde el formulario del hábito. El selector permite editar el símbolo de una categoría existente para todos sus hábitos. También puedes elegir entre seis colores y personalizar la descripción. Los filtros por categoría, búsqueda e inclusión de archivados se combinan y afectan al historial. El registro diario y las estadísticas conservan el resumen global y están en su propio panel. La categoría y el color también se conservan en las copias JSON; los datos anteriores se migran sin perder el historial.

Pruebas de las nuevas vistas (mismos requisitos que la prueba funcional anterior):

```sh
node tests/history-browser.cjs
```
