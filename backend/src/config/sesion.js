const fs = require('node:fs');
const path = require('node:path');
const session = require('express-session');
const sqlite3 = require('sqlite3');
const SQLiteStore = require('connect-sqlite3')(session);
const { entorno } = require('./entorno');

function crearConfigSesion(rutaSesionesDb = entorno.rutaSesionesDb) {
  if (rutaSesionesDb !== ':memory:') {
    fs.mkdirSync(path.dirname(rutaSesionesDb), { recursive: true });
  }
  const conexionSesiones = new sqlite3.Database(rutaSesionesDb);

  return {
    store: new SQLiteStore({ db: conexionSesiones }),
    secret: entorno.secretoSesion,
    name: 'sesionHotel',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: entorno.entornoNodo === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    },
  };
}

module.exports = { crearConfigSesion };
