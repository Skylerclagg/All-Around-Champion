import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

void main() => runApp(const AllAroundApp());

class AllAroundApp extends StatelessWidget {
  const AllAroundApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'All-Around Eligibility',
        theme: ThemeData.dark(useMaterial3: true),
        home: const EligibilityPage(),
        debugShowCheckedModeBanner: false,
      );
}

// ---------------------------------------------
// Models
// ---------------------------------------------

class Ranking {
  final int teamId;
  final int rank;

  Ranking({required this.teamId, required this.rank});

  factory Ranking.fromJson(Map<String, dynamic> j) => Ranking(
        teamId: (j['team'] as Map<String, dynamic>)['id'] as int,
        rank: j['rank'] as int? ?? -1,
      );
}


class EventInfo {
  final int id;
  final String sku;
  final String name;
  final DateTime start;

  EventInfo({
    required this.id,
    required this.sku,
    required this.name,
    required this.start,
  });

  factory EventInfo.fromJson(Map<String, dynamic> j) => EventInfo(
        id: j['id'] as int,
        sku: j['sku'] as String? ?? '',
        name: j['name'] as String? ?? '',
        start: DateTime.parse(j['start'] as String),
      );

  @override
  bool operator ==(Object o) => o is EventInfo && o.id == id && o.sku == sku;
  @override
  int get hashCode => id.hashCode ^ sku.hashCode;
}

class Division {
  final int id;
  final String name;
  Division({required this.id, required this.name});
  factory Division.fromJson(Map<String, dynamic> j) => Division(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
      );
}

class Team {
  final int id;
  final String number;
  final String name;
  final String grade;
  Team({
    required this.id,
    required this.number,
    required this.name,
    required this.grade,
  });
  factory Team.fromJson(Map<String, dynamic> j) => Team(
        id: j['id'] as int,
        number: j['number'] as String? ?? '',
        name: j['team_name'] as String? ?? '',
        grade: j['grade'] as String? ?? '',
      );
}

class RawSkill {
  final int teamId;
  final int rank;
  final int programmingScore;
  final int driverScore;
  RawSkill({
    required this.teamId,
    required this.rank,
    required this.programmingScore,
    required this.driverScore,
  });
  factory RawSkill.fromJson(Map<String, dynamic> j) {
    final tid = (j['team'] as Map<String, dynamic>)['id'] as int;
    final type = j['type'] as String? ?? '';
    final score = (j['score'] as int?) ?? 0;
    return RawSkill(
      teamId: tid,
      rank: (j['rank'] as int?) ?? -1,
      programmingScore: type == 'programming' ? score : 0,
      driverScore: type == 'driver' ? score : 0,
    );
  }
}

class Award {
  final String title;
  Award({required this.title});
  factory Award.fromJson(Map<String, dynamic> j) =>
      Award(title: j['title'] as String? ?? '');
}

class TeamSkills {
  final Team team;
  final int qualifierRank;
  final int skillsRank;
  final int programmingScore;
  final int driverScore;
  final bool eligible;
  final bool inRank;
  final bool inSkill;
  TeamSkills({
    required this.team,
    required this.qualifierRank,
    required this.skillsRank,
    required this.programmingScore,
    required this.driverScore,
    required this.eligible,
    required this.inRank,
    required this.inSkill,
  });
}

// ---------------------------------------------
// API Service
// ---------------------------------------------

class RobotEventsApiService {
  static const _base = 'https://www.robotevents.com/api/v2';
  static const _token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiYTYwYjQ3MmRiYTM0YWQ3ZWYzY2NjMzQwYTJhNzFjODU3NzFlZWMzODdjOTUwOGMzNzZiYzNhYjYzMzFjNjAzOTc2ZDhiNjZhNGQ2NjBiODUiLCJpYXQiOjE3NDQ4NDQ0NDguMzM5MTY3MSwibmJmIjoxNzQ0ODQ0NDQ4LjMzOTE2OSwiZXhwIjoyNjkxNTI5MjQ4LjMzNDE2Niwic3ViIjoiNDM5MDAiLCJzY29wZXMiOltdfQ.IBhEgzW--z2Z6lKUAtVY6LMUEoKinTB3gpyrkxOzosCo1UW4poY_YUZnFbV062oIrqqkCRXKH4SaI7qVfoIucPu9UHqT8ITeib9pI7UsGe9Of_bKbVcCaMBKDOXbJ5S0gzc3Wo4kFXwpkDME0E89ZzFep1LwXYCLKh0n0uKFslycDl9GOg8cgHXIT6gXkL-Y9XmD5giGp38a89zgbtfigcX5zSSYFuCkMo3Xz_xnHIa6Mae3fY1YIgOElLoB7WBRJrQ5gQsZMURaSH0iyaqIsVcMHpzRUWwTAPr4UQHkgt0cecBTuh5dpn15Iw67eoMA7YnZzD4euT_GmJkBzHeoiZfIlMdUJTLJQvLXXPAAoFg7j1SG6moPrPa9zJXtJWAPTK_QtdA7PdpmemJA9Ya6sQ0BdRn5imUdIRjit9D4R2a9OlQ-FG2YdSTDU203FojYrRXp0WQSBOx_mWUAfl94bCk75rdZo4nLKRdk76VEWIp-DeKAbOOm7MFC44gaYTJERZk4lOCA988imyxvkwfd19fQsYEECoFj2mlwOn0kWpZoYAylAYOgDfSmAcyzDkKOZaleNv1c32LXQzRtRGcbptCxVuHbZow_gWHs-avjMmgHzqzmlu7PCxOCVkXfZPxa5YeFAWPWqT8QliKH8ajsX_ZgDNlGoNYXiApfio8cWmw';
  static const _prog = 44;
  static const _season = 192;

  Future<List<T>> _getList<T>(
      String path, T Function(Map<String, dynamic>) fromJson) async {
    final uri = Uri.parse('$_base$path');
    final resp = await http.get(uri, headers: {
      'Authorization': 'Bearer $_token',
      'Content-Type': 'application/json',
    });
    if (resp.statusCode != 200) {
      throw Exception('API $path failed: ${resp.statusCode}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    return (body['data'] as List<dynamic>)
        .map((e) => fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<EventInfo>> fetchEvents() => _getList(
      '/events?program[]=$_prog&season[]=$_season&per_page=250',
      EventInfo.fromJson);

  Future<EventInfo?> fetchEventBySku(String sku) => _getList(
          '/events?sku[]=$sku&program[]=$_prog&season[]=$_season&per_page=250',
          EventInfo.fromJson)
      .then((l) => l.isEmpty ? null : l.first);

  Future<List<Division>> fetchDivisions(int eId) async {
    final uri = Uri.parse('$_base/events/$eId');
    final resp = await http.get(uri, headers: {
      'Authorization': 'Bearer $_token',
      'Content-Type': 'application/json',
    });
    if (resp.statusCode != 200) {
      throw Exception('Event/$eId failed: ${resp.statusCode}');
    }
    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    return (json['divisions'] as List<dynamic>? ?? [])
        .map((d) => Division.fromJson(d as Map<String, dynamic>))
        .toList();
  }

  Future<List<Team>> fetchTeams(int eId) =>
      _getList('/events/$eId/teams?per_page=250', Team.fromJson);

  Future<List<RawSkill>> fetchRawSkills(int eId) =>
      _getList('/events/$eId/skills?per_page=250', RawSkill.fromJson);

  Future<List<Award>> fetchAwards(int eId) =>
      _getList('/events/$eId/awards?per_page=250', Award.fromJson);

  Future<List<Ranking>> fetchRankings(int eId, int divId) async {
  List<Ranking> all = [];
  int page = 1;

  while (true) {
    final uri = Uri.parse(
      '$_base/events/$eId/divisions/$divId/rankings?page=$page&per_page=250',
    );
    final resp = await http.get(uri, headers: {
      'Authorization': 'Bearer $_token',
      'Content-Type': 'application/json',
    });

    if (resp.statusCode != 200) {
      print('❌ Rankings API error (${resp.statusCode}): ${resp.body}');
      throw Exception('Failed to fetch rankings');
    }

    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    final data = json['data'] as List<dynamic>;

    if (data.isEmpty) break;

    all.addAll(data.map((e) => Ranking.fromJson(e as Map<String, dynamic>)));
    if (data.length < 250) break;

    print('📄 Fetched page $page with ${data.length} rankings');
    page++;
  }

  print('✅ Total rankings fetched: ${all.length}');
  return all;
}

}

// ---------------------------------------------
// UI
// ---------------------------------------------

class EligibilityPage extends StatefulWidget {
  const EligibilityPage({super.key});
  @override
  State<EligibilityPage> createState() => _EligibilityPageState();
}

class _EligibilityPageState extends State<EligibilityPage> {
  final api = RobotEventsApiService();
  final skuCtrl = TextEditingController();
  final searchCtrl = TextEditingController();
  late final FocusNode _keyFocusNode;

  List<EventInfo> events = [];
  EventInfo? selectedEvent;
  List<Division> divisions = [];
  Division? selectedDivision;

  List<Team> teams = [];
  List<Ranking> rawRankings = [];
  List<RawSkill> rawSkills = [];
  List<Award> awards = [];

  bool loading = false;
  String? error;

  bool hideNoData = false;

  @override
  void initState() {
    super.initState();
    _keyFocusNode = FocusNode();
    _loadEvents();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _keyFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _keyFocusNode.dispose();
    skuCtrl.dispose();
    searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadEvents() async {
  try {
    final all = await api.fetchEvents();
    final oneWeekAgo = DateTime.now().subtract(const Duration(days: 7));

    // Filter: Only events that start on or after 1 week ago
    events = all.where((e) => e.start.isAfter(oneWeekAgo)).toList();

    setState(() {});
  } catch (e, st) {
    print('❌ fetchEvents: $e\n$st');
    setState(() => error = 'Failed to load events');
  }
}


  Future<void> _loadAll(int eId) async {
    setState(() {
      loading = true;
      error = null;
      divisions = [];
      selectedDivision = null;
      teams = [];
      rawRankings = [];
      rawSkills = [];
      awards = [];
    });
    try {
      divisions = await api.fetchDivisions(eId);
      if (divisions.isEmpty) throw Exception('No divisions found');
      selectedDivision = divisions.first;

      teams = await api.fetchTeams(eId);
      rawRankings = await api.fetchRankings(eId, selectedDivision!.id);
      rawSkills = await api.fetchRawSkills(eId);
      awards = await api.fetchAwards(eId);

      setState(() {});
    } catch (e, st) {
      print('❌ _loadAll: $e\n$st');
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
    final rankingTeamIds = rawRankings.map((r) => r.teamId).toSet();
final teamIds = teams.map((t) => t.id).toSet();

final missingFromTeams = rankingTeamIds.difference(teamIds);
final missingFromRankings = teamIds.difference(rankingTeamIds);

print('🧮 Total teams: ${teams.length}');
print('📈 Total rankings: ${rawRankings.length}');
print('❗ Teams in rankings but NOT in teams list: ${missingFromTeams.length}');
print('❗ Teams in teams list but NOT in rankings list: ${missingFromRankings.length}');

for (final tid in missingFromTeams) {
  print('  ⚠️ Missing team object for ranking teamId: $tid');
}

  }

  bool get isCombined {
    final a = awards.where((w) => w.title.contains('All-Around Champion'));
    final ms = a.any((w) => w.title.contains('Middle School'));
    final hs = a.any((w) => w.title.contains('High School'));
    return !(ms && hs);
  }

  double get threshold => 0.5;

List<TeamSkills> get tableRecords {
  final skillMap = <int, RawSkill>{};
  for (var s in rawSkills) {
    if (skillMap.containsKey(s.teamId)) {
      final ex = skillMap[s.teamId]!;
      final bestRank = ex.rank < 0 || (s.rank >= 0 && s.rank < ex.rank)
          ? s.rank
          : ex.rank;
      skillMap[s.teamId] = RawSkill(
        teamId: s.teamId,
        rank: bestRank,
        programmingScore: ex.programmingScore + s.programmingScore,
        driverScore: ex.driverScore + s.driverScore,
      );
    } else {
      skillMap[s.teamId] = s;
    }
  }

  final teamMap = {for (var t in teams) t.id: t};
  final isMSHS = !isCombined;

  return teamMap.values.map((t) {
    final s = skillMap[t.id] ??
        RawSkill(teamId: t.id, rank: -1, programmingScore: 0, driverScore: 0);

    final rEntry = rawRankings.firstWhere(
      (r) => r.teamId == t.id,
      orElse: () => Ranking(teamId: t.id, rank: -1),
    );

    if (!isMSHS) {
      final cut = rawRankings.isEmpty
          ? 0
          : (rawRankings.length * threshold).ceil().clamp(1, rawRankings.length);
      final inRank = rEntry.rank > 0 && rEntry.rank <= cut;

      final sortedSkills = skillMap.values.toList()
        ..sort((a, b) => a.rank.compareTo(b.rank));
      final skillIndex = sortedSkills.indexWhere((sr) => sr.teamId == t.id);
      final skillsRankComputed = skillIndex >= 0 ? skillIndex + 1 : -1;

      final inSkill = s.rank > 0 && s.rank <= cut;
      final hasProg = s.programmingScore > 0;
      final hasDrv = s.driverScore > 0;
      final eligible = inRank && inSkill && hasProg && hasDrv;

      return TeamSkills(
        team: t,
        qualifierRank: rEntry.rank > 0 ? rEntry.rank : -1,
        skillsRank: skillsRankComputed,
        programmingScore: s.programmingScore,
        driverScore: s.driverScore,
        eligible: eligible,
        inRank: inRank,
        inSkill: inSkill,
      );
    } else {
      final grade = t.grade.toLowerCase();
      final gradeRankings = rawRankings.where((r) {
        final tm = teamMap[r.teamId];
        return tm != null && tm.grade.toLowerCase() == grade;
      }).toList()
        ..sort((a, b) => a.rank.compareTo(b.rank));

      final cutoff = max(1, (gradeRankings.length * threshold).ceil());
      final inRankIds = gradeRankings
          .take(cutoff)
          .map((r) => r.teamId)
          .toSet();

      final gradeSkills = skillMap.values.where((s) {
        final tm = teamMap[s.teamId];
        return tm != null && tm.grade.toLowerCase() == grade;
      }).toList()
        ..sort((a, b) => a.rank.compareTo(b.rank));

      final skillIndex = gradeSkills.indexWhere((sr) => sr.teamId == t.id);
      final skillsRankComputed = skillIndex >= 0 ? skillIndex + 1 : -1;

      final hasProg = s.programmingScore > 0;
      final inRank = inRankIds.contains(t.id);
      final inSkill = skillsRankComputed > 0 && skillsRankComputed <= cutoff;
      final eligible = inRank && hasProg && inSkill;

      return TeamSkills(
        team: t,
        qualifierRank: rEntry.rank > 0 ? rEntry.rank : -1,
        skillsRank: skillsRankComputed,
        programmingScore: s.programmingScore,
        driverScore: s.driverScore,
        eligible: eligible,
        inRank: inRank,
        inSkill: inSkill,
      );
    }
  }).toList();
}

  String _fmt(int r) => r < 0 ? 'No Data' : '#$r';

  Widget _buildSummary(String? grade) {
    final cutoff = isCombined
      ? rawRankings.isEmpty
          ? 0
          : (rawRankings.length * threshold)
              .ceil()
              .clamp(1, rawRankings.length)
      : () {
          final g = grade!.toLowerCase();
          final cnt = rawRankings.where((qr) {
            final tm = teams.firstWhere((tt) => tt.id == qr.teamId);
            return tm.grade.toLowerCase() == g;
          }).length;
          return max(1, (cnt * threshold).ceil());
        }();

    final eligibleNums = (isCombined
            ? tableRecords
            : tableRecords
                .where((ts) =>
                    ts.team.grade.toLowerCase() == grade!.toLowerCase()))
        .where((ts) => ts.eligible)
        .map((ts) => ts.team.number)
        .toList();
    final eligibleText =
        eligibleNums.isEmpty ? 'None' : eligibleNums.join(', ');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Qualifying rank cutoff: $cutoff',
            style: const TextStyle(color: Colors.white70)),
        Text('Skills rank cutoff: $cutoff',
            style: const TextStyle(color: Colors.white70)),
        Text('Eligible teams: $eligibleText',
            style: const TextStyle(color: Colors.white70)),
      ]),
    );
  }

  Widget _tableTitle(String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(text,
            style: const TextStyle(
                fontWeight: FontWeight.bold, fontSize: 18)),
      );

  Widget _buildHeaderRow() {
    return Container(
      color: Colors.grey[850],
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: const [
        Expanded(flex: 1, child: _TblHdr('Team #')),
        Expanded(flex: 2, child: _TblHdr('Name')),
        Expanded(flex: 1, child: _TblHdr('Qualifier')),
        Expanded(flex: 1, child: _TblHdr('Skills')),
        Expanded(flex: 1, child: _TblHdr('Piloting')),
        Expanded(flex: 1, child: _TblHdr('Auton.')),
      ]),
    );
  }

  Widget _buildDataRow(TeamSkills rec) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      color: rec.eligible
          ? Colors.green.withOpacity(0.1)
          : Colors.red.withOpacity(0.1),
      child: Row(children: [
        Expanded(
            flex: 1,
            child: _TblCell(rec.team.number,
                color: rec.eligible ? Colors.green : Colors.red)),
        Expanded(
            flex: 2,
            child: _TblCell(rec.team.name,
                color: rec.eligible ? Colors.green : Colors.red)),
        Expanded(
            flex: 1,
            child: _TblCell(_fmt(rec.qualifierRank),
                color: rec.inRank ? Colors.green : Colors.red)),
        Expanded(
            flex: 1,
            child: _TblCell(_fmt(rec.skillsRank),
                color: rec.inSkill ? Colors.green : Colors.red)),
        Expanded(flex: 1, child: _TblCell(rec.driverScore.toString())),
        Expanded(
            flex: 1, child: _TblCell(rec.programmingScore.toString())),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filter = searchCtrl.text.toLowerCase();
    final all = tableRecords
        .where((rec) => rec.team.number.toLowerCase().contains(filter))
        .toList();
    final msList =
        all.where((rec) => rec.team.grade == 'Middle School').toList();
    final hsList =
        all.where((rec) => rec.team.grade != 'Middle School').toList();

    final displayedAll = hideNoData
        ? all.where((r) => !(r.qualifierRank < 0 && r.skillsRank < 0))
            .toList()
        : all;
    final displayedMs = hideNoData
        ? msList.where((r) => !(r.qualifierRank < 0 && r.skillsRank < 0))
            .toList()
        : msList;
    final displayedHs = hideNoData
        ? hsList.where((r) => !(r.qualifierRank < 0 && r.skillsRank < 0))
            .toList()
        : hsList;

    return RawKeyboardListener(
      focusNode: _keyFocusNode,
      onKey: (e) {
        if (e is RawKeyDownEvent &&
            e.logicalKey == LogicalKeyboardKey.f2 &&
            selectedEvent != null) {
          _loadAll(selectedEvent!.id);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('All-Around Champion Eligibility'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: selectedEvent != null
                  ? () => _loadAll(selectedEvent!.id)
                  : null,
            )
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Column(children: [
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: skuCtrl,
                        decoration: const InputDecoration(
                            hintText: 'Event SKU',
                            border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () async {
                        final sku = skuCtrl.text.trim();
                        final f = await api.fetchEventBySku(sku);
                        if (f != null) {
                          if (!events.any((e) => e.id == f.id)) {
                            setState(() => events.insert(0, f));
                          }
                          setState(() => selectedEvent = f);
                          await _loadAll(f.id);
                        }
                      },
                      child: const Text('Load SKU'),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: DropdownButtonFormField<EventInfo>(
                        decoration: InputDecoration(
                          labelText: 'Select Event',
                          border: OutlineInputBorder(),
                          suffixIcon: const Icon(Icons.event),
                        ),
                        isExpanded: true,
                        value: selectedEvent,
                        items: events.map((e) {
                          final dateLabel =
                              '${e.start.month}/${e.start.day}/${e.start.year}';
                          return DropdownMenuItem(
                            value: e,
                            child:
                                Text('${e.sku} – ${e.name} ($dateLabel)'),
                          );
                        }).toList(),
                        onChanged: (e) async {
                          if (e != null) {
                            setState(() => selectedEvent = e);
                            await _loadAll(e.id);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    if (divisions.isNotEmpty)
                      Expanded(
                        child: DropdownButtonFormField<Division>(
                          decoration: InputDecoration(
                            labelText: 'Select Division',
                            border: OutlineInputBorder(),
                          ),
                          isExpanded: true,
                          value: selectedDivision,
                          items: divisions
                              .map((d) => DropdownMenuItem(
                                    value: d,
                                    child: Text(d.name),
                                  ))
                              .toList(),
                          onChanged: (d) async {
                            if (d != null && selectedEvent != null) {
                              setState(() => selectedDivision = d);
                              await _loadAll(selectedEvent!.id);
                            }
                          },
                        ),
                      ),
                  ]),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchCtrl,
                    decoration: const InputDecoration(
                        hintText: 'Filter team #…',
                        border: OutlineInputBorder()),
                    onChanged: (_) => setState(() {}),
                  ),
                  if (loading) const LinearProgressIndicator(),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Text("Hide Teams with no data in both Qualifying Rankings and Skills Rankings"),
                      Switch(
                        value: hideNoData,
                        onChanged: (v) =>
                            setState(() => hideNoData = v),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ]),
              ),

              if (isCombined) ...[
                SliverToBoxAdapter(child: _tableTitle('All Teams')),
                SliverToBoxAdapter(child: _buildSummary(null)),
                SliverToBoxAdapter(child: _buildHeaderRow()),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildDataRow(displayedAll[i]),
                    childCount: displayedAll.length,
                  ),
                ),
              ] else ...[
                SliverToBoxAdapter(child: _tableTitle('Middle School')),
                SliverToBoxAdapter(
                    child: _buildSummary('Middle School')),
                SliverToBoxAdapter(child: _buildHeaderRow()),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildDataRow(displayedMs[i]),
                    childCount: displayedMs.length,
                  ),
                ),
                SliverToBoxAdapter(child: const SizedBox(height: 24)),
                SliverToBoxAdapter(child: _tableTitle('High School')),
                SliverToBoxAdapter(
                    child: _buildSummary('High School')),
                SliverToBoxAdapter(child: _buildHeaderRow()),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildDataRow(displayedHs[i]),
                    childCount: displayedHs.length,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// Table header cell
class _TblHdr extends StatelessWidget {
  final String text;
  const _TblHdr(this.text);
  @override
  Widget build(BuildContext c) => Padding(
        padding: const EdgeInsets.all(8),
        child: Text(text,
            style: const TextStyle(
                fontWeight: FontWeight.bold, color: Colors.white)),
      );
}

// Table data cell
class _TblCell extends StatelessWidget {
  final String text;
  final Color? color;
  const _TblCell(this.text, {this.color});
  @override
  Widget build(BuildContext c) => Padding(
        padding: const EdgeInsets.all(6),
        child: Text(text,
            style: TextStyle(color: color ?? Colors.white, fontSize: 14)),
      );
}
