-- Admin de desarrollo. Contraseña en texto plano: Admin123!
-- CAMBIAR esta cuenta (o desactivarla y crear una nueva) antes de cualquier
-- uso fuera de desarrollo — ver README.md.
INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol, activo, creado_en)
SELECT 'Administrador', 'admin@hotelandino.com',
       '$2a$10$BJpTeQywNsJLpHF8SdZU7O567WO4wT0zRoEVjKif.mdoF0bKz4h1m',
       'admin', 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'admin@hotelandino.com');
