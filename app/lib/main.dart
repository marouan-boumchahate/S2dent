import 'package:app/extensions/context_extensions.dart';
import 'package:app/theme/flex_color_scheme.dart';
import 'package:flutter/material.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MaterialApp(
      themeMode: ThemeMode.dark,
      darkTheme: AppTheme.dark,
      theme: AppTheme.light,
      home: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "Test",
              style: TextStyle(
                color: context.colors.primary,
                fontSize: 40,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () {},
                  child: Text("Press Me"),
                ),
                TextButton(
                  onPressed: () {},
                  child: Text("Text Button"),
                ),
                IconButton(
                  onPressed: () {},
                  icon: Icon(
                    Icons.shield_outlined,
                    color: context.colors.primary,
                  ),
                ),
              ],
            ),
            Checkbox(
              value: true,
              onChanged: (value) {},
            ),
          ],
        ),
      ),
    );
  }
}
