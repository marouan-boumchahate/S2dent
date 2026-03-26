import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class DocumentContainer extends StatelessWidget {
  const DocumentContainer({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      width: 80,
      height: 100,
      decoration: BoxDecoration(
        color: context.colors.primaryContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blueGrey.withAlpha(100)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Container(
              height: 4,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: context.colors.primary,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Container(
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: Colors.blueGrey.withAlpha(170),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Container(
              height: 4,
              width: 25,
              decoration: BoxDecoration(
                color: Colors.blueGrey.withAlpha(170),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Container(
              height: 4,
              width: 35,
              decoration: BoxDecoration(
                color: Colors.blueGrey.withAlpha(170),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Container(
              height: 4,
              width: 15,
              decoration: BoxDecoration(
                color: Colors.blueGrey.withAlpha(170),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: context.colors.inversePrimary),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: context.colors.primary),
                ),
                Container(
                  height: 4,
                  width: 30,
                  decoration: const BoxDecoration(color: Colors.blueGrey),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
