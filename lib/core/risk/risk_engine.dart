import 'dart:math' as math;
import '../config/thresholds.dart';
import '../models/participant.dart';
import '../geo/haversine.dart';
import '../geo/projection.dart';

class VehicleRiskAssessment {
  final String sessionId;
  final double distanceMeters;
  final double closingSpeedMs;
  final DirectionStatus direction;
  final double? etaSeconds;
  final double? uncertaintySeconds;
  final double speedMs;
  final SpeedSource speedSource;
  final double? heading;
  final double dataAgeSeconds;
  final double? missDistanceMeters;
  final bool hasPathConflict;

  VehicleRiskAssessment({
    required this.sessionId,
    required this.distanceMeters,
    required this.closingSpeedMs,
    required this.direction,
    this.etaSeconds,
    this.uncertaintySeconds,
    required this.speedMs,
    required this.speedSource,
    this.heading,
    required this.dataAgeSeconds,
    this.missDistanceMeters,
    required this.hasPathConflict,
  });
}

class CrossingAssessment {
  final RiskLevel level;
  final String title;
  final String description;
  final VehicleRiskAssessment? primaryVehicle;
  final List<VehicleRiskAssessment> allVehicles;
  final String disclaimer;

  CrossingAssessment({
    required this.level,
    required this.title,
    required this.description,
    this.primaryVehicle,
    required this.allVehicles,
    this.disclaimer =
        'SafeCross only detects phones running this app. Other vehicles, bikes and people are NOT shown. Always look, listen and follow traffic signals.',
  });
}

class RiskEngine {
  static VehicleRiskAssessment assessVehicle(
      LocationFix pedFix, Participant vehicle) {
    final vFix = vehicle.currentFix;
    final dist = haversineDistance(pedFix.lat, pedFix.lng, vFix.lat, vFix.lng);
    final speed = vehicle.smoothedSpeed ?? vFix.speed ?? 0.0;
    final heading = vehicle.derivedHeading ?? vFix.heading;
    final dataAge = vehicle.dataAgeSeconds;

    if (speed < SafeCrossThresholds.stationarySpeedMs || heading == null) {
      return VehicleRiskAssessment(
        sessionId: vehicle.sessionId,
        distanceMeters: dist,
        closingSpeedMs: 0.0,
        direction: speed < SafeCrossThresholds.stationarySpeedMs
            ? DirectionStatus.stationary
            : DirectionStatus.notApproaching,
        etaSeconds: null,
        uncertaintySeconds: null,
        speedMs: speed,
        speedSource: vehicle.speedSource,
        heading: heading,
        dataAgeSeconds: dataAge,
        missDistanceMeters: null,
        hasPathConflict: dist <= SafeCrossThresholds.dangerDistM,
      );
    }

    final localPos = projectToLocal(vFix.lat, vFix.lng, pedFix.lat, pedFix.lng);
    final distLocal =
        math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);

    final headingRad = heading * math.pi / 180.0;
    final vx = speed * math.sin(headingRad);
    final vy = speed * math.cos(headingRad);

    double closingSpeedMs = 0.0;
    if (distLocal > 0.001) {
      closingSpeedMs = (-localPos.x * vx + -localPos.y * vy) / distLocal;
    }

    DirectionStatus direction = DirectionStatus.notApproaching;
    if (closingSpeedMs > SafeCrossThresholds.minClosingSpeedMs) {
      direction = DirectionStatus.approaching;
    } else if (closingSpeedMs < -SafeCrossThresholds.minClosingSpeedMs) {
      direction = DirectionStatus.movingAway;
    }

    // CPA
    final vSquared = vx * vx + vy * vy;
    double? missDistance;
    bool hasPathConflict = false;

    if (vSquared > 0.01) {
      final tCpa = -(localPos.x * vx + localPos.y * vy) / vSquared;
      if (tCpa > 0) {
        final cpaX = localPos.x + vx * tCpa;
        final cpaY = localPos.y + vy * tCpa;
        missDistance = math.sqrt(cpaX * cpaX + cpaY * cpaY);
        hasPathConflict =
            missDistance <= SafeCrossThresholds.conflictCorridorM;
      }
    }

    if (dist <= SafeCrossThresholds.dangerDistM) {
      hasPathConflict = true;
    }

    double? etaSeconds;
    double? uncertaintySeconds;

    if (direction == DirectionStatus.approaching &&
        closingSpeedMs > SafeCrossThresholds.minClosingSpeedMs) {
      etaSeconds = dist / closingSpeedMs;
      final combinedAccuracy = pedFix.accuracy + vFix.accuracy;
      uncertaintySeconds = combinedAccuracy / closingSpeedMs;
    }

    return VehicleRiskAssessment(
      sessionId: vehicle.sessionId,
      distanceMeters: dist,
      closingSpeedMs: closingSpeedMs,
      direction: direction,
      etaSeconds: etaSeconds,
      uncertaintySeconds: uncertaintySeconds,
      speedMs: speed,
      speedSource: vehicle.speedSource,
      heading: heading,
      dataAgeSeconds: dataAge,
      missDistanceMeters: missDistance,
      hasPathConflict: hasPathConflict,
    );
  }

  static CrossingAssessment evaluateCrossingStatus({
    required LocationFix? pedestrianFix,
    required double pedestrianFixAgeS,
    required List<Participant> vehicles,
    required bool isServerConnected,
    required double serverConnectedDurationS,
  }) {
    if (pedestrianFix == null) {
      return CrossingAssessment(
        level: RiskLevel.grey,
        title: 'Insufficient Data',
        description: 'Waiting for initial GPS location fix...',
        primaryVehicle: null,
        allVehicles: [],
      );
    }

    final vehicleRisks = vehicles
        .where((v) => !v.isExpired)
        .map((v) => assessVehicle(pedestrianFix, v))
        .toList();

    vehicleRisks.sort((a, b) {
      if (a.etaSeconds != null && b.etaSeconds != null) {
        return a.etaSeconds!.compareTo(b.etaSeconds!);
      }
      if (a.etaSeconds != null) return -1;
      if (b.etaSeconds != null) return 1;
      return a.distanceMeters.compareTo(b.distanceMeters);
    });

    final primary = vehicleRisks.isNotEmpty ? vehicleRisks.first : null;

    // 1. RED Check
    for (final v in vehicleRisks) {
      if ((v.direction == DirectionStatus.approaching &&
              v.etaSeconds != null &&
              v.etaSeconds! <= SafeCrossThresholds.dangerEtaS &&
              v.hasPathConflict) ||
          (v.distanceMeters <= SafeCrossThresholds.dangerDistM &&
              v.direction != DirectionStatus.movingAway)) {
        return CrossingAssessment(
          level: RiskLevel.red,
          title: 'Elevated Risk',
          description:
              'Tracked vehicle approaching (${v.distanceMeters.round()}m). Elevated risk!',
          primaryVehicle: v,
          allVehicles: vehicleRisks,
        );
      }
    }

    // 2. AMBER Check
    for (final v in vehicleRisks) {
      if (v.direction == DirectionStatus.approaching &&
          v.etaSeconds != null &&
          v.etaSeconds! > SafeCrossThresholds.dangerEtaS &&
          v.etaSeconds! <= SafeCrossThresholds.cautionEtaS) {
        return CrossingAssessment(
          level: RiskLevel.amber,
          title: 'Caution',
          description:
              'Vehicle approaching in ~${v.etaSeconds!.round()}s (${v.distanceMeters.round()}m). Stay alert.',
          primaryVehicle: v,
          allVehicles: vehicleRisks,
        );
      }
    }

    // 3. GREY Check
    final ownFixStale = pedestrianFixAgeS > 5.0;
    final ownAccuracyPoor =
        pedestrianFix.accuracy > SafeCrossThresholds.maxAccuracyM;
    if (ownFixStale || ownAccuracyPoor || !isServerConnected) {
      return CrossingAssessment(
        level: RiskLevel.grey,
        title: 'Insufficient Data',
        description: 'Sensor or network signal degraded. Visual check mandatory.',
        primaryVehicle: primary,
        allVehicles: vehicleRisks,
      );
    }

    // 4. GREEN Check (Strictly all criteria)
    final isAccurate =
        pedestrianFix.accuracy <= SafeCrossThresholds.goodAccuracyM;
    final isFresh = pedestrianFixAgeS <= 3.0;
    final isStable = isServerConnected && serverConnectedDurationS >= 10.0;
    final noCautionVehicle = !vehicleRisks.any((v) =>
        v.direction == DirectionStatus.approaching &&
        v.etaSeconds != null &&
        v.etaSeconds! <= SafeCrossThresholds.cautionEtaS);
    final noDangerDist = !vehicleRisks
        .any((v) => v.distanceMeters <= SafeCrossThresholds.dangerDistM);

    if (isAccurate && isFresh && isStable && noCautionVehicle && noDangerDist) {
      return CrossingAssessment(
        level: RiskLevel.green,
        title: 'Clear of SafeCross vehicles',
        description:
            'Untracked vehicles may still be present. Look both ways before crossing.',
        primaryVehicle: null,
        allVehicles: vehicleRisks,
      );
    }

    return CrossingAssessment(
      level: RiskLevel.grey,
      title: 'Insufficient Data',
      description: 'Stabilizing peer signals...',
      primaryVehicle: primary,
      allVehicles: vehicleRisks,
    );
  }
}
