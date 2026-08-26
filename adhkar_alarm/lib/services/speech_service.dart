import 'package:permission_handler/permission_handler.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Enrobe le moteur STT natif (SFSpeechRecognizer iOS / SpeechRecognizer
/// Android) pour la reconnaissance de l'arabe (ar-SA).
///
/// Points clés :
///  - `onDevice: true` demande la reconnaissance HORS-LIGNE quand le pack de
///    langue arabe est installé sur l'appareil (sinon repli réseau) ;
///  - écoute en continu (`ListenMode.dictation`) avec résultats partiels pour
///    le surlignage en temps réel ;
///  - relance automatique si le moteur coupe l'écoute (silence, timeout) tant
///    que le défi n'est pas validé.
class SpeechService {
  final SpeechToText _stt = SpeechToText();
  bool _available = false;
  bool _wantListening = false;

  /// Locale arabe (Arabie saoudite) — la plus largement supportée pour le
  /// vocabulaire coranique.
  static const String arabicLocale = 'ar-SA';

  bool get isListening => _stt.isListening;

  /// Demande la permission micro et initialise le moteur.
  Future<bool> init({void Function(String status)? onStatus}) async {
    final mic = await Permission.microphone.request();
    if (!mic.isGranted) return false;

    _available = await _stt.initialize(
      onError: (e) {
        // Erreurs transitoires (no_match, speech_timeout) : on relance.
        if (_wantListening) _restart();
      },
      onStatus: (s) {
        onStatus?.call(s);
        // Le moteur passe en "notListening" tout seul après un silence.
        if ((s == 'notListening' || s == 'done') && _wantListening) {
          _restart();
        }
      },
      debugLogging: false,
    );
    return _available;
  }

  /// Démarre l'écoute continue. [onTranscript] reçoit la transcription
  /// cumulée (partielle puis finale) à chaque mise à jour.
  Future<void> startListening({
    required void Function(String transcript) onTranscript,
  }) async {
    if (!_available) return;
    _wantListening = true;
    _onTranscript = onTranscript;
    await _listen();
  }

  void Function(String)? _onTranscript;

  Future<void> _listen() async {
    if (!_wantListening) return;
    await _stt.listen(
      localeId: arabicLocale,
      onResult: (r) => _onTranscript?.call(r.recognizedWords),
      listenOptions: SpeechListenOptions(
        partialResults: true, // temps réel
        onDevice: true, // hors-ligne si dispo
        listenMode: ListenMode.dictation,
        cancelOnError: false,
      ),
      pauseFor: const Duration(seconds: 6),
      listenFor: const Duration(minutes: 2),
    );
  }

  Future<void> _restart() async {
    if (!_wantListening) return;
    // Petit délai pour laisser le moteur natif se libérer.
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (_wantListening && !_stt.isListening) {
      await _listen();
    }
  }

  Future<void> stop() async {
    _wantListening = false;
    await _stt.stop();
  }

  /// True si un moteur de reconnaissance arabe est disponible sur l'appareil.
  Future<bool> hasArabicLocale() async {
    final locales = await _stt.locales();
    return locales.any((l) => l.localeId.toLowerCase().startsWith('ar'));
  }
}
