/// SafeCross Centralized Tunable Thresholds
/// All tunable numbers in one file as specified in Section 3 and Section 8.
class SafeCrossThresholds {
  // Stale & Expiry
  static const double staleAfterS = 10.0;
  static const double expireAfterS = 60.0;
  static const double relevanceRadiusM = 500.0;

  // OpenStreetMap Overpass Crossing
  static const double crossingRadiusM = 300.0;
  static const int crossingCacheTtlS = 60;
  static const double crossingMinMoveM = 150.0;

  // Risk Classification
  static const double dangerEtaS = 15.0;
  static const double dangerDistM = 40.0;
  static const double cautionEtaS = 30.0;

  // Sensor Quality
  static const double maxAccuracyM = 50.0;
  static const double goodAccuracyM = 20.0;
  static const double stationarySpeedMs = 0.8;
  static const double minHeadingSpeedMs = 2.0;

  // Vector Kinematics
  static const double minClosingSpeedMs = 0.5;
  static const double conflictCorridorM = 8.0;
  static const double driverAlertDistM = 50.0;
  static const double driverConeDeg = 45.0;
  static const double alertCooldownS = 8.0;

  // Display & Bounds
  static const double maxDisplayEtaS = 120.0;
  static const double maxValidSpeedMs = 70.0; // 252 km/h
  static const double maxValidDtS = 15.0;
  static const double speedEmaAlpha = 0.4;
  static const double driverLockSpeedKmh = 5.0;

  // Earth Radius
  static const double earthRadiusM = 6371000.0;
}
