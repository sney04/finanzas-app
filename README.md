# Finanzas App — Fase 1

Control de finanzas personales. Fase 1: configuración base, autenticación y rutas protegidas.

## Qué incluye esta fase

- Proyecto React + TypeScript + Vite
- Tailwind CSS configurado con paleta de colores propia
- Firebase inicializado (Auth + Firestore + Storage)
- Registro de usuario (crea cuenta y documento en `users/{uid}`)
- Inicio de sesión
- Recuperación de contraseña por correo
- Cerrar sesión
- Rutas protegidas (no se puede ver `/dashboard` sin sesión)
- Reglas de seguridad de Firestore (cada usuario solo ve sus propios datos)

## 1. Instalar dependencias

Abre una terminal dentro de la carpeta del proyecto y ejecuta:

```bash
npm install
```

## 2. Crear un proyecto de Firebase

1. Ve a https://console.firebase.google.com y crea un proyecto nuevo.
2. Dentro del proyecto, ve a **Authentication > Sign-in method** y activa el
   proveedor **Correo electrónico/Contraseña**.
3. Ve a **Firestore Database** y créala (puedes empezar en modo producción,
   las reglas ya están incluidas en este proyecto).
4. Ve a **Configuración del proyecto (⚙️) > Tus apps** y crea una app web
   (ícono `</>`). Copia el objeto `firebaseConfig` que te muestra.

## 3. Configurar las variables de entorno

Copia el archivo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Abre `.env` y pega los valores que copiaste de Firebase:

```
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Nunca subas el archivo `.env` a GitHub** (ya está en `.gitignore`).

## 4. Publicar las reglas de seguridad de Firestore

Opción A — desde la consola de Firebase:
Ve a **Firestore Database > Reglas**, pega el contenido de `firestore.rules`
y publica.

Opción B — con Firebase CLI (si la tienes instalada):

```bash
firebase login
firebase use --add   # selecciona tu proyecto
firebase deploy --only firestore:rules
```

## 5. Ejecutar el proyecto en desarrollo

```bash
npm run dev
```

Abre el navegador en `http://localhost:5173`.

## 6. Cómo probar esta fase

1. Entra a `http://localhost:5173` → debe redirigirte a `/login`.
2. Ve a "Regístrate", crea una cuenta con nombre, correo y contraseña
   (mínimo 6 caracteres).
3. Deberías caer automáticamente en `/dashboard` con un saludo a tu nombre.
4. Ve a **Firestore Database** en la consola de Firebase → debe existir un
   documento nuevo en `users/{tu_uid}` con tu nombre, correo y moneda.
5. Haz clic en "Cerrar sesión" → debe volver a `/login`.
6. Intenta entrar directamente a `http://localhost:5173/dashboard` sin sesión
   → debe redirigirte a `/login` (ruta protegida funcionando).
7. En login, prueba "¿Olvidaste tu contraseña?", ingresa tu correo → revisa
   tu bandeja de entrada (incluyendo spam) para el enlace de recuperación.
8. Prueba con datos inválidos (correo mal escrito, contraseña corta,
   contraseñas que no coinciden) → deben aparecer mensajes de error en
   español debajo de cada campo.

## Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables (ProtectedRoute, AuthLayout...)
├── context/        # AuthContext (estado global de sesión)
├── firebase/       # Configuración de Firebase (config.ts)
├── hooks/          # Hooks personalizados (useAuth)
├── pages/          # Páginas (Login, Register, Dashboard...)
├── types/          # Tipos de TypeScript
└── utils/          # Utilidades (traducción de errores de Firebase)
```

## Próximas fases

- **Fase 2**: Dashboard real, cuentas, ingresos, gastos, movimientos y
  cálculo de saldo.
- **Fase 3**: Deudas, pagos y alertas.
- **Fase 4**: Presupuestos, ahorros y gráficos.
- **Fase 5**: Reportes, exportación CSV, optimización y modo oscuro.
