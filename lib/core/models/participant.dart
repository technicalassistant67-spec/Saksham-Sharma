/// SafeCross Participant & Location Models

enum UserRole { pedestrian, driver }

enum SpeedSource { gpsSpeed, estimated, unavailable }

enum DirectionStatus { approaching, movingAway, notApproaching, stationary }

enum RiskLevel { red, amber, grey, green }

class LocationFix {
  final double lat;
  final double lng;
  final double accuracy;
  final double? speed;
  final double? heading;
  final int timestamp;

  LocationFix({
    required this.lat,
    required this.lng,
    required this.accuracy,
    this.speed,
    this.heading,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'accuracy': accuracy,
        'speed': speed,
        'heading': heading,
      };

  factory LocationFix.fromJson(Map<String, dynamic> json) => LocationFix(
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        accuracy: (json['accuracy'] as num).toDouble(),
        speed: (json['speed'] as num?)?.toDouble(),
        heading: (json['heading'] as num?)?.toDouble(),
        timestamp: json['serverTs'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      );
}

class Participant {
  final String sessionId;
  final UserRole role;
  LocationFix currentFix;
  List<LocationFix> history;
  double? smoothedSpeed;
  SpeedSource speedSource;
  double? derivedHeading;
  int lastUpdateServerTs;

  Participant({
    required this.sessionId,
    required this.role,
    required this.currentFix,
    required this.history,
    this.smoothedSpeed,
    this.speedSource = SpeedSource.unavailable,
    this.derivedHeading,
    required this.lastUpdateServerTs,
  });

  bool get isStale =>
      (DateTime.now().millisecondsSinceEpoch - lastUpdateServerTs) > 10000;

  bool get isExpired =>
      (DateTime.now().millisecondsSinceEpoch - lastUpdateServerTs) > 60000;

  double get dataAgeSeconds =>
      (DateTime.now().millisecondsSinceEpoch - lastUpdateServerTs) / 1000.0;
}
