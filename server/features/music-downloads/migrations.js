export const migrations = [{
  id: '060-music-download-jobs',
  up(db) {
    db.exec([
      'CREATE TABLE music_download_jobs (',
      'id TEXT PRIMARY KEY, source_id TEXT NOT NULL, url TEXT NOT NULL,',
      "title TEXT NOT NULL DEFAULT '', artist TEXT NOT NULL DEFAULT '', album TEXT NOT NULL DEFAULT '',",
      "state TEXT NOT NULL DEFAULT 'queued', progress INTEGER NOT NULL DEFAULT 0,",
      "file_id INTEGER, destination TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '',",
      'created INTEGER NOT NULL, updated INTEGER NOT NULL)',
    ].join(' '));
    db.exec('CREATE INDEX music_download_source ON music_download_jobs(source_id, state)');
    db.exec('CREATE INDEX music_download_recent ON music_download_jobs(created DESC)');
  },
}, {
  id: '061-music-download-formats',
  up(db) {
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN format TEXT NOT NULL DEFAULT 'mp3'");
  },
}, {
  id: '062-download-options',
  up(db) {
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN options_json TEXT NOT NULL DEFAULT '{}'");
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN channel TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN playlist TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN year TEXT NOT NULL DEFAULT ''");
  },
}, {
  id: '063-download-telemetry',
  up(db) {
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN speed TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE music_download_jobs ADD COLUMN eta TEXT NOT NULL DEFAULT ''");
  },
}, {
  id: '064-download-priority',
  up(db) {
    db.exec('ALTER TABLE music_download_jobs ADD COLUMN priority INTEGER NOT NULL DEFAULT 0');
  },
}];
