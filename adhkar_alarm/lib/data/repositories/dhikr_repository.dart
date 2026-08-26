import '../db/database.dart';
import '../models/dhikr_model.dart';

class DhikrRepository {
  Future<List<Dhikr>> all() async {
    final db = await AppDatabase.instance.database;
    final rows = await db.query('dhikr', orderBy: 'id');
    return rows.map(Dhikr.fromMap).toList();
  }

  Future<Dhikr?> byId(int id) async {
    final db = await AppDatabase.instance.database;
    final rows = await db.query('dhikr', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return null;
    return Dhikr.fromMap(rows.first);
  }
}
