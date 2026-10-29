import 'dart:math' as math;

/// Initial Great-Circle Bearing in Degrees (0..360, where 0 is North)
double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
  final phi1 = lat1 * math.pi / 180.0;
  final phi2 = lat2 * math.pi / 180.0;
  final deltaLambda = (lon2 - lon1) * math.pi / 180.0;

  final y = math.sin(deltaLambda) * math.cos(phi2);
  final x = math.cos(phi1) * math.sin(phi2) -
      math.sin(phi1) * math.cos(phi2) * math.cos(deltaLambda);

  final theta = math.atan2(y, x);
  return (theta * 180.0 / math.pi + 360.0) % 360.0;
}
