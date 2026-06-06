import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/buttons/custom_backbutton.dart';
import 'package:app/feature/settings/data/faqs_data.dart';
import 'package:app/feature/settings/presentation/widgets/faq_container.dart';
import 'package:flutter/material.dart';

class FaqsPage extends StatelessWidget {
  const FaqsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(color: context.colors.surface),
        title: Text(
          "FAQs",
          style: context.texts.titleLarge!.copyWith(
            color: context.colors.onPrimaryContainer,
          ),
        ),
        backgroundColor: context.colors.onPrimary,
        leading: CustomBackButton(),
        leadingWidth: 80,
      ),
      body: MainLayout(
        children: faqs
            .map(
              (faq) => FaqContainer(
                question: faq.question,
                answer: faq.answer,
              ),
            )
            .toList(),
      ),
    );
  }
}
