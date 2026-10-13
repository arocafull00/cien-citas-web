# 100 Citas · Next.js PWA

Versión web móvil de la aplicación Expo de `D:\cien-citas-app`, en un proyecto independiente. Conserva los recursos gráficos, las tipografías, el catálogo y el modelo de datos de la app original. En pantallas grandes mantiene una columna móvil de hasta 480 px.

## Ejecutar

Requiere Node.js 20.9 o superior y pnpm 10.

```powershell
pnpm install
Copy-Item .env.example .env.local
# Completar .env.local con las credenciales del entorno deseado.
pnpm dev
```

La app abre en http://localhost:3002. El archivo `.env.local` de esta instalación ya está configurado y se excluye de Git.

Para comprobar la PWA y el acceso sin conexión, usar el servidor de producción; el service worker se desactiva en desarrollo:

```powershell
pnpm build
pnpm start
```

## Funciones

- Onboarding, acceso con Google mediante Clerk, nombre y avatar.
- Crear o conectar una pareja con código, listado, búsqueda, filtros y progreso.
- Crear citas propias, personalizar y restaurar las del catálogo.
- Completar citas con fecha, lugar, notas y fotos; reintentar fotos fallidas.
- Autocompletado y geocodificación inversa con Geoapify, GPS y selección en mapa.
- Perfil, logros, modo oscuro y gestión de la pareja.
- Instalación en Android y guía para añadir a la pantalla de inicio en iPhone.

Clerk, Neon y R2 utilizan las mismas cuentas y datos que Expo cuando se configuran con las mismas credenciales. Las modificaciones de citas, fotos y pareja se reflejan en ambas apps. No se ha ejecutado ninguna migración ni seed durante la implementación; `db/` y `drizzle/` conservan el esquema y el historial existentes.

## Sin conexión

Se guardan el último listado, los detalles consultados, el perfil y los logros en IndexedDB, separados por usuario y pareja. Las fotos se guardan al verlas mediante un proxy autenticado y una caché separada por sesión: hasta 100 imágenes durante 30 días. El navegador puede eliminar su almacenamiento.

El diario permite leer estos datos y navegar entre ellos sin conexión. Los recuerdos no consultados muestran un aviso. Las escrituras requieren internet; no hay cola de cambios. Cerrar sesión, cambiar de usuario o desvincular la pareja elimina la información local. Ajustes permite borrarla manualmente.

El service worker guarda el shell offline y los recursos estáticos. No almacena respuestas de APIs ni HTML de páginas autenticadas. Las notificaciones push y los recordatorios quedan fuera de esta versión.

`/offline` sirve un visor React de lectura con los mismos componentes del diario, compilado por `scripts/build-offline.mjs`. Al funcionar sin el router de Next ni Clerk, puede recargar detalles y navegar entre pantallas con la red desconectada. Sus archivos generados no se versionan; se crean al ejecutar `pnpm dev` o `pnpm build`.

## Variables

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` es la única credencial expuesta al navegador. `CLERK_SECRET_KEY`, `DATABASE_URL`, las variables `R2_*` y `GEOAPIFY_API_KEY` se usan en el servidor. La búsqueda de lugares pasa por `/api/places`; la clave de Geoapify no se incorpora al cliente.

## Vercel

1. Importar esta carpeta como proyecto Next.js. Instalación: `pnpm install`; compilación: `pnpm build`.
2. Configurar todas las variables de `.env.example` en el entorno correspondiente, sin subir `.env.local`.
3. Configurar el dominio web y los orígenes/redirecciones permitidos en la instancia de Clerk; comprobar Google y `/sso-callback` en ese dominio. Mantener la misma instancia para compartir usuarios con Expo.
4. Permitir el origen web en el CORS del bucket R2 para las subidas firmadas: método `PUT` y cabecera `Content-Type`. Para desarrollo, incluir `http://localhost:3002`. Mantener los orígenes necesarios para la aplicación original.
5. Usar HTTPS: necesario para la instalación PWA, GPS y service worker fuera de localhost.
6. Verificar con una cuenta real el login, vinculación, creación/completado y subida de fotos antes de publicar a usuarios.

No se ha desplegado esta implementación. El acceso a Clerk, Neon, R2 y Geoapify se comprobó con peticiones de solo lectura. El login OAuth y las modificaciones reales requieren una sesión del usuario y no están cubiertos por la validación local.

## Validación

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Las pruebas unitarias cubren autenticación, aislamiento y borrado offline, fotos privadas, Geoapify y recuperación de una respuesta de guardado perdida. Playwright usa Chrome en viewport móvil y datos de prueba exclusivamente locales para comprobar instalación, APIs sin sesión, búsqueda/filtros, navegación offline, fotos, visor y perfil. No sustituye una prueba autenticada contra los servicios reales.

`node scripts/verify-services.mjs` permite repetir las comprobaciones de conectividad de solo lectura sin imprimir credenciales.
