import 'dart:math' as math;
import '../config/thresholds.dart';

/// Haversine Great-Circle Distance with R = 6,371,000 m
double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
  final phi1 = lat1 * math.pi / 180.0;
  final phi2 = lat2 * math.pi / 180.0;
  final deltaPhi = (lat2 - lat1) * math.pi / 180.0;
  final deltaLambda = (lon2 - lon1) * math.pi / 180.0;

  final a = math.sin(deltaPhi / 2) * math.sin(deltaPhi / 2) +
      math.cos(phi1) * math.cos(phi2) * math.sin(deltaLambda / 2) * math.sin(deltaLambda / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

  return SafeCrossThresholds.earthRadiusM * c;
}
