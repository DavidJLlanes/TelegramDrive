import { compareNames } from '../utils/text.js';

const BASE = "kind = 'audio' AND tagged = 1";
const byName = (key) => (a, b) => compareNames(a[key], b[key]);

/** Consultas agrupadas por etiquetas (artista, álbum, género). */
export class LibraryRepo {
  constructor(db) { this.db = db; }

  artists() {
    return this.db.stmt(`SELECT band AS name, COUNT(DISTINCT album) AS albums, COUNT(*) AS tracks, MIN(CASE WHEN thumb = 1 THEN msg_id END) AS cover
      FROM files WHERE ${BASE} AND band != '' GROUP BY band`).all().sort(byName('name'));
  }

  genres() {
    return this.db.stmt(`SELECT genre AS name, COUNT(*) AS tracks FROM files WHERE ${BASE} AND genre != '' GROUP BY genre`).all().sort(byName('name'));
  }

  /** Álbumes; con `band` incluye también las canciones sueltas de ese artista (álbum vacío). */
  albums({ band, genre } = {}) {
    const where = [BASE];
    const args = [];
    if (band) { where.push('band = ?'); args.push(band); } else where.push("album != ''");
    if (genre) { where.push('genre = ?'); args.push(genre); }
    return this.db.stmt(`SELECT album, band, MAX(year) AS year, COUNT(*) AS tracks, MIN(CASE WHEN thumb = 1 THEN msg_id END) AS cover
      FROM files WHERE ${where.join(' AND ')} GROUP BY album, band`).all(...args).sort((a, b) => compareNames(a.album, b.album) || compareNames(a.band, b.band));
  }

  tracks({ band, album, genre }) {
    const where = [BASE];
    const args = [];
    if (band !== undefined) { where.push('band = ?'); args.push(band); }
    if (album !== undefined) { where.push('album = ?'); args.push(album); }
    if (genre) { where.push('genre = ?'); args.push(genre); }
    return this.db.stmt(`SELECT msg_id AS id, folder, name, size, mime, kind, date, thumb, tagged, title, artist, album, band, genre, track, disc, year
      FROM files WHERE ${where.join(' AND ')} LIMIT 10000`).all(...args);
  }
}
