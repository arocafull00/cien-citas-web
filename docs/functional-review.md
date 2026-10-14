# Revisión de 100 Citas web

Referencia: código actual de `D:\cien-citas-app`. Proyecto conservado: `cien-citas-web`.

## Funciones presentes

- Bienvenida, Google/Clerk, nombre y avatar.
- Crear pareja, compartir/copiar código, unirse, espera y conexión.
- Catálogo, búsquedas, filtros, progreso, creación y borrado de citas propias.
- Personalización y restauración del catálogo.
- Completar/desmarcar citas; guardar fecha, notas, lugar y fotos; editar recuerdos.
- Galería, visor de fotos, perfil, estadísticas y logros.
- Desvincular pareja, cerrar sesión y celebración de la cita 100.
- PWA instalable, recuerdos y fotos consultadas sin conexión, limpieza de caché y aislamiento por usuario y pareja.

## Diferencias corregidas

- Lista de dos columnas virtualizada online y offline, búsqueda diferida, índice de textos y tarjetas memorizadas.
- Navegación de la lista sin recargar toda la página; búsqueda y filtro conservados al volver.
- Actualización mediante gesto y botón existente.
- Cinco fondos WebP de 768 px: 650.338 bytes frente a 2.322.893 bytes de los PNG originales, 72 % menos.
- Fotos de lista con miniaturas privadas de 512 px y caché separada. Si offline solo está disponible la miniatura, el detalle puede utilizarla.
- Máximo de diez fotos, fecha sin futuro y lugar escogido con coordenadas, como en Expo.
- Se conserva la hora de la fecha al editar y se evita duplicar las fotos ya subidas en la vista de reintentos.
- Categoría y dificultad requieren selección explícita al crear una cita.
- Crear pareja no permite entrar al catálogo mientras falta la otra persona. La marca de configuración del perfil se conserva durante esa espera.
- Celebración con nombres, compartir y acceso a las citas hechas.
- Iconos de los logros, avatar de la pareja y contador real de categorías en el perfil. Las estadísticas incluyen citas propias y categorías personalizadas.
- Botones, campos, áreas de texto, badges, progreso y confirmaciones con shadcn; Tailwind también se compila para el documento offline.

- Subidas validadas en el servidor: tipo y tamaño firmados en la URL de R2 y máximo de diez fotos por cita.
- Fotos redimensionadas a 2048 px en el navegador antes de subirlas; las miniaturas se generan una vez y se guardan en R2 junto al original (`<clave>.thumb.webp`).
- Al borrar fotos o citas se borra primero la base de datos y después R2, en segundo plano. Se elimina el avatar anterior al sustituirlo.
- Imágenes de bienvenida en WebP y fuentes en WOFF2.

No se incluyen notificaciones. Las migraciones y la base de datos compartida no se han modificado.

## Límites de verificación

Se revisan formato, tipos, lint, tests unitarios (Vitest), tests de navegador (Playwright) y compilación. El login real con Google, las subidas a R2, la recepción de datos desde otra cuenta, la PWA instalada en el dispositivo y la fluidez/FPS requieren comprobación real; la compilación no los demuestra.
