import 'package:app/feature/qr/presentation/widgets/scanner_corners.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/qr/presentation/pages/scan_result.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});

  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final _scannerController = MobileScannerController();
  bool isScanned = false;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _handleBarcode(BarcodeCapture barcodes) async {
    if (isScanned) return;
    final barcode = barcodes.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    isScanned = true;
    await _scannerController.stop();
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ScanResultPage(result: barcode!.rawValue!),
      ),
    );
    isScanned = false;
    await _scannerController.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: true,
        bottom: true,
        child: Stack(
          children: [
            MobileScanner(
              controller: _scannerController,
              onDetect: _handleBarcode,
            ),
            Positioned(
                top: 20,
                left: 100,
                right: 100,
                child: Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: context.colors.surfaceContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "Scan Credentials",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16),
                  ),
                )),
            Positioned(
              top: 20,
              left: 20,
              child: Container(
                decoration: BoxDecoration(
                  color: context.colors.surfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: BackButton(
                  color: context.colors.primary,
                ),
              ),
            ),
            Center(
              child: SizedBox(
                width: 220,
                height: 220,
                child: CustomPaint(
                  painter: ScannerCorners(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
