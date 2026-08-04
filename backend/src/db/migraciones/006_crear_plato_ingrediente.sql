-- Receta: cuánto de cada ingrediente consume un plato al prepararse.
CREATE TABLE plato_ingrediente (
  plato_id INTEGER NOT NULL REFERENCES platos(id),
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
  cantidad_requerida REAL NOT NULL CHECK (cantidad_requerida > 0),
  PRIMARY KEY (plato_id, ingrediente_id)
);
