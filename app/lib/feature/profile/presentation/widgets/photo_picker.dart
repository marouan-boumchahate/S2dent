import 'dart:io';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class PhotoPicker extends StatelessWidget {
  const PhotoPicker({
    super.key,
    required this.pickedImage,
    required this.photoUrl,
    required this.initials,
    required this.onTap,
  });

  final XFile? pickedImage;
  final String photoUrl;
  final String initials;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final image = _photoImage();

    return Center(
      child: GestureDetector(
        onTap: onTap,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            CircleAvatar(
              radius: 50,
              backgroundColor: context.colors.surfaceContainer,
              backgroundImage: image,
              child: image == null
                  ? Text(
                      initials,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: CircleAvatar(
                radius: 16,
                backgroundColor: context.colors.primary,
                child: const Icon(
                  Icons.camera_alt,
                  size: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  ImageProvider? _photoImage() {
    final picked = pickedImage;
    if (picked != null) return FileImage(File(picked.path));

    final value = photoUrl.trim();
    if (value.isEmpty) return null;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return NetworkImage(value);
    }
    return FileImage(File(value));
  }
}
