const fs = require('node:fs');
const path = require('node:path');
const session = require('express-session');
const Database = require('better-sqlite3');
const { entorno } = require('./entorno');

const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;
const UNA_HORA_MS = 60 * 60 * 1000;

/**
 * Store de sesiones propio sobre better-sqlite3.
 *
 * Antes se usaba `connect-sqlite3`, que internamente depende del paquete
 * `sqlite3` (driver async basado en node-gyp). Eso significaba tener DOS
 * bindings nativos de SQLite instalados a la vez: `better-sqlite3` para la
 * base de datos principal y `sqlite3` solo para las sesiones. Duplicaba
 * compilación nativa, superficie de vulnerabilidades y el árbol de
 * dependencias (node-gyp, tar, prebuild-install, etc. por duplicado).
 *
 * Esta clase implementa la interfaz mínima de `session.Store` (get/set/
 * destroy/touch) reutilizando el mismo driver better-sqlite3 que ya usa
 * el resto de la app.
 */
class AlmacenSesionesSqlite extends session.Store {
  constructor({ db, intervaloLimpiezaMs = UNA_HORA_MS } = {}) {
    super();
    this.db = db;
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id TEXT PRIMARY KEY,
        datos TEXT NOT NULL,
        expira INTEGER NOT NULL
      )
    `);

    this._stmtGet = this.db.prepare('SELECT datos, expira FROM sesiones WHERE id = ?');
    this._stmtSet = this.db.prepare(`
      INSERT INTO sesiones (id, datos, expira) VALUES (@id, @datos, @expira)
      ON CONFLICT(id) DO UPDATE SET datos = excluded.datos, expira = excluded.expira
    `);
    this._stmtDestroy = this.db.prepare('DELETE FROM sesiones WHERE id = ?');
    this._stmtTouch = this.db.prepare('UPDATE sesiones SET expira = ? WHERE id = ?');
    this._stmtLimpiar = this.db.prepare('DELETE FROM sesiones WHERE expira < ?');

    if (intervaloLimpiezaMs > 0) {
      this._temporizadorLimpieza = setInterval(() => this._limpiarExpiradas(), intervaloLimpiezaMs);
      this._temporizadorLimpieza.unref();
    }
  }

  _calcularExpira(sesion) {
    const maxAge = sesion && sesion.cookie ? sesion.cookie.maxAge : undefined;
    return Date.now() + (typeof maxAge === 'number' ? maxAge : OCHO_HORAS_MS);
  }

  _limpiarExpiradas() {
    try {
      this._stmtLimpiar.run(Date.now());
    } catch (error) {
      // La limpieza periódica es mantenimiento, no una operación crítica:
      // si falla no debe tumbar el proceso.
    }
  }

  get(id, callback) {
    try {
      const fila = this._stmtGet.get(id);
      if (!fila) return callback(null, null);
      if (fila.expira < Date.now()) {
        this._stmtDestroy.run(id);
        return callback(null, null);
      }
      return callback(null, JSON.parse(fila.datos));
    } catch (error) {
      return callback(error);
    }
  }

  set(id, sesion, callback) {
    try {
      this._stmtSet.run({ id, datos: JSON.stringify(sesion), expira: this._calcularExpira(sesion) });
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  destroy(id, callback) {
    try {
      this._stmtDestroy.run(id);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  touch(id, sesion, callback) {
    try {
      this._stmtTouch.run(this._calcularExpira(sesion), id);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }
}

function crearConfigSesion(rutaSesionesDb = entorno.rutaSesionesDb) {
  if (rutaSesionesDb !== ':memory:') {
    fs.mkdirSync(path.dirname(rutaSesionesDb), { recursive: true });
  }
  const conexionSesiones = new Database(rutaSesionesDb);

  return {
    store: new AlmacenSesionesSqlite({ db: conexionSesiones }),
    secret: entorno.secretoSesion,
    name: 'sesionHotel',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: entorno.entornoNodo === 'production',
      sameSite: 'strict',
      maxAge: OCHO_HORAS_MS,
    },
  };
}

module.exports = { crearConfigSesion, AlmacenSesionesSqlite };
