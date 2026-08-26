import '../db/database.dart';
import '../models/alarm_model.dart';

class AlarmRepository {
  Future<List<AlarmEntry>> all() async {
    final db = await AppDatabase.instance.database;
    final rows = await db.query('alarm', orderBy: 'hour, minute');
    return rows.map(AlarmEntry.fromMap).toList();
  }

  Future<AlarmEntry?> byId(int id) async {
    final db = await AppDatabase.instance.database;
    final rows = await db.query('alarm', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return null;
    return AlarmEntry.fromMap(rows.first);
  }

  Future<int> upsert(AlarmEntry alarm) async {
    final db = await AppDatabase.instance.database;
    return db.insert(
      'alarm',
      alarm.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> setEnabled(int id, bool enabled) async {
    final db = await AppDatabase.instance.database;
    await db.update('alarm', {'enabled': enabled ? 1 : 0},
        where: 'id = ?', whereArgs: [id]);
  }

  Future<void> delete(int id) async {
    final db = await AppDatabase.instance.database;
    await db.delete('alarm', where: 'id = ?', whereArgs: [id]);
  }
}
