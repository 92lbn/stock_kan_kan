import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models/alarm_model.dart';
import '../../data/models/dhikr_model.dart';
import '../../data/repositories/dhikr_repository.dart';
import '../../logic/dhikr_matcher.dart';
import '../../services/alarm_service.dart';
import '../../services/speech_service.dart';
import '../widgets/highlighted_dhikr_text.dart';

/// Écran « Mission Adhkar » : plein écran, non fermable, s'affiche quand
/// l'alarme sonne. La sonnerie ne s'arrête QUE lorsque la récitation atteint
/// le seuil de similarité requis. Fail-safe (saisie manuelle) après N essais.
class AlarmRingScreen extends StatefulWidget {
  const AlarmRingScreen({super.key, required this.alarm});

  final AlarmEntry alarm;

  @override
  State<AlarmRingScreen> createState() => _AlarmRingScreenState();
}

class _AlarmRingScreenState extends State<AlarmRingScreen> {
  final _speech = SpeechService();
  final _matcher = DhikrMatcher(threshold: 0.8);
  final _dhikrRepo = DhikrRepository();

  Dhikr? _dhikr;
  String _transcript = '';
  MatchResult? _result;
  bool _validated = false;
  bool _sttUnavailable = false;

  /// Nombre de "reprises d'écoute" sans progression → propose le secours.
  int _stalledCycles = 0;
  bool _showFailSafe = false;

  @override
  void initState() {
    super.initState();
    // Empêche la fermeture accidentelle (pas de barre système).
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final d = await _dhikrRepo.byId(widget.alarm.dhikrId);
    if (!mounted) return;
    setState(() => _dhikr = d);

    final ok = await _speech.init();
    if (!ok || !await _speech.hasArabicLocale()) {
      setState(() {
        _sttUnavailable = true;
        _showFailSafe = true; // pas de STT arabe → secours direct
      });
      return;
    }
    await _speech.startListening(onTranscript: _onTranscript);
  }

  void _onTranscript(String transcript) {
    final d = _dhikr;
    if (d == null || _validated) return;

    final res = _matcher.evaluate(reference: d.arabic, transcript: transcript);

    // Détection de blocage : on écoute mais rien ne progresse.
    if (res.matchedCount <= (_result?.matchedCount ?? 0)) {
      _stalledCycles++;
    } else {
      _stalledCycles = 0;
    }

    setState(() {
      _transcript = transcript;
      _result = res;
      if (_stalledCycles >= 8) _showFailSafe = true;
    });

    if (res.passed) _validate();
  }

  Future<void> _validate() async {
    if (_validated) return;
    _validated = true;
    await _speech.stop();
    await AlarmService.instance.stopAndAdvance(widget.alarm);
    if (!mounted) return;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    // Petit écran de confirmation avant de fermer.
    await _showSuccess();
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _showSuccess() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 48),
        title: const Text('Invocation validée'),
        content: const Text(
          'Qu\'Allah accepte. Passe une belle journée.',
          textAlign: TextAlign.center,
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Continuer'),
          ),
        ],
      ),
    );
  }

  /// Secours : saisie manuelle du texte. On valide via le même matcher.
  Future<void> _openManualFallback() async {
    final controller = TextEditingController();
    final d = _dhikr;
    if (d == null) return;
    final typed = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Saisie de secours'),
        content: Directionality(
          textDirection: TextDirection.rtl,
          child: TextField(
            controller: controller,
            autofocus: true,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'اكتب الذكر هنا',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(controller.text),
            child: const Text('Valider'),
          ),
        ],
      ),
    );
    if (typed == null) return;
    final res = _matcher.evaluate(reference: d.arabic, transcript: typed);
    if (res.passed) {
      setState(() => _result = res);
      await _validate();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le texte saisi ne correspond pas assez.')),
      );
    }
  }

  @override
  void dispose() {
    _speech.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = _dhikr;
    final res = _result;
    final progress = res?.progress ?? 0.0;

    return PopScope(
      canPop: false, // on ne quitte pas sans réciter
      child: Scaffold(
        backgroundColor: const Color(0xFF0B1220),
        body: SafeArea(
          child: d == null
              ? const Center(child: CircularProgressIndicator())
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Column(
                    children: [
                      _Header(label: widget.alarm.label),
                      const SizedBox(height: 12),
                      _ProgressBar(progress: progress),
                      const SizedBox(height: 8),
                      Text(
                        _sttUnavailable
                            ? 'Reconnaissance arabe indisponible — utilise la saisie de secours.'
                            : 'Récite à voix haute. Les mots reconnus passent au vert.',
                        style: const TextStyle(color: Colors.white70, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            children: [
                              HighlightedDhikrText(
                                arabic: d.arabic,
                                wordMatched: res?.wordMatched ?? const [],
                              ),
                              const SizedBox(height: 20),
                              Text(
                                d.transliteration,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white60,
                                  fontStyle: FontStyle.italic,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                d.translationFr,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white38,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      _MicIndicator(listening: _speech.isListening),
                      if (_transcript.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Directionality(
                            textDirection: TextDirection.rtl,
                            child: Text(
                              _transcript,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white38, fontSize: 13),
                            ),
                          ),
                        ),
                      if (_showFailSafe)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(52), // cible 44+
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white54),
                            ),
                            onPressed: _openManualFallback,
                            icon: const Icon(Icons.keyboard),
                            label: const Text('Saisir le texte à la main'),
                          ),
                        ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Column(
        children: [
          const Text('Mission Adhkar',
              style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
          if (label.isNotEmpty)
            Text(label, style: const TextStyle(color: Colors.white54, fontSize: 14)),
        ],
      );
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.progress});
  final double progress;
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(
          value: progress,
          minHeight: 10,
          backgroundColor: Colors.white12,
          valueColor: const AlwaysStoppedAnimation(Color(0xFF16A34A)),
        ),
      );
}

class _MicIndicator extends StatelessWidget {
  const _MicIndicator({required this.listening});
  final bool listening;
  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(listening ? Icons.mic : Icons.mic_off,
              color: listening ? const Color(0xFF16A34A) : Colors.white38, size: 20),
          const SizedBox(width: 8),
          Text(
            listening ? 'Écoute en cours…' : 'Micro en pause',
            style: const TextStyle(color: Colors.white54, fontSize: 13),
          ),
        ],
      );
}
