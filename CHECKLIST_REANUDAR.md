# Checklist para reanudar el proyecto Golf Greenrivals

## 1. Crear usuarios en Supabase
- [ ] Esperar a que se libere el rate limit de Supabase Auth
- [ ] Ejecutar `node create_users.js` para crear los 8 usuarios con emails @greenrivals.com

## 2. Crear la partida en la base de datos
- [ ] Verificar que la tabla `games` existe en Supabase (ejecutar el SQL si es necesario)
- [ ] Dar permisos de inserción y lectura a la tabla `games` para el rol `anon`
- [ ] Ejecutar `node create_game.js` para crear la partida con los equipos y jugadores

## 3. Probar la experiencia de usuario
- [ ] Hacer login con los usuarios de prueba
- [ ] Verificar la navegación, menús y feedback visual
- [ ] Comprobar que la partida aparece y se puede jugar

## 4. Mejoras opcionales
- [ ] Pulir la UI/UX (feedback, validaciones, navegación)
- [ ] Añadir lógica de juego, apuestas, gestión de hoyos, etc.
- [ ] Preparar mocks para desarrollo local si quieres avanzar sin backend

---

**Tip:** Puedes ejecutar los scripts desde la terminal del proyecto:
- `node create_users.js`
- `node create_game.js`

Y modificar los archivos según los emails y contraseñas que necesites.

¿Dudas? ¡Pide ayuda aquí!