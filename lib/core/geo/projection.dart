import 'dart:math' as math;
import '../config/thresholds.dart';

class LocalPoint {
  final double x; // East in meters
  final double y; // North in meters

  LocalPoint(this.x, this.y);
}

/// Local Flat-Earth ENU Projection relative to pedestrian origin
LocalPoint projectToLocal(
    double lat, double lon, double originLat, double originLon) {
  final deltaLat = (lat - originLat) * math.pi / 180.0;
  final deltaLon = (lon - originLon) * math.pi / 180.0;
  final meanLat = originLat * math.pi / 180.0;

  final y = deltaLat * SafeCrossThresholds.earthRadiusM;
  final x = deltaLon * SafeCrossThresholds.earthRadiusM * math.cos(meanLat);

  return LocalPoint(x, y);
}
