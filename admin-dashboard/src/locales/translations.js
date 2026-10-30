// Translations for Smart Attendance Admin Dashboard
// Supported: en (English - Default), hi (Hindi), gu (Gujarati)

export const translations = {
  en: {
    // App Branding & Navigation
    appTitle: 'Smart Attendance',
    portalTitle: 'Admin Portal',
    portalSubtitle: 'AI-Powered Biometric & Geofence System',
    academicHeader: 'College Minor Project BCA',
    academicFooter: 'AI Smart Attendance & Workforce Management System • College Minor Project BCA (Bachelor of Computer Applications)',
    
    // Auth & Login
    adminAuth: 'Admin Authentication',
    authorizedWorkspace: 'Authorized Workspace Login',
    loginDescription: 'Sign in with your administrative credentials to manage employees, verify attendance logs, and process payroll.',
    adminIdOrEmail: 'Admin ID / Email',
    adminIdPlaceholder: 'e.g. ADMIN01 or hod@college.edu',
    password: 'Password',
    passwordPlaceholder: 'Enter admin password',
    signInAsAdmin: 'Sign In as Administrator',
    authenticating: 'Authenticating...',
    standardDemoAdmin: 'Standard Demo Admin:',
    
    // Error Popups & Messages
    missingCredentialsTitle: 'Missing Credentials',
    missingCredentialsMsg: 'Please enter both Admin ID/Username and password.',
    wrongPasswordTitle: 'Incorrect Password',
    wrongPasswordMsg: 'The password you entered is incorrect. Please verify and enter the correct administrator password.',
    invalidIdTitle: 'Account Not Found',
    invalidIdMsg: 'Invalid Admin ID or Email. No administrator account found with this identifier.',
    accessDeniedTitle: 'Access Denied',
    accessDeniedMsg: 'This account belongs to an Employee. Administrator privileges (e.g. ADMIN01) are required to access this portal.',
    deactivatedTitle: 'Account Deactivated',
    deactivatedMsg: 'Your administrator account has been deactivated.',
    serverErrorTitle: 'Server Connection Error',
    serverErrorMsg: 'Unable to connect to the FastAPI backend server. Please verify that the backend is running on port 8000.',
    tryAgain: 'Try Again',
    close: 'Close',
    authFailedTitle: 'Authentication Failed',
    
    // Sidebar & Navigation
    navDashboard: 'Dashboard',
    navEmployees: 'Employees',
    navLeaves: 'Leaves',
    navPayroll: 'Payroll',
    navAttendance: 'Attendance Logs',
    navSettings: 'Settings',
    navSignOut: 'Sign Out',
    
    // Language Switcher
    selectLanguage: 'Language',
    english: 'English',
    hindi: 'हिन्दी (Hindi)',
    gujarati: 'ગુજરાતી (Gujarati)',
    
    // Dashboard Stats
    totalEmployees: 'Total Employees',
    presentToday: 'Present Today',
    lateArrivals: 'Late Arrivals',
    onLeave: 'On Leave',
    attendanceRate: 'Attendance Rate',
    liveAttendanceFeed: 'Live Attendance Feed',
    recentActivity: 'Recent Activity',
  },

  hi: {
    // App Branding & Navigation
    appTitle: 'स्मार्ट अटेंडेंस',
    portalTitle: 'एडमिन पोर्टल',
    portalSubtitle: 'एआई-आधारित बायोमेट्रिक एवं जियोफेंस प्रणाली',
    academicHeader: 'कॉलेज माइनर प्रोजेक्ट बीसीए',
    academicFooter: 'एआई स्मार्ट उपस्थिति एवं कार्यबल प्रबंधन प्रणाली • कॉलेज माइनर प्रोजेक्ट बीसीए',
    
    // Auth & Login
    adminAuth: 'एडमिन प्रमाणीकरण',
    authorizedWorkspace: 'अधिकृत कार्यक्षेत्र लॉगिन',
    loginDescription: 'कर्मचारियों के प्रबंधन, उपस्थिति रिकॉर्ड की जांच और पेरोल प्रसंस्करण के लिए अपने प्रशासनिक क्रेडेंशियल्स से साइन इन करें।',
    adminIdOrEmail: 'एडमिन आईडी / ईमेल',
    adminIdPlaceholder: 'उदा. ADMIN01 या hod@college.edu',
    password: 'पासवर्ड',
    passwordPlaceholder: 'एडमिन पासवर्ड दर्ज करें',
    signInAsAdmin: 'प्रशासक के रूप में साइन इन करें',
    authenticating: 'प्रमाणीकरण हो रहा है...',
    standardDemoAdmin: 'मानक डेमो एडमिन:',
    
    // Error Popups & Messages
    missingCredentialsTitle: 'अधूरी जानकारी',
    missingCredentialsMsg: 'कृपया एडमिन आईडी और पासवर्ड दोनों दर्ज करें।',
    wrongPasswordTitle: 'गलत पासवर्ड',
    wrongPasswordMsg: 'दर्ज किया गया पासवर्ड गलत है। कृपया जांच कर सही पासवर्ड दर्ज करें।',
    invalidIdTitle: 'खाता नहीं मिला',
    invalidIdMsg: 'अमान्य एडमिन आईडी या ईमेल। इस पहचानकर्ता से कोई एडमिनिस्ट्रेटर खाता नहीं मिला।',
    accessDeniedTitle: 'अनुमति नहीं है',
    accessDeniedMsg: 'यह कर्मचारी खाता है। इस पोर्टल में प्रवेश के लिए एडमिनिस्ट्रेटर अधिकार (जैसे ADMIN01) आवश्यक हैं।',
    deactivatedTitle: 'खाता निष्क्रिय है',
    deactivatedMsg: 'आपका प्रशासनिक खाता निष्क्रिय कर दिया गया है।',
    serverErrorTitle: 'सर्वर कनेक्शन त्रुटि',
    serverErrorMsg: 'फास्टएपीआई बैकएंड सर्वर से कनेक्शन स्थापित नहीं हो सका। सुनिश्चित करें कि सर्वर पोर्ट 8000 पर चल रहा है।',
    tryAgain: 'दोबारा प्रयास करें',
    close: 'बंद करें',
    authFailedTitle: 'प्रमाणीकरण विफल',
    
    // Sidebar & Navigation
    navDashboard: 'डैशबोर्ड',
    navEmployees: 'कर्मचारी',
    navLeaves: 'अवकाश',
    navPayroll: 'पेरोल',
    navAttendance: 'उपस्थिति रिकॉर्ड',
    navSettings: 'सेटिंग्स',
    navSignOut: 'साइन आउट',
    
    // Language Switcher
    selectLanguage: 'भाषा',
    english: 'English',
    hindi: 'हिन्दी (Hindi)',
    gujarati: 'ગુજરાતી (Gujarati)',
    
    // Dashboard Stats
    totalEmployees: 'कुल कर्मचारी',
    presentToday: 'आज उपस्थित',
    lateArrivals: 'देरी से आगमन',
    onLeave: 'अवकाश पर',
    attendanceRate: 'उपस्थिति दर',
    liveAttendanceFeed: 'लाइव उपस्थिति फीड',
    recentActivity: 'हालिया गतिविधि',
  },

  gu: {
    // App Branding & Navigation
    appTitle: 'સ્માર્ટ હાજરી',
    portalTitle: 'એડમિન પોર્ટલ',
    portalSubtitle: 'એઆઈ-આધારિત બાયોમેટ્રિક અને જીઓફેન્સ સિસ્ટમ',
    academicHeader: 'કોલેજ માઇનોર પ્રોજેક્ટ બીસીએ',
    academicFooter: 'એઆઈ સ્માર્ટ હાજરી અને વર્કફોર્સ મેનેજમેન્ટ સિસ્ટમ • કોલેજ માઇનોર પ્રોજેક્ટ બીસીએ',
    
    // Auth & Login
    adminAuth: 'એડમિન પ્રમાણીકરણ',
    authorizedWorkspace: 'અધિકૃત વર્કસ્પેસ લૉગિન',
    loginDescription: 'કર્મચારીઓનું સંચાલન કરવા, હાજરી રેકોર્ડ્સ ચકાસવા અને પગાર પ્રક્રિયા માટે તમારા એડમિન વિગતો સાથે સાઇન ઇન કરો.',
    adminIdOrEmail: 'એડમિન આઈડી / ઈમેલ',
    adminIdPlaceholder: 'દા.ત. ADMIN01 અથવા hod@college.edu',
    password: 'પાસવર્ડ',
    passwordPlaceholder: 'એડમિન પાસવર્ડ દાખલ કરો',
    signInAsAdmin: 'વહીવટકર્તા તરીકે સાઇન ઇન કરો',
    authenticating: 'ચકાસણી ચાલુ છે...',
    standardDemoAdmin: 'માનક ડેમો એડમિન:',
    
    // Error Popups & Messages
    missingCredentialsTitle: 'અધૂરી વિગતો',
    missingCredentialsMsg: 'કૃપા કરીને એડમિન આઈડી અને પાસવર્ડ બંને દાખલ કરો.',
    wrongPasswordTitle: 'ખોટો પાસવર્ડ',
    wrongPasswordMsg: 'દાખલ કરેલ પાસવર્ડ ખોટો છે. કૃપા કરીને સાચો એડમિનિસ્ટ્રેટર પાસવર્ડ દાખલ કરો.',
    invalidIdTitle: 'ખાતું મળ્યું નથી',
    invalidIdMsg: 'અમાન્ય એડમિન આઈડી અથવા ઈમેલ. આ આઈડીથી કોઈ એડમિનિસ્ટ્રેટર ખાતું મળ્યું નથી.',
    accessDeniedTitle: 'પરવાનગી નથી',
    accessDeniedMsg: 'આ એક સામાન્ય કર્મચારી ખાતું છે. આ પોર્ટલ માટે એડમિનિસ્ટ્રેટર અધિકારો (જેમ કે ADMIN01) હોવા જરૂરી છે.',
    deactivatedTitle: 'ખાતું નિષ્ક્રિય છે',
    deactivatedMsg: 'તમારું એડમિનિસ્ટ્રેટર ખાતું નિષ્ક્રિય કરવામાં આવ્યું છે.',
    serverErrorTitle: 'સર્વર કનેક્શન ભૂલ',
    serverErrorMsg: 'બેકએન્ડ સર્વર સાથે જોડાણ થઈ શક્યું નથી. કૃપા કરીને ચકાસો કે સર્વર પોર્ટ 8000 પર ચાલુ છે.',
    tryAgain: 'ફરી પ્રયાસ કરો',
    close: 'બંધ કરો',
    authFailedTitle: 'પ્રમાણીકરણ નિષ્ફળ',
    
    // Sidebar & Navigation
    navDashboard: 'ડેશબોર્ડ',
    navEmployees: 'કર્મચારીઓ',
    navLeaves: 'રજાઓ',
    navPayroll: 'પગારપત્રક',
    navAttendance: 'હાજરી લોગ્સ',
    navSettings: 'સેટિંગ્સ',
    navSignOut: 'સાઇન આઉટ',
    
    // Language Switcher
    selectLanguage: 'ભાષા',
    english: 'English',
    hindi: 'हिन्दी (Hindi)',
    gujarati: 'ગુજરાતી (Gujarati)',
    
    // Dashboard Stats
    totalEmployees: 'કુલ કર્મચારીઓ',
    presentToday: 'આજે હાજર',
    lateArrivals: 'મોડા આવ્યા',
    onLeave: 'રજા પર',
    attendanceRate: 'હાજરી દર',
    liveAttendanceFeed: 'લાઇવ હાજરી ફીડ',
    recentActivity: 'તાજેતરની પ્રવૃત્તિ',
  },
};

export default translations;
