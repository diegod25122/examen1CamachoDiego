# Control Electoral · Examen I — Desarrollo de Aplicaciones Móviles

Aplicación React Native (Expo SDK 57) para el escrutinio de una organización política
(Movimiento Futuro Ciudadano, Pichincha · Quito), construida sobre la **línea base del Grupo 6**
(19 RF, 11 RNF, 12 supuestos y 9 ADR del documento consolidado).

Autor: Diego David Camacho Molina

---

## 1. Instalación

> Expo Go 57 → plantilla **sdk-57** (no uses `@latest`, que ya es SDK 58).

```powershell
npx create-expo-app@latest control-electoral --template default@sdk-57
cd control-electoral
```

Borra la carpeta `src` de la plantilla y copia encima **todo** el contenido de este zip
(`src/`, `assets/`, `supabase/`, `app.json`, `eas.json`, `metro.config.js`, `tsconfig.json`,
`.env.example`, `README.md`). Agrega al `.gitignore` las líneas de `.gitignore.agregar`.

Dependencias (las versiones las elige `expo install` para SDK 57):

```powershell
npx expo install @supabase/supabase-js expo-sqlite expo-secure-store expo-crypto expo-camera expo-location expo-image-manipulator expo-file-system expo-linking expo-splash-screen expo-status-bar react-native-webview @react-native-community/netinfo @sentry/react-native lottie-react-native react-native-reanimated react-native-worklets react-native-gesture-handler react-native-safe-area-context @expo/vector-icons

npm install uniwind tailwindcss zustand @tanstack/react-query react-hook-form @hookform/resolvers zod aes-js jpeg-js

npx expo install jest-expo jest @types/jest -- --save-dev
npm install -D @types/aes-js
```

En `package.json` agrega:

```json
"scripts": { "test": "jest" },
"jest": {
  "preset": "jest-expo",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" }
}
```

Variables: copia `.env.example` como `.env` y llénalo (URL y publishable/anon key de Supabase, DSN de Sentry).

```powershell
npx expo start -c      # la primera vez genera src/uniwind-types.d.ts
npm test               # 29 pruebas del dominio y de los casos de uso
```

---

## 2. Backend (Supabase) — orden de ejecución en el SQL Editor

| Archivo | Qué hace |
|---|---|
| `supabase/sql/01_esquema.sql` | Tablas, tipos, validación de cédula (módulo 10), UNIQUE (un acta por mesa y dignidad, un coordinador por recinto, sin recintos duplicados) |
| `supabase/sql/02_funciones_triggers.sql` | Validación de votos en la base, hora del servidor, evidencia inmutable, historial de solo inserción, historial de asignaciones, RPC `crear_recinto`, `asignar_coordinador` |
| `supabase/sql/03_rls_permisos.sql` | RLS por rol y territorio + GRANT por columna |
| `supabase/sql/04_vistas_storage_realtime.sql` | Vistas del panel (avance, resultados, nulos/blancos), bucket privado `actas`, Realtime |
| `supabase/sql/05_semilla.sql` | 6 parroquias, 12 recintos con coordenadas, 36 mesas, 5 organizaciones y 10 candidatos |
| `supabase/sql/06_coordinador_provincial.sql` | Perfil del primer usuario (S-03) |
| `supabase/functions/crear-usuario/index.ts` | Edge Function que crea cuentas e invita por correo (ADR-02) |
| `supabase/plantillas-correo/*.html` | Plantillas de invitación y recuperación con enlace + código |
| `supabase/pruebas/pruebas_rls_local.sql` | Pruebas de políticas por rol (ejecutadas en PostgreSQL local) |

La configuración paso a paso (Auth, Gmail SMTP, Edge Function, Sentry, EAS) se hace después.

---

## 3. Arquitectura (ADR-05)

```
src/
├── app/                      # Expo Router: archivos delgados que solo exportan pantallas (ADR-09)
│   ├── _layout.tsx           # Sesión + rol desde Zustand → Stack.Protected por grupo
│   ├── (auth)/               # login, primer-acceso, recuperar, restablecer
│   ├── (provincial)/         # pestañas: panel, resultados, recintos, cuenta
│   ├── (recinto)/            # pestañas: mesas, veedores, cuenta-recinto
│   ├── (veedor)/             # pestañas: mis-mesas, envios, cuenta-veedor
│   ├── acta/[id].tsx         # detalle compartido (RLS filtra en el servidor)
│   └── registrar/[mesaId]/[dignidad].tsx
├── features/
│   ├── auth/        domain · data · presentation
│   ├── personal/    domain · data · presentation   (crear cuentas, veedores)
│   ├── territorio/  domain · data · presentation   (recintos, mesas, asignaciones)
│   ├── catalogo/    domain · data                  (organizaciones, candidatos, margen)
│   ├── actas/       domain · data(local, remote, dispositivo) · presentation
│   └── escrutinio/  domain · data · presentation   (panel provincial en tiempo real)
├── shared/
│   ├── domain/      AppError, IReporteErrores
│   ├── infra/       SQLite, cifrado, cliente Supabase, red, Sentry, caché
│   ├── presentation/ componentes, stores Zustand, TanStack Query
│   └── di/contenedor.ts      # inyección de dependencias
└── __tests__/                # pruebas del dominio (ADR-08)
```

Regla de dependencias: `presentation → domain ← data`. El **dominio no importa React Native ni
Supabase** (solo Zod para los esquemas). La presentación usa casos de uso desde `shared/di/contenedor.ts`.

---

## 4. Trazabilidad con la línea base

| Requisito | Dónde se cumple |
|---|---|
| RF-01 sin autorregistro, sesión persistente | `auth/data/SupabaseAuthRepository.ts`, `auth/domain/usecases/casosAuth.ts` (perfil obligatorio) |
| RF-02 creación jerárquica, cédula módulo 10, sin duplicados | `supabase/functions/crear-usuario`, `personal/domain/validaciones/cedula.ts`, `01_esquema.sql` |
| RF-03 correo verificado + contraseña propia | Invitación por correo, `PrimerAccesoScreen`, política `actas registrar` exige `correo_verificado()` |
| RF-04 recuperación autónoma | `RecuperarScreen` + `RestablecerScreen` (enlace o código de 6 dígitos) |
| RF-05 recintos, sin duplicados, un coordinador | `RecintosScreen`, `NuevoRecintoScreen`, `RecintoDetalleScreen`, RPC `crear_recinto` / `asignar_coordinador` |
| RF-06 / RF-07 asignar y reemplazar veedor | `MesasRecintoScreen`, `MesaDetalleScreen`, trigger `mesas_historial` |
| RF-08 / RF-09 acta y validación inmediata | `RegistroActaScreen`, `actas/domain/validaciones/*`, `validar_votos_acta()` en SQL |
| RF-10 foto de la cámara, rechazo de borrosas | `CamaraActa.tsx`, `domain/servicios/nitidez.ts`, `EvidenciaDispositivo.ts` |
| RF-11 GPS + margen 200 m | `domain/servicios/distancia.ts`, trigger `tg_actas_antes` (recalcula en el servidor) |
| RF-12 correcciones con historial | `GuardarActa` (corrección), `acta_versiones` (solo inserción), `ActaDetalleScreen` |
| RF-13 estado visible y conexión en todas las pantallas | `BarraConexion`, `ChipEstadoActa`, `EnviosScreen`, `AvisoEstado` |
| RF-14 sin conexión | `ColaActasSqlite` (outbox), `SincronizarActas`, cachés cifradas de mesas y catálogo |
| RF-15 / RF-16 panel provincial | `PanelScreen`, `ResultadosScreen`, `MapaActa`, vistas `v_avance_recintos`, `v_resultados` |
| RF-17 reporte de fallos | `shared/infra/monitoreo/sentry.ts`, `SincronizarActas` (reporta fallos de subida), `CuentaScreen` (prueba) |
| RF-18 precarga | `05_semilla.sql` |
| RF-19 inicio por rol | `app/_layout.tsx` (Stack.Protected), `app/index.tsx` |
| RNF-03 seguridad en el servidor | RLS + GRANT por columna + triggers |
| RNF-04 datos cifrados | `shared/infra/seguridad/cifrado.ts` (AES-256, llave en secure-store), `LimpiezaLocal` |
| RNF-05 no duplicación | UUID del teléfono, ruta de foto única, `SincronizarActas` con candado, PK en SQL |
| RNF-07 evidencia inmutable | Trigger fija lat/lng/hora originales; foto nueva = ruta nueva |
| RNF-08 compresión | `EvidenciaDispositivo.prepararFoto` (1600 px, JPEG 0.7) |
| RNF-09 tiempo real | `useEscrutinioEnVivo` (Realtime + respaldo al volver a primer plano) |

| ADR | Implementación |
|---|---|
| ADR-01 Supabase | `supabase/sql/*`, repositorios `Supabase*Repository` |
| ADR-02 Edge Function + Gmail SMTP | `supabase/functions/crear-usuario`, plantillas de correo |
| ADR-03 SQLite outbox + secure-store | `shared/infra/db`, `seguridad/cifrado.ts`, `ColaActasSqlite`, `useSincronizacion` |
| ADR-04 expo-camera + Laplaciano + Leaflet | `CamaraActa`, `nitidez.ts`, `EvidenciaDispositivo`, `MapaActa` |
| ADR-05 Clean Architecture + Zustand + TanStack | `features/*/{domain,data,presentation}`, `shared/di`, `sesionStore`, `query/claves.ts` |
| ADR-06 Uniwind + Lottie + Reanimated | `global.css` (@theme), `AnimacionLottie`, `AvisoEstado`, `BarraConexion`, `ResumenSuma` |
| ADR-07 EAS + Sentry | `eas.json` (perfil preview → APK), `metro.config.js`, `sentry.ts` |
| ADR-08 React Hook Form + Zod | `*/domain/validaciones/*`, formularios con `zodResolver` y `mode: 'onChange'` |
| ADR-09 Expo Router | `src/app/*` con grupos por rol |

---

## 5. Datos de prueba

- Cédulas válidas: `1712345675`, `1723456784`, `1709876542`, `1711111110`, `1722222229`, `1733333338`.
- Para crear varios usuarios con un solo Gmail: `tucorreo+coord1@gmail.com`, `tucorreo+veedor1@gmail.com`…
  (Gmail los entrega al mismo buzón y Supabase los trata como correos distintos).
