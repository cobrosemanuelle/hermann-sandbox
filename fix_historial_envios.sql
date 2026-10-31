-- Cambiar tipo de columna cliente_id de INTEGER a TEXT para soportar UUIDs

ALTER TABLE historial_envios 
ALTER COLUMN cliente_id TYPE TEXT;

-- Comentario explicativo
COMMENT ON COLUMN historial_envios.cliente_id IS 'UUID del cliente (texto)';
