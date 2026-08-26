import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../../seed/adhkar_seed.dart';

/// Ouverture unique de la base SQLite locale + schéma + seed des invocations.
class AppDatabase {
  AppDatabase._();
  static final AppDatabase instance = AppDatabase._();

  Database? _db;

  Future<Database> get database async {
    return _db ??= await _open();
  }

  Future<Database> _open() async {
    final dir = await getDatabasesPath();
    final path = p.join(dir, 'adhkar_alarm.db');
    return openDatabase(
      path,
      version: 1,
      onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE dhikr (
        id             INTEGER PRIMARY KEY,
        arabic         TEXT NOT NULL,
        transliteration TEXT NOT NULL,
        translation_fr TEXT NOT NULL,
        audio_asset    TEXT,
        source         TEXT
      );
    ''');

    await db.execute('''
      CREATE TABLE alarm (
        id            INTEGER PRIMARY KEY,
        hour          INTEGER NOT NULL,
        minute        INTEGER NOT NULL,
        enabled       INTEGER NOT NULL DEFAULT 1,
        label         TEXT NOT NULL DEFAULT '',
        dhikr_id      INTEGER NOT NULL REFERENCES dhikr(id),
        weekdays      TEXT NOT NULL DEFAULT '',
        ringtone_asset TEXT NOT NULL DEFAULT 'assets/audio/ringtone.mp3'
      );
    ''');

    // Index : on liste souvent les alarmes actives triées par heure.
    await db.execute(
      'CREATE INDEX idx_alarm_enabled_time ON alarm(enabled, hour, minute);',
    );

    // Seed des invocations prédéfinies.
    final batch = db.batch();
    for (final d in seedAdhkar) {
      batch.insert('dhikr', d.toMap());
    }
    await batch.commit(noResult: true);
  }
}
