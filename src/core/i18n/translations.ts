/**
 * SafeCross Localization (English, Hindi, Marathi)
 */

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export interface TranslationStrings {
  appName: string;
  tagline: string;
  pedestrianMode: string;
  driverMode: string;
  pedestrianDescription: string;
  driverDescription: string;
  serverAddress: string;
  roomCode: string;
  connect: string;
  connecting: string;
  connected: string;
  disconnected: string;
  elevatedRisk: string;
  caution: string;
  insufficientData: string;
  clearOfVehicles: string;
  untrackedWarning: string;
  permanentDisclaimer: string;
  gpsSpeed: string;
  estimatedSpeed: string;
  approaching: string;
  movingAway: string;
  notApproaching: string;
  stationary: string;
  pedestrianAhead: string;
  meters: string;
  seconds: string;
  kmh: string;
  settings: string;
  simulation: string;
  diagnostics: string;
  about: string;
  centerOnMe: string;
  autoFollow: string;
  mappedCrossings: string;
  stale: string;
  reachesYouIn: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationStrings> = {
  en: {
    appName: 'SafeCross',
    tagline: 'Navigate Smarter. Stay Aware',
    pedestrianMode: "I'm a Pedestrian",
    driverMode: "I'm a Driver",
    pedestrianDescription: 'Live vehicle arrival countdown and 4-state crossing risk status.',
    driverDescription: 'Distraction-free forward-cone alerts when pedestrians are ahead.',
    serverAddress: 'Server Address',
    roomCode: 'Room Code',
    connect: 'Join Room',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    elevatedRisk: 'Elevated Risk',
    caution: 'Caution',
    insufficientData: 'Insufficient Data',
    clearOfVehicles: 'Clear of SafeCross vehicles',
    untrackedWarning: 'Untracked vehicles may still be present. Look both ways before crossing.',
    permanentDisclaimer:
      'SafeCross only detects phones running this app. Other vehicles, bikes and people are NOT shown. Always look, listen and follow traffic signals.',
    gpsSpeed: 'GPS speed',
    estimatedSpeed: 'Estimated',
    approaching: 'Approaching',
    movingAway: 'Moving away',
    notApproaching: 'Not approaching',
    stationary: 'Stationary',
    pedestrianAhead: 'Pedestrian ahead',
    meters: 'm',
    seconds: 's',
    kmh: 'km/h',
    settings: 'Settings',
    simulation: 'Simulation',
    diagnostics: 'Diagnostics',
    about: 'About & Tech',
    centerOnMe: 'Center',
    autoFollow: 'Follow',
    mappedCrossings: 'Mapped crossing (OpenStreetMap)',
    stale: 'Stale',
    reachesYouIn: 'Vehicle reaches you in',
  },
  hi: {
    appName: 'SafeCross',
    tagline: 'समझदारी से चलें, सतर्क रहें',
    pedestrianMode: 'मैं पैदल यात्री हूँ',
    driverMode: 'मैं चालक हूँ',
    pedestrianDescription: 'वाहन आगमन की उलटी गिनती और 4-चरणीय सड़क पार करने का सुरक्षा स्तर।',
    driverDescription: 'सामने पैदल यात्री होने पर ध्यान भटकाए बिना त्वरित चेतावनी।',
    serverAddress: 'सर्वर पता',
    roomCode: 'रूम कोड',
    connect: 'रूम से जुड़ें',
    connecting: 'जुड़ रहा है...',
    connected: 'जुड़ गया',
    disconnected: 'संपर्क टूटा',
    elevatedRisk: 'उच्च जोखिम',
    caution: 'सावधानी',
    insufficientData: 'अपर्याप्त डेटा',
    clearOfVehicles: 'SafeCross वाहनों से मुक्त',
    untrackedWarning: 'गैर-ट्रैक किए गए वाहन अभी भी मौजूद हो सकते हैं। पार करने से पहले दोनों तरफ देखें।',
    permanentDisclaimer:
      'SafeCross केवल इस ऐप को चलाने वाले फोन का पता लगाता है। अन्य वाहन, बाइक और लोग नहीं दिखते। हमेशा देखकर, सुनकर सिग्नल का पालन करें।',
    gpsSpeed: 'जीपीएस गति',
    estimatedSpeed: 'अनुमानित गति',
    approaching: 'निकट आ रहा है',
    movingAway: 'दूर जा रहा है',
    notApproaching: 'निकट नहीं आ रहा',
    stationary: 'स्थिर',
    pedestrianAhead: 'आगे पैदल यात्री है',
    meters: 'मीटर',
    seconds: 'सेकंड',
    kmh: 'किमी/घंटा',
    settings: 'सेटिंग्स',
    simulation: 'सिम्युलेशन',
    diagnostics: 'डायग्नोस्टिक्स',
    about: 'जानकारी और तकनीक',
    centerOnMe: 'केंद्रित करें',
    autoFollow: 'फॉलो करें',
    mappedCrossings: 'मानचित्रित क्रॉसिंग (ओपनस्ट्रीटमैप)',
    stale: 'पुराना डेटा',
    reachesYouIn: 'वाहन आप तक पहुंचेगा लगभग',
  },
  mr: {
    appName: 'SafeCross',
    tagline: 'हुशारीने चाला, सजग रहा',
    pedestrianMode: 'मी पादचारी आहे',
    driverMode: 'मी चालक आहे',
    pedestrianDescription: 'वाहनाच्या आगमनाची थेट काउंटडाउन आणि 4-टप्प्यांची रस्ता ओलांडण्याची सुरक्षा पातळी.',
    driverDescription: 'रस्त्यावर पुढे पादचारी असल्यास विनाविक्षेप त्वरित अलर्ट.',
    serverAddress: 'सर्व्हर पत्ता',
    roomCode: 'रूम कोड',
    connect: 'रूममध्ये सामील व्हा',
    connecting: 'जोडत आहे...',
    connected: 'जोडले गेले',
    disconnected: 'संपर्क तुटला',
    elevatedRisk: 'वाढता धोका',
    caution: 'सावधानता',
    insufficientData: 'अपुरा डेटा',
    clearOfVehicles: 'SafeCross वाहने नाहीत',
    untrackedWarning: 'ट्रॅक न केलेली इतर वाहने रस्त्यावर असू शकतात. रस्ता ओलांडण्यापूर्वी दोन्ही बाजूंना पहा.',
    permanentDisclaimer:
      'SafeCross फक्त हे ॲप वापरणारे फोन दाखवतो. इतर वाहने, सायकली आणि लोक दिसत नाहीत. नेहमी पाहून, ऐकून आणि सिग्नल पाळून रस्ता ओलांड.',
    gpsSpeed: 'जीपीएस गती',
    estimatedSpeed: 'अंदाजित गती',
    approaching: 'जवळ येत आहे',
    movingAway: 'लांब जात आहे',
    notApproaching: 'जवळ येत नाही',
    stationary: 'स्थिर',
    pedestrianAhead: 'पुढे पादचारी आहे',
    meters: 'मीटर',
    seconds: 'सेकंद',
    kmh: 'किमी/तास',
    settings: 'सेटिंग्ज',
    simulation: 'प्रशिक्षण सिम्युलेशन',
    diagnostics: 'डायग्नोस्टिक्स',
    about: 'माहिती व तंत्रज्ञान',
    centerOnMe: 'केंद्रित करा',
    autoFollow: 'फॉलो करा',
    mappedCrossings: 'नकाशावरील क्रॉसिंग (OpenStreetMap)',
    stale: 'जुनट डेटा',
    reachesYouIn: 'वाहन तुमच्यापर्यंत पोहोचेल सुमारे',
  },
};
