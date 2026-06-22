import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../providers/auth_provider.dart';
import '../services/health_data_service.dart';
import 'heart_rate_integration_screen.dart';
import '../services/performance_service.dart';
import '../models/mental_test.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:math';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../config.dart';
import 'biometric_ai_insight_detail_screen.dart';

class BiometricDashboardScreen extends StatefulWidget {
  const BiometricDashboardScreen({super.key});
  @override
  State<BiometricDashboardScreen> createState() => _BiometricDashboardScreenState();
}

class _BiometricDashboardScreenState extends State<BiometricDashboardScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _pulseController;
  final Random _random = Random();

  // Vitals
  int _bpm = 75;
  int _hrv = 65;
  int _stressIndex = 32;
  double _bodyTemp = 36.3;
  int _bpSys = 120, _bpDia = 80;
  int _respRate = 14;
  bool _vitalsLoading = true;
  bool _vitalsSimulated = false;
  bool _vitalsFromKiosk = false;


  // Sleep
  List<SleepRecord> _sleepRecords = [];
  bool _sleepLoading = true;
  bool _sleepPermissionDenied = false;

  // AI Insights
  String _aiShortInsight = '';
  bool _generatingInsight = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _pulseController = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    // Request HealthKit permissions once upfront, then load data.
    // Doing this in a single pass prevents the double-permission-dialog
    // that caused a white screen freeze on iOS.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      // One consolidated permission request for all health data types.
      await HealthDataService.requestPermissions();
      if (!mounted) return;
      await _loadVitals();
      await _loadSleep();
      if (mounted) {
        final settings = Provider.of<AppSettingsProvider>(context, listen: false);
        _generateShortInsight(settings.lang == 'ko');
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadVitals() async {
    // Cache auth data before first await to safely use across async gaps
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.user == null) {
      if (mounted) setState(() => _vitalsLoading = false);
      return;
    }
    final userEmail = auth.user!.email;
    final userId = auth.user!.uid;

    try {
      final vitals = await HealthDataService.fetchLatestVitals();
      if (!mounted) return;

      final db = FirebaseFirestore.instance;

      // Fetch Firestore user doc to check for latest_vitals (Kiosk fallback)
      final userSnap = await db.collection('users').doc(userId).get();
      Map<String, dynamic>? dbVitals;
      if (userSnap.exists && userSnap.data() != null) {
        final data = userSnap.data()!;
        if (data.containsKey('latest_vitals')) {
          dbVitals = data['latest_vitals'] as Map<String, dynamic>?;
        }
      }

      final snap = await db.collection('mental_tests')
          .where('clientEmail', isEqualTo: userEmail).get();
      var docs = snap.docs;
      if (docs.isEmpty) {
        final s2 = await db.collection('mental_tests')
            .where('clientId', isEqualTo: userId).get();
        docs = s2.docs;
      }
      final tests = docs.map((d) => MentalTest.fromFirestore(d)).toList();

      final int bpm;
      final int hrv = vitals?.hrv ?? (60 + _random.nextInt(15));
      final double bodyTemp;
      final int bpSys;
      final int bpDia;
      final int respRate;
      final bool isSimulated;
      bool isFromKiosk = false;

      if (vitals != null) {
        bpm = vitals.bpm;
        bodyTemp = vitals.bodyTemp;
        bpSys = vitals.bpSys;
        bpDia = vitals.bpDia;
        respRate = vitals.respRate;
        isSimulated = false;
      } else if (dbVitals != null) {
        bpm = (dbVitals['bpm'] as num?)?.toInt() ?? 72;
        bodyTemp = (dbVitals['bodyTemp'] as num?)?.toDouble() ?? 36.5;
        bpSys = (dbVitals['bpSys'] as num?)?.toInt() ?? 120;
        bpDia = (dbVitals['bpDia'] as num?)?.toInt() ?? 80;
        respRate = (dbVitals['respRate'] as num?)?.toInt() ?? 14;
        isSimulated = false;
        isFromKiosk = true;
      } else {
        bpm = 72 + _random.nextInt(8);
        bodyTemp = 36.0 + _random.nextInt(10) / 10;
        bpSys = 110 + _random.nextInt(20);
        bpDia = 70 + _random.nextInt(15);
        respRate = 12 + _random.nextInt(6);
        isSimulated = true;
      }

      final stress = dbVitals != null && dbVitals.containsKey('stress')
          ? (dbVitals['stress'] as num).toInt()
          : PerformanceService.computeStressIndex(
              recentTests: tests, currentBpm: bpm, currentHrv: hrv);

      if (mounted) setState(() {
        _bpm = bpm;
        _hrv = hrv;
        _stressIndex = stress;
        _bodyTemp = bodyTemp;
        _bpSys = bpSys;
        _bpDia = bpDia;
        _respRate = respRate;
        _vitalsSimulated = isSimulated;
        _vitalsFromKiosk = isFromKiosk;
        _vitalsLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _vitalsSimulated = true;
        _vitalsLoading = false;
      });
    }
    Future.delayed(const Duration(seconds: 3), _tickBpm);
  }

  void _tickBpm() {
    if (!mounted) return;
    setState(() { _bpm = 72 + _random.nextInt(8); _respRate = 12 + _random.nextInt(6); });
    Future.delayed(const Duration(seconds: 3), _tickBpm);
  }

  Future<void> _loadSleep() async {
    try {
      final records = await HealthDataService.fetchRecentSleep(days: 14);
      if (mounted) setState(() {
        _sleepRecords = records;
        _sleepLoading = false;
        _sleepPermissionDenied = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _sleepRecords = [];
        _sleepLoading = false;
        _sleepPermissionDenied = e.toString().contains("Permission denied");
      });
    }
  }

  Future<void> _generateShortInsight(bool isKo) async {
    if (!mounted) return;
    setState(() {
      _generatingInsight = true;
      _aiShortInsight = isKo ? 'AI가 생체 데이터를 분석 중입니다...' : 'Analyzing biometric data...';
    });

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: AppConfig.geminiApiKey,
      );

      final sleepInfo = _sleepRecords.isNotEmpty
          ? 'Last night sleep: ${_sleepRecords.first.hoursAsleep} hours (Quality: ${_sleepRecords.first.quality})'
          : 'No sleep record available.';

      final prompt = """
You are a professional sports psychology and health tracking AI advisor for the Tufly platform.
An athlete has the following health vitals:
- Heart Rate (BPM): $_bpm
- Heart Rate Variability (HRV): $_hrv ms
- Stress Index: $_stressIndex%
- Body Temperature: $_bodyTemp °C
- Blood Pressure: $_bpSys/$_bpDia mmHg
- Respiration Rate: $_respRate /min
- $sleepInfo

Please provide a highly personalized, dynamic 1-2 sentence recovery summary and advice for this athlete in ${isKo ? 'Korean' : 'English'}.
Keep it concise, supportive, and specific to these numbers.
No markdown, bullet points, headers, prefix or quotes, just a simple natural text paragraph.
""";

      final response = await model.generateContent([Content.text(prompt)]);
      if (mounted) {
        setState(() {
          _aiShortInsight = response.text?.trim() ?? '';
          _generatingInsight = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiShortInsight = '';
          _generatingInsight = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<AppSettingsProvider>();
    final isKo = settings.lang == 'ko';
    return Scaffold(
      backgroundColor: TuflyTheme.darkBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent, elevation: 0, centerTitle: true,
        title: Text(isKo ? '생체 데이터 대시보드' : 'Biometric Dashboard',
            style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.cable_rounded, color: Colors.white70),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const HeartRateIntegrationScreen())),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: TuflyTheme.primary,
          indicatorWeight: 2,
          labelStyle: GoogleFonts.notoSansKr(fontWeight: FontWeight.w700, fontSize: 13),
          unselectedLabelStyle: GoogleFonts.notoSansKr(fontWeight: FontWeight.w400, fontSize: 13),
          labelColor: TuflyTheme.primary,
          unselectedLabelColor: Colors.white38,
          tabs: [
            Tab(text: isKo ? '바이탈 지표' : 'Vitals'),
            Tab(text: isKo ? '수면 분석' : 'Sleep'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildVitalsTab(isKo),
          _buildSleepTab(isKo),
        ],
      ),
    );
  }

  // ─── TAB 1: VITALS ────────────────────────────────────────────────────────

  Widget _buildVitalsTab(bool isKo) {
    if (_vitalsLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: TuflyTheme.primary),
            const SizedBox(height: 16),
            Text(
              isKo ? '생체 데이터 불러오는 중...' : 'Loading biometric data...',
              style: const TextStyle(color: Colors.white38, fontSize: 13),
            ),
          ],
        ),
      );
    }
    final stressColor = _stressIndex < 40
        ? const Color(0xFF10B981)
        : _stressIndex < 70 ? const Color(0xFFfbbf24) : const Color(0xFFfb7185);
    final statusLabel = _stressIndex < 40
        ? (isKo ? '안정적' : 'Stable')
        : _stressIndex < 70 ? (isKo ? '주의' : 'Warning') : (isKo ? '위험' : 'Critical');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          if (_vitalsSimulated)
            Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.withOpacity(0.3), width: 0.5),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.amber, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isKo
                          ? '건강 앱 연동이 확인되지 않아 예시 데이터를 표시 중입니다.'
                          : 'No health app link detected. Showing simulated data.',
                      style: GoogleFonts.notoSansKr(
                        color: Colors.amber.shade200,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (_vitalsFromKiosk)
            Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: TuflyTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: TuflyTheme.primary.withOpacity(0.3), width: 0.5),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: TuflyTheme.primary, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isKo
                          ? '키오스크 측정 데이터와 동기화 완료되었습니다.'
                          : 'Synced successfully with kiosk biometric measurements.',
                      style: GoogleFonts.notoSansKr(
                        color: Colors.purple.shade200,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          // BPM Hero
          Center(
            child: Column(children: [
              ScaleTransition(
                scale: Tween(begin: 1.0, end: 1.08).animate(_pulseController),
                child: const Icon(Icons.favorite, color: Color(0xFFFB7185), size: 52),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text('$_bpm', style: GoogleFonts.outfit(color: Colors.white, fontSize: 64, fontWeight: FontWeight.w800, height: 1)),
                  const SizedBox(width: 8),
                  Text('BPM', style: GoogleFonts.outfit(color: TuflyTheme.silver, fontSize: 20, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(color: stressColor.withOpacity(0.15), borderRadius: BorderRadius.circular(100)),
                child: Text('${isKo ? '상태' : 'Status'}: $statusLabel',
                    style: GoogleFonts.notoSansKr(color: stressColor, fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
          const SizedBox(height: 32),

          // Pulse Wave
          Text(isKo ? '실시간 맥파' : 'Pulse Wave',
              style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Container(
            height: 120, width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: CustomPaint(
              painter: _PulseWavePainter(animationValue: _pulseController.value, color: const Color(0xFFFB7185)),
            ),
          ),
          const SizedBox(height: 28),

          // Stats Grid
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 1.35,
            children: [
              _statCard(isKo ? '체온' : 'Body Temp', _bodyTemp.toStringAsFixed(1), '°C', Icons.thermostat_outlined, const Color(0xFFFB7185)),
              _statCard(isKo ? '혈압' : 'Blood Pressure', '$_bpSys/$_bpDia', 'mmHg', Icons.bloodtype_outlined, const Color(0xFF60A5FA)),
              _statCard(isKo ? '호흡수' : 'Respiration', '$_respRate', '/min', Icons.air_outlined, const Color(0xFF34D399)),
              _statCard(isKo ? '스트레스' : 'Stress', '$_stressIndex', '%', Icons.psychology_outlined, const Color(0xFFFBBF24)),
              _statCard('HRV', '$_hrv', 'ms', Icons.monitor_heart_outlined, const Color(0xFFA78BFA)),
            ],
          ),
          const SizedBox(height: 20),

          // AI Insight
          _aiInsightCard(isKo),
        ],
      ),
    );
  }

  Widget _statCard(String title, String value, String unit, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Expanded(child: Text(title, style: GoogleFonts.notoSansKr(color: TuflyTheme.silver, fontSize: 11), overflow: TextOverflow.ellipsis)),
          ]),
          const SizedBox(height: 12),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(child: FittedBox(
                  fit: BoxFit.scaleDown, alignment: Alignment.bottomLeft,
                  child: Text(value, style: GoogleFonts.outfit(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1)),
                )),
                const SizedBox(width: 4),
                Padding(padding: const EdgeInsets.only(bottom: 2),
                  child: Text(unit, style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _aiInsightCard(bool isKo) {
    final String defaultInsight;
    if (_stressIndex < 40) {
      defaultInsight = isKo
          ? '현재 심박 패턴이 안정적입니다. 이 상태로 훈련에 임하면 좋은 퍼포먼스를 기대할 수 있습니다.'
          : 'Your vitals are stable. Maintaining this state should yield excellent performance.';
    } else if (_stressIndex < 70) {
      defaultInsight = isKo
          ? '스트레스 수치가 상승했습니다. 충분한 수면과 회복이 필요합니다.'
          : 'Stress is elevated. Prioritise rest and recovery tonight.';
    } else {
      defaultInsight = isKo
          ? '높은 스트레스가 감지됩니다. AI 상담 또는 멘탈 트레이닝을 권장합니다.'
          : 'High stress detected. Consider an AI counseling session or mental training.';
    }

    final displayInsight = _aiShortInsight.isNotEmpty ? _aiShortInsight : defaultInsight;

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BiometricAiInsightDetailScreen(
              bpm: _bpm,
              hrv: _hrv,
              stressIndex: _stressIndex,
              bodyTemp: _bodyTemp,
              bpSys: _bpSys,
              bpDia: _bpDia,
              respRate: _respRate,
              sleepRecords: _sleepRecords,
              isKo: isKo,
              isSimulated: _vitalsSimulated,
            ),
          ),
        );
      },
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [TuflyTheme.primary.withOpacity(0.15), Colors.transparent]),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: TuflyTheme.primary.withOpacity(0.3)),
        ),
        child: Row(children: [
          Container(padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: TuflyTheme.primary.withOpacity(0.1), shape: BoxShape.circle),
            child: _generatingInsight
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(color: TuflyTheme.primary, strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome_rounded, color: TuflyTheme.primary, size: 20)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(isKo ? 'AI 인사이트' : 'AI Insight',
                        style: GoogleFonts.notoSansKr(color: TuflyTheme.primary, fontSize: 12, fontWeight: FontWeight.w700)),
                    if (_vitalsSimulated) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: Colors.amber.withOpacity(0.4), width: 0.5),
                        ),
                        child: Text(
                          isKo ? '추정 데이터' : 'Estimated',
                          style: GoogleFonts.notoSansKr(
                            color: Colors.amber,
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                Icon(Icons.arrow_forward_ios_rounded, color: TuflyTheme.primary.withOpacity(0.7), size: 12),
              ],
            ),
            const SizedBox(height: 4),
            Text(displayInsight, style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 13, height: 1.5)),
          ])),
        ]),
      ),
    );
  }

  // ─── TAB 2: SLEEP ────────────────────────────────────────────────────────

  Widget _buildSleepTab(bool isKo) {
    if (_sleepLoading) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const CircularProgressIndicator(color: Color(0xFFA78BFA)),
        const SizedBox(height: 16),
        Text(isKo ? 'Apple Health에서 수면 데이터 불러오는 중...' : 'Loading sleep data from Apple Health...',
            style: GoogleFonts.notoSansKr(color: Colors.white38, fontSize: 13)),
      ]));
    }

    if (_sleepPermissionDenied) {
      return _buildSleepPermissionPrompt(isKo);
    }

    if (_sleepRecords.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.nightlight_round, color: Colors.white24, size: 40),
              const SizedBox(height: 16),
              Text(
                isKo ? '기록된 수면 데이터가 없습니다.' : 'No sleep data found.',
                style: GoogleFonts.notoSansKr(color: Colors.white54, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Text(
                isKo ? 'Apple Health 앱에서 수면 데이터가 있는지 확인해주세요.' : 'Please make sure sleep data is logged in Apple Health.',
                style: GoogleFonts.notoSansKr(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    final latest = _sleepRecords.first;
    final avgSleep = _sleepRecords.take(7).map((r) => r.hoursAsleep).reduce((a, b) => a + b) / _sleepRecords.take(7).length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Last night hero
          Container(
            width: double.infinity, padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2D1B69), Color(0xFF1a0f3d)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFA78BFA).withOpacity(0.3)),
            ),
            child: Column(children: [
              Text(isKo ? '어젯밤 수면' : 'Last Night', style: GoogleFonts.notoSansKr(color: const Color(0xFFA78BFA), fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(latest.hoursAsleep.toStringAsFixed(1),
                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 60, fontWeight: FontWeight.w800, height: 1)),
                  const SizedBox(width: 8),
                  Text(isKo ? '시간' : 'hrs', style: GoogleFonts.outfit(color: Colors.white38, fontSize: 20, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 10),
              _sleepQualityBadge(latest.quality, isKo),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                _sleepMiniStat(isKo ? '침대 시간' : 'In Bed', '${latest.hoursInBed.toStringAsFixed(1)}h', const Color(0xFFA78BFA)),
                _sleepMiniStat(isKo ? '7일 평균' : '7-day Avg', '${avgSleep.toStringAsFixed(1)}h', const Color(0xFF60A5FA)),
                _sleepMiniStat(isKo ? '기록 수' : 'Records', '${_sleepRecords.length}', const Color(0xFF34D399)),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          // Apple Health badge
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFFB7185).withOpacity(0.1),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: const Color(0xFFFB7185).withOpacity(0.25)),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.favorite, color: Color(0xFFFB7185), size: 13),
                const SizedBox(width: 5),
                Text('Apple Health', style: GoogleFonts.outfit(color: const Color(0xFFFB7185), fontSize: 11, fontWeight: FontWeight.w600)),
              ]),
            ),
            const SizedBox(width: 8),
            Text(isKo ? '에서 동기화됨' : 'synced', style: GoogleFonts.notoSansKr(color: Colors.white38, fontSize: 11)),
          ]),
          const SizedBox(height: 16),

          // 14-day history list
          Text(isKo ? '최근 수면 기록' : 'Recent Sleep History',
              style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ..._sleepRecords.take(10).map((r) => _sleepHistoryRow(r, isKo)),
          const SizedBox(height: 20),

          // Sleep tips
          _sleepTipsCard(isKo, avgSleep),
        ],
      ),
    );
  }

  Widget _sleepQualityBadge(String quality, bool isKo) {
    final color = quality == 'Good'
        ? const Color(0xFF10B981)
        : quality == 'Fair' ? const Color(0xFFFBBF24) : const Color(0xFFFB7185);
    final label = quality == 'Good'
        ? (isKo ? '숙면' : 'Good Sleep')
        : quality == 'Fair' ? (isKo ? '보통' : 'Fair') : (isKo ? '부족' : 'Poor');
    final icon = quality == 'Good'
        ? Icons.battery_full_rounded
        : quality == 'Fair' ? Icons.battery_3_bar_rounded : Icons.battery_alert_rounded;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(100)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: GoogleFonts.notoSansKr(color: color, fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _sleepMiniStat(String label, String value, Color color) {
    return Column(children: [
      Text(value, style: GoogleFonts.outfit(color: color, fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 2),
      Text(label, style: GoogleFonts.notoSansKr(color: Colors.white38, fontSize: 11)),
    ]);
  }

  Widget _sleepHistoryRow(SleepRecord r, bool isKo) {
    final color = r.quality == 'Good'
        ? const Color(0xFF10B981)
        : r.quality == 'Fair' ? const Color(0xFFFBBF24) : const Color(0xFFFB7185);
    final dateStr = '${r.date.month}/${r.date.day}';
    final barWidth = (r.hoursAsleep / 10.0).clamp(0.0, 1.0);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(children: [
        SizedBox(width: 36, child: Text(dateStr, style: GoogleFonts.outfit(color: Colors.white38, fontSize: 12))),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: barWidth,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ])),
        const SizedBox(width: 10),
        Text('${r.hoursAsleep}h', style: GoogleFonts.outfit(color: color, fontSize: 14, fontWeight: FontWeight.w700)),
      ]),
    );
  }

  Widget _buildSleepPermissionPrompt(bool isKo) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: const Color(0xFFA78BFA).withOpacity(0.1), shape: BoxShape.circle),
            child: const Icon(Icons.nightlight_round, color: Color(0xFFA78BFA), size: 40),
          ),
          const SizedBox(height: 20),
          Text(isKo ? 'Apple Health 수면 데이터' : 'Apple Health Sleep Data',
              style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Text(
            isKo
                ? 'Apple Health의 수면 기록에 접근하려면 권한이 필요합니다.\n아이폰에서 설정 → 개인 정보 보호 → 건강을 열어 Tufly에 수면 읽기 권한을 부여해주세요.'
                : 'Permission is required to read your sleep data from Apple Health.\nGo to Settings → Privacy → Health → Tufly and enable Sleep read access.',
            style: GoogleFonts.notoSansKr(color: Colors.white54, fontSize: 13, height: 1.6),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                setState(() => _sleepLoading = true);
                await _loadSleep();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFA78BFA),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(isKo ? '다시 시도' : 'Try Again',
                  style: GoogleFonts.notoSansKr(fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _sleepTipsCard(bool isKo, double avgSleep) {
    final tips = avgSleep >= 7
        ? (isKo ? '평균 수면이 양호합니다! 취침·기상 시간을 일정하게 유지하면 더욱 좋습니다.' : 'Your avg sleep is solid! Keeping a consistent schedule will optimise recovery.')
        : (isKo ? '평균 수면이 권장치(7시간)보다 부족합니다. 취침 전 화면 사용을 줄이고 루틴을 만들어보세요.' : 'Your avg sleep is below the recommended 7 hrs. Reduce screen time before bed and build a wind-down routine.');
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [const Color(0xFFA78BFA).withOpacity(0.12), Colors.transparent]),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFA78BFA).withOpacity(0.25)),
      ),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: const Color(0xFFA78BFA).withOpacity(0.1), shape: BoxShape.circle),
          child: const Icon(Icons.tips_and_updates_outlined, color: Color(0xFFA78BFA), size: 20)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(isKo ? '수면 인사이트' : 'Sleep Insight',
              style: GoogleFonts.notoSansKr(color: const Color(0xFFA78BFA), fontSize: 12, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(tips, style: GoogleFonts.notoSansKr(color: Colors.white, fontSize: 13, height: 1.5)),
        ])),
      ]),
    );
  }
}

// ─── Pulse Wave Painter ───────────────────────────────────────────────────────
class _PulseWavePainter extends CustomPainter {
  final double animationValue;
  final Color color;
  _PulseWavePainter({required this.animationValue, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..strokeWidth = 2.5..style = PaintingStyle.stroke..strokeCap = StrokeCap.round;
    final path = Path();
    final mid = size.height / 2;
    path.moveTo(0, mid);
    const segments = 6;
    final sw = size.width / segments;
    for (int i = 0; i < segments; i++) {
      final x = i * sw;
      path.lineTo(x + sw * 0.3, mid);
      path.lineTo(x + sw * 0.4, mid + size.height * 0.1);
      path.lineTo(x + sw * 0.5, mid - size.height * 0.4);
      path.lineTo(x + sw * 0.6, mid + size.height * 0.2);
      path.lineTo(x + sw * 0.7, mid - size.height * 0.1);
      path.lineTo(x + sw * 0.8, mid);
      path.lineTo(x + sw, mid);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _PulseWavePainter old) => old.animationValue != animationValue;
}
