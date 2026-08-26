import 'package:flutter/material.dart';

import 'services/alarm_service.dart';
import 'ui/screens/alarm_list_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AlarmService.instance.init();
  runApp(const AdhkarApp());
}

class AdhkarApp extends StatelessWidget {
  const AdhkarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Réveil Adhkar',
      debugShowCheckedModeBanner: false,
      navigatorKey: AlarmService.navigatorKey, // ouverture depuis background
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF16A34A),
        brightness: Brightness.dark,
      ),
      home: const AlarmListScreen(),
    );
  }
}
