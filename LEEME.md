# Asistente · Ola 1

App instalable para Android y PC: Hoy, Agenda, Tareas, Notas, Personas, Vencimientos y Buscar, sincronizada en tiempo real con Supabase.

## Publicarla en GitHub Pages (10 minutos, una sola vez)

1. En GitHub: **New repository** → nombre `asistente` → Public → Create.
2. En el repositorio: **Add file → Upload files** → arrastra **todo el contenido** de esta carpeta (no la carpeta en sí: `index.html` tiene que quedar en la raíz) → Commit changes.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
   En 1–2 minutos tendrás la app en `https://TU-USUARIO.github.io/asistente/`.

## Configurar Supabase (una sola vez)

1. **Authentication → URL Configuration**
   - Site URL: `https://TU-USUARIO.github.io/asistente/`
   - Redirect URLs: añade la misma dirección.
2. Abre la app → **Crear cuenta** con tu correo y contraseña → confirma desde el correo que te llega → **Entrar**.
3. **Importante, cuando ya tengas tu cuenta:** Authentication → Sign In / Providers → desactiva **Allow new users to sign up**. Así nadie más puede crearse una cuenta en tu proyecto.

## Instalarla

- **Android (Chrome):** abre la dirección → menú ⋮ → *Instalar aplicación*.
- **PC (Edge o Chrome):** abre la dirección → icono de instalar en la barra de direcciones (o Ajustes dentro de la app → Instalar).

## Captura rápida (pantalla Hoy)

Escribe en lenguaje normal y la app extrae fecha, hora, área y prioridad:

| Escribes | Resultado |
|---|---|
| `mañana a las 10 llamar al banco #piso !` | Tarea urgente en Piso, mañana 10:00 |
| `el jueves revisión médica a las 17:30 #salud` | Jueves 17:30, área Salud |
| `comprar regalo 12/10` | 12 de octubre, todo el día |
| `pasado mañana entrenamiento` | Dentro de 2 días |

## Actualizar la app

Sustituye los archivos en GitHub (Upload files) y, si cambia `sw.js`, sube su versión. Los dispositivos cogen la versión nueva al abrir la app con conexión.

## Estructura

- `index.html`, `styles.css`, `app.js`: la app.
- `config.js`: dirección y clave pública de Supabase. Nunca pongas aquí la service_role key.
- `vendor/supabase.js`, `fonts/`: incluidos en local para funcionar aunque la red bloquee servidores externos.
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y apertura sin conexión.
