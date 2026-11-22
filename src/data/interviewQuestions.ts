export type InterviewLanguage = 'ne' | 'en' | 'hi' | 'es' | 'ne-en' | 'mai';

export interface InterviewQuestionItem {
  id: number;
  k: string;
  category: string;
  emoji: string;
  title: string;
  voiceText: (name: string, phone: string) => string;
  aiAcknowledgement: (name: string, phone: string, nextIdx: number) => string;
  hint: string;
  actionPrompt?: string;
  sampleText: string;
  options: string[];
}

export interface AiVoiceToneOption {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  badge: string;
  pitch: number;
  rate: number;
  genderPref?: 'female' | 'male';
  sampleText: (name: string, phone: string) => string;
}

export const AI_VOICE_TONES: AiVoiceToneOption[] = [
  {
    id: 'warm_friendly',
    name: 'Warm & Friendly Host',
    emoji: '🌸',
    tagline: 'Sweet, welcoming, hospitable conversational tone',
    badge: 'Most Popular',
    pitch: 1.15,
    rate: 0.98,
    genderPref: 'female',
    sampleText: (name, phone) => `Namaste ${name}! Welcome to the review studio. How is your experience with ${phone}?`,
  },
  {
    id: 'bedroom_whisper',
    name: 'Bedroom Whisper & Quiet Night',
    emoji: '🌙',
    tagline: 'Soft, gentle, discreet whisper for bedroom & late-night recording',
    badge: 'Bedroom Quiet Mode',
    pitch: 0.92,
    rate: 0.88,
    genderPref: 'female',
    sampleText: (name, phone) => `Namaste ${name}. Bedroom quiet mode is active. Let's peacefully review your ${phone} without making noise.`,
  },
  {
    id: 'energetic_creator',
    name: 'High-Energy Hype RJ',
    emoji: '⚡',
    tagline: 'Lively, upbeat tech reviewer full of excitement & fun',
    badge: 'High Energy',
    pitch: 1.20,
    rate: 1.08,
    sampleText: (name, phone) => `Hey Namaste ${name}! Super excited to hear your real review of the awesome ${phone}! Let's go!`,
  },
  {
    id: 'calm_expert',
    name: 'Executive & Tech Analyst',
    emoji: '👔',
    tagline: 'Crisp studio host, articulate hardware specialist',
    badge: 'Pro Analyst',
    pitch: 0.90,
    rate: 0.94,
    genderPref: 'male',
    sampleText: (name, phone) => `Namaste ${name}. Welcome to dot. Please evaluate the build, chipset, and durability of ${phone}.`,
  },
  {
    id: 'playful_buddy',
    name: 'Playful & Fun Buddy',
    emoji: '🎭',
    tagline: 'Jolly companion, funny witty jokes and relaxed Nepali banter',
    badge: 'Fun & Cheerful',
    pitch: 1.12,
    rate: 1.02,
    sampleText: (name, phone) => `Namaste sathi ${name}! Let's have fun reviewing your ${phone} and make today's top review!`,
  },
];

export function formatSalutationGreeting(
  name: string,
  gender: 'female' | 'male' | 'other' = 'male',
  title?: string,
  lang: InterviewLanguage = 'en'
): string {
  const cleanName = (name || '').trim();
  const effectiveTitle = title || (gender === 'female' ? 'Mrs.' : 'Mr.');
  const displayName = cleanName.toLowerCase().startsWith(effectiveTitle.toLowerCase())
    ? cleanName
    : `${effectiveTitle} ${cleanName || (gender === 'female' ? 'Sita Sharma' : 'Pawan Bahadur Sarki')}`;

  if (lang === 'ne' || lang === 'ne-en') {
    const nepTitle = effectiveTitle === 'Mrs.' || effectiveTitle === 'Ms.' ? 'श्रीमती' : 'श्रीमान्';
    const nepClean = cleanName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '');
    return `नमस्ते ${nepTitle} ${nepClean || (gender === 'female' ? 'सीता शर्मा' : 'पवन बहादुर सार्की')} जी`;
  }
  if (lang === 'hi') {
    const hiTitle = effectiveTitle === 'Mrs.' || effectiveTitle === 'Ms.' ? 'श्रीमती' : 'श्री';
    const hiClean = cleanName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '');
    return `नमस्ते ${hiTitle} ${hiClean || (gender === 'female' ? 'सीता शर्मा' : 'पवन बहादुर सार्की')} जी`;
  }
  if (lang === 'es') {
    const esTitle = effectiveTitle === 'Mrs.' || effectiveTitle === 'Ms.' ? 'Sra.' : 'Sr.';
    const esClean = cleanName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '');
    return `¡Hola ${esTitle} ${esClean || (gender === 'female' ? 'Sita Sharma' : 'Pawan Bahadur Sarki')}!`;
  }
  return `Namaste ${displayName}`;
}

export interface InterviewScript {
  label: string;
  flag: string;
  greeting: (name: string, phone: string) => string;
  callConnectText: (name: string, phone: string) => string;
  questions: InterviewQuestionItem[];
}

export const INTERVIEW_SCRIPTS_20: Record<InterviewLanguage, InterviewScript> = {
  ne: {
    label: 'नेपाली (Nepali)',
    flag: '🇳🇵',
    greeting: (name, phone) => `नमस्ते, ${name || 'श्रीमान'}, हाम्रो एपमा स्वागत छ! तपाईंको ${phone} को भिडियो रिभ्यु सुरु गरौँ!`,
    callConnectText: (name, phone) => `नमस्ते ${name || 'श्रीमान'}, एआई भ्वाइस अन्तर्वार्ता सुरु भयो। ${phone} को बारेमा प्रश्नहरू सोध्नेछु।`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Unboxing & Retail Box',
        emoji: '📦',
        title: '१. फोन क्यामेरामा देखाउनुहोस् र खरिद अनुभव बताउनुहोस्',
        voiceText: (name, phone) => `नमस्ते, ${name || 'श्रीमान'}, हाम्रो एपमा स्वागत छ! कृपया आफ्नो ${phone} क्यामेरा अगाडि देखाउनुहोस्। तपाईंले यो फोन कहाँबाट किन्नुभएको हो?`,
        aiAcknowledgement: (name) => `उत्कृष्ट, ${name || 'साथी'}! खरिद अनुभव नोट गरियो। अब दोस्रो प्रश्नमा जाऔँ।`,
        hint: 'क्यामेरामा फोन देखाउनुहोस् वा तलको जवाफ छान्नुहोस्',
        actionPrompt: '📸 फोन क्यामेरामा देखाएर फोटो खिच्नुहोस्',
        sampleText: 'मैले यो फोन आधिकारिक शोरुमबाट किनेको हुँ। लुक एकदमै प्रिमियम छ।',
        options: [
          '🛍️ आधिकारिक शोरुमबाट किनेको (नयाँ अवस्था)',
          '📦 अनलाइन अर्डर गरेको, सुरक्षित प्याकेजिङ',
          '🎁 परिवारबाट उपहार पाएको, निकै मन पर्यो',
          '🏪 स्थानीय मोबाइल पसलबाट किनेको'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'In-Hand Comfort',
        emoji: '🖐️',
        title: '२. फोनको ग्रिप र हातमा कम्फर्ट कस्तो छ?',
        voiceText: (_name, phone) => `अब बताउनुहोस्, यो ${phone} हातमा समातेर दैनिक चलाउँदा कस्तो महसुस हुन्छ? तौल र ग्रिप कत्तिको सजिलो छ?`,
        aiAcknowledgement: () => `धेरै राम्रो! ग्रिप र कम्फर्टको जानकारी सुरक्षित गरियो। अर्को प्रश्न हेरौँ।`,
        hint: 'हातको ग्रिप र तौलबारे जवाफ छान्नुहोस्',
        actionPrompt: '🔄 क्यामेरा Flip गरेर ब्याक प्यानल देखाउनुहोस्',
        sampleText: 'हातमा समात्न निकै हलुका र सजिलो छ। साइड फ्रेमको ग्रिप बलियो छ।',
        options: [
          '🖐️ हातमा निकै हलुका र बलियो ग्रिप, चिप्लँदैन',
          '📱 एक हातले टाइप गर्न र फोन उठाउन सजिलो साइज',
          '⚠️ कभर बिना ब्याक ग्लास अलि चिप्लो लाग्ने',
          '👌 लामो समय चलाउँदा पनि हात दुख्दैन'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Display & Refresh Rate',
        emoji: '📱',
        title: '३. १२०Hz डिस्प्ले र रंगको गुणस्तर कस्तो छ?',
        voiceText: (_name, phone) => `यो ${phone} को स्क्रिन कत्तिको स्मूथ छ? भिडियो हेर्दा र १२०Hz मा स्क्रोल गर्दा अनुभव कस्तो लाग्छ?`,
        aiAcknowledgement: () => `बुझियो! डिस्प्लेको बारेमा तपाईंको विचार रेकर्ड भयो।`,
        hint: 'डिस्प्ले स्मूथनेस र कलरको बारेमा बताउनुहोस्',
        sampleText: '१२०Hz रिफ्रेस रेटले गर्दा फोन एकदमै फास्ट र पानी जस्तै स्मूथ चल्छ, रंगहरू पनि जीवन्त छन्।',
        options: [
          '⚡ १२०Hz सुपर स्मूथ स्क्रोलिङ र उच्च गति',
          '🌈 चम्किला र जीवन्त AMOLED रंगहरू',
          '🎬 भिडियो हेर्न र मुभीको लागि उत्कृष्ट स्क्रिन',
          '✨ आँखालाई नबिझाउने आरामदायी डिस्प्ले'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Outdoor Brightness',
        emoji: '☀️',
        title: '४. चर्को घाममा बाहिर स्क्रिन कत्तिको प्रष्ट देखिन्छ?',
        voiceText: (_name, phone) => `दिउँसोको चर्को घाममा बाहिर निस्कँदा ${phone} को स्क्रिन राम्रोसँग पढ्न सकिन्छ कि धमिलो हुन्छ?`,
        aiAcknowledgement: () => `धन्यवाद! घाममा देखिने ब्राइटनेसबारे समीक्षा टिपोट भयो।`,
        hint: 'घाममा बाहिर स्क्रिन देखिने अनुभव छान्नुहोस्',
        sampleText: 'घाममा पनि मज्जाले स्क्रिन देखिन्छ, अक्षरहरू पढ्न कुनै समस्या छैन।',
        options: [
          '☀️ चर्को घाममा पनि अक्षरहरू प्रष्ट पढ्न सकिन्छ',
          '💡 २०००+ निट्सको उच्च ब्राइटनेस',
          '⚡ अटो ब्राइटनेस सेन्सर एकदमै छिटो काम गर्छ',
          '🕶️ बाहिर हल्का रिफ्लेक्सन हुन्छ तर चल्छ'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Daylight Camera',
        emoji: '📸',
        title: '५. दिनको उज्यालोमा मुख्य क्यामेराको फोटो कस्तो आउँछ?',
        voiceText: (_name, phone) => `अब क्यामेराको कुरा गरौँ! दिनको उज्यालोमा ${phone} ले कत्तिको सफा र डिटेल फोटो खिच्छ?`,
        aiAcknowledgement: () => `उत्कृष्ट! क्यामेरा फोटो क्वालिटीको मूल्यांकन टिपियो।`,
        hint: 'फोटोको क्लियारिटी र डिटेल बारे छान्नुहोस्',
        sampleText: 'मुख्य क्यामेराले एकदमै सफा, डिटेल र प्राकृतिक रंग भएका फोटोहरू खिच्छ।',
        options: [
          '📸 फोटोको डिटेल र क्लियारिटी असाध्यै राम्रो (१०/१०)',
          '🎨 प्राकृतिक रंग, बढी सेचुरेसन नहुने',
          '⚡ फोटो खिच्दा कुनै ढिलाइ नहुने',
          '🌿 पात र अनुहारको सूक्ष्म डिटेल स्पष्ट आउने'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Night Photography',
        emoji: '🌙',
        title: '६. रातिको अँध्यारो वा नाइट मोडमा क्यामेरा कस्तो छ?',
        voiceText: (_name, phone) => `रातिको समयमा वा कोठाको कम बत्तीमा ${phone} को नाइट मोडले कस्तो फोटो खिच्छ?`,
        aiAcknowledgement: () => `राम्रो प्रतिक्रिया! नाइट फोटोग्राफीको डेटा सुरक्षित भयो।`,
        hint: 'नाइट मोड र अध्याँरोको फोटोबारे छान्नुहोस्',
        sampleText: 'नाइट मोडले अँध्यारोमा पनि उज्यालो र न्वाइज नभएको सफा फोटो निकाल्छ।',
        options: [
          '🌙 अँध्यारोमा पनि निकै उज्यालो र सफा फोटो',
          '💡 सडकका बत्तीहरू नफैलने, नियन्त्रित प्रकाश',
          '⏳ १-२ सेकेन्डमै नाइट सट प्रोसेसिङ',
          '🌃 कोठाभित्रको कम बत्तीमा राम्रो काम गर्छ'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Portrait & Bokeh',
        emoji: '🎭',
        title: '७. पोट्रेट मोड, ब्याकग्राउन्ड ब्लर र स्किन टोन कस्तो छ?',
        voiceText: (_name, phone) => `पोट्रेट फोटो खिच्दा मानिसको अनुहारको स्किन टोन र पछाडिको ब्लर कत्तिको प्राकृतिक आउँछ?`,
        aiAcknowledgement: () => `सही विश्लेषण! पोट्रेट मोडको विवरण टिपियो।`,
        hint: 'पोट्रेट ब्लर र स्किन टोन बारे छान्नुहोस्',
        sampleText: 'डीएसएलआर क्यामेरा जस्तै पछाडि ब्लर हुन्छ, कपाल र कानको छेउछाउ सफा छुट्याउँछ।',
        options: [
          '🎭 डीएसएलआर जस्तै सफा ब्याकग्राउन्ड ब्लर',
          '✨ प्राकृतिक छालाको रंग र टेक्स्चर',
          '✂️ कपाल र चस्माको किनारा सफा काट्छ',
          '📸 स्टुडियो जस्तै आकर्षक पोट्रेट फोटो'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Zoom & Ultra-Wide',
        emoji: '🔍',
        title: '८. अल्ट्रा-वाइड र जुम गर्दा फोटो कत्तिको प्रष्ट आउँछ?',
        voiceText: (_name, phone) => `तपाईंले टाढाको वस्तु जुम गरेर वा अल्ट्रा-वाइड लेन्सबाट फोटो खिच्नुभएको छ? क्वालिटी कस्तो छ?`,
        aiAcknowledgement: () => `बुझियो! जुम र अल्ट्रा-वाइडको रिभ्यु दर्ता भयो।`,
        hint: 'जुम र अल्ट्रा-वाइड फोटो क्वालिटी छान्नुहोस्',
        sampleText: '३ गुणा देखि ५ गुणा सम्म जुम गर्दा पनि फोटो फुट्दैन, अल्ट्रा-वाइड पनि फराकिलो छ।',
        options: [
          '🔭 टाढाको चिज जुम गर्दा पनि अक्षर प्रष्ट देखिने',
          '🏔️ फराकिलो दृश्य समेट्ने सफा अल्ट्रा-वाइड',
          '🔍 नजिकका साना फूल-कीराको म्याक्रो सट राम्रो',
          '👌 सबै लेन्समा एकैनासको रंग'
        ]
      },
      {
        id: 9,
        k: 'camera_video',
        category: 'Video & Stabilization',
        emoji: '🎥',
        title: '९. भिडियो रेकर्डिङ कत्तिको स्थिर र स्मूथ आउँछ?',
        voiceText: (_name, phone) => `हिँड्दै भिडियो खिच्दा ${phone} मा भिडियो हल्लिन्छ कि स्थिर बस्छ? अडियो माइकको आवाज कस्तो छ?`,
        aiAcknowledgement: () => `धेरै राम्रो! भिडियो स्टेबलाइजेसनको रिभ्यु सुरक्षित भयो।`,
        hint: 'भिडियो हल्लिने वा स्थिर हुने बारे छान्नुहोस्',
        sampleText: 'हिँडेर ४K भिडियो खिच्दा पनि गिम्बल जस्तै स्थिर बस्छ, माइकको आवाज प्रष्ट छ।',
        options: [
          '🎥 हिँड्दा पनि भिडियो हल्लिँदैन, पूर्ण स्थिर',
          '🎙️ माइकको आवाज ठूलो र स्पष्ट रेकर्ड हुन्छ',
          '⚡ ४K ६०fps मा एकदमै स्मूथ भिडियो',
          '🎬 सिनेमा जस्तै रङ र फोकस'
        ]
      },
      {
        id: 10,
        k: 'camera_selfie',
        category: 'Front Selfie Camera',
        emoji: '🤳',
        title: '१०. अगाडिको सेल्फी क्यामेरा र भिडियो कलको क्वालिटी कस्तो छ?',
        voiceText: (_name, phone) => `सेल्फी क्यामेरा हेर्नुहोस्! ह्वाट्सएप वा भिडियो कल गर्दा तपाईंको अनुहार कत्तिको प्रष्ट देखिन्छ?`,
        aiAcknowledgement: () => `उत्कृष्ट! सेल्फी क्यामेराको जानकारी नोट भयो।`,
        hint: 'सेल्फी र भिडियो कल क्लियारिटी छान्नुहोस्',
        sampleText: 'सेल्फी क्यामेरा एकदमै सफा छ, भिडियो कलमा साथीहरूले अनुहार प्रष्ट देख्छन्।',
        options: [
          '🤳 सेल्फी फोटो एकदमै सफा र प्राकृतिक आउँछ',
          '📞 भिडियो कलमा अनुहार उज्यालो र प्रष्ट देखिन्छ',
          '👥 धेरै साथीहरूसँग ग्रुप सेल्फी खिच्न मिल्ने एंगल',
          '✨ कम बत्ती भएको ठाउँमा पनि राम्रो सेल्फी'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Daily Speed & RAM',
        emoji: '⚡',
        title: '११. दैनिक प्रयोगमा स्पिड कस्तो छ? कत्तिको अड्किन्छ?',
        voiceText: (_name, phone) => `दैनिक विभिन्न एपहरू खोल्दा र चलाउँदा ${phone} को स्पिड कस्तो छ? कहिल्यै ह्याङ वा ल्याग भएको छ?`,
        aiAcknowledgement: () => `महत्वपूर्ण फिडब्याक! दैनिक स्पिड र पर्फर्मेन्स रेकर्ड गरियो।`,
        hint: 'एप खुल्ने गति र ल्याग भए नभएको छान्नुहोस्',
        sampleText: 'फोन कहिल्यै अड्किँदैन, जुनसुकै एप तुरुन्तै खुल्छ र मल्टिटास्किङ सहज छ।',
        options: [
          '⚡ कुनै पनि ल्याग वा ह्याङ बिना एकदमै छिटो चल्छ',
          '📑 धेरै एप एकैपटक चलाउँदा पनि बन्द हुँदैन',
          '🚀 एप खोल्ने गति निकै तेज छ',
          '💨 दैनिक सबै काम फटाफट हुन्छ'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Heavy Gaming',
        emoji: '🎮',
        title: '१२. पब्जी, फ्री-फायर जस्ता गेम खेल्दा पर्फर्मेन्स कस्तो छ?',
        voiceText: (_name, phone) => `तपाईंले यो ${phone} मा पब्जी वा फ्री-फायर जस्ता गेम खेल्नुभएको छ? फ्रेम रेट स्थिर छ कि ड्रप हुन्छ?`,
        aiAcknowledgement: () => `गेमिङ प्रेमीको अनुभव टिपियो! अर्को प्रश्नमा जाऔँ।`,
        hint: 'गेमको स्मूथनेस र एफपीएस स्थिरता छान्नुहोस्',
        sampleText: 'पब्जीमा स्थिर फ्रेम रेट आउँछ, जाइरोस्कोप छिटो छ र गेम खेल्न मज्जा आउँछ।',
        options: [
          '🎮 पब्जीमा उच्च एफपीएस, कुनै ल्याग छैन',
          '🎯 जाइरोस्कोप र टच रेस्पोन्स निकै छिटो',
          '🕹️ १ घण्टा खेल्दा पनि गेम स्मूथ चल्छ',
          '🔥 धेरै बेर खेल्दा हल्का तातो हुन्छ तर चल्छ'
        ]
      },
      {
        id: 13,
        k: 'heating',
        category: 'Heating & Thermal',
        emoji: '🔥',
        title: '१३. चलाउँदा फोन तातिने वा ओभरहिट हुने समस्या छ कि छैन?',
        voiceText: (_name, phone) => `इमान्दार भएर भन्नुहोस्—लामो समय चलाउँदा वा घाममा फोन बढी तातो हुन्छ? क्यामेरा एरिया कत्तिको तात्छ?`,
        aiAcknowledgement: () => `इमान्दार जवाफको लागि धन्यवाद! फोनको तापक्रमबारे टिपोट भयो।`,
        hint: 'फोन तात्ने वा चिसो रहने अनुभव छान्नुहोस्',
        sampleText: 'सामान्य चलाउँदा तातिँदैन, लामो गेम खेल्दा क्यामेराको भाग हल्का न्यानो हुन्छ।',
        options: [
          '❄️ दिनभरि चलाउँदा पनि फोन चिसो नै रहन्छ',
          '🌡️ लामो गेम खेल्दा क्यामेरा एरिया हल्का तातो हुन्छ',
          '🔥 गर्मीको दिनमा घाममा अलि बढी तात्ने समस्या',
          '🛡️ कुलिङ सिस्टमले तापक्रम चाँडै घटाउँछ'
        ]
      },
      {
        id: 14,
        k: 'battery',
        category: 'Battery Endurance',
        emoji: '🔋',
        title: '१४. एकपटक चार्ज गर्दा ब्याट्री कति समयसम्म टिक्छ?',
        voiceText: (_name, phone) => `यो ${phone} को ब्याट्री कति समय टिक्छ? बिहानदेखि बेलुकासम्म ढुक्कले पुग्छ कि बीचमै चार्ज गर्नुपर्छ?`,
        aiAcknowledgement: () => `उत्कृष्ट! ब्याट्री ब्याकअपको तथ्याङ्क सुरक्षित गरियो।`,
        hint: 'ब्याट्री टिक्ने समयबारे जवाफ छान्नुहोस्',
        sampleText: 'दिनभरि टिकटक, युट्युब र फोन कल गर्दा पनि बेलुका ३०% ब्याट्री बाँकी नै रहन्छ।',
        options: [
          '🔋 बिहानदेखि बेलुकासम्म सजिलै टिक्छ, ढुक्कको ब्याट्री',
          '⚡ १.५ दिनसम्म लगातार चलाउन मिल्ने क्षमता',
          '🌙 रातभरि राख्दा १-२% मात्र ब्याट्री घट्छ',
          '⚠️ धेरै चलाउँदा दिनमा एकपटक थप्नुपर्ने'
        ]
      },
      {
        id: 15,
        k: 'charging',
        category: 'Fast Charging',
        emoji: '⚡',
        title: '१५. फोन फुल चार्ज हुन कति मिनेट लाग्छ?',
        voiceText: (_name, phone) => `० देखि १०० प्रतिशत चार्ज हुन कति समय लाग्छ? चार्जिङको बेला फोन तातिन्छ कि तातिँदैन?`,
        aiAcknowledgement: () => `बुझियो! चार्जिङ स्पिड र अनुभव दर्ता भयो।`,
        hint: 'चार्ज हुने समय र चार्जरबारे छान्नुहोस्',
        sampleText: 'आधा घण्टामै ७०% भन्दा बढी चार्ज भइसक्छ, धेरै छिटो चार्ज हुन्छ।',
        options: [
          '⚡ ३० देखि ४५ मिनेटमै पूरै फुल चार्ज हुन्छ',
          '⏱️ १५ मिनेटमै दिनभरलाई पुग्ने चार्ज हुन्छ',
          '🔋 वायरलेस चार्जिङ निकै सुविधाजनक छ',
          '🔌 बक्समा चार्जर नभएकोले छुट्टै किन्नु पर्यो'
        ]
      },
      {
        id: 16,
        k: 'os_ui',
        category: 'Software & UI',
        emoji: '⚙️',
        title: '१६. सफ्टवेयर चलाउन कत्तिको सजिलो छ? अनावश्यक विज्ञापन आउँछ?',
        voiceText: (_name, phone) => `यो ${phone} को सफ्टवेयर कस्तो लाग्छ? कुनै नचाहिने एप वा लकस्क्रिनमा विज्ञापन आउँछ कि सफा छ?`,
        aiAcknowledgement: () => `सफ्टवेयरको समीक्षा सुरक्षित गरियो! अर्को प्रश्नमा जाऔँ।`,
        hint: 'सफ्टवेयरको सफाइ र विज्ञापनबारे छान्नुहोस्',
        sampleText: 'सफ्टवेयर एकदमै क्लिन छ, कुनै अनावश्यक विज्ञापन वा फोहोर एपहरू छैनन्।',
        options: [
          '✨ विज्ञापनरहित सफा र सुरक्षित इन्टरफेस',
          '🎨 थिम र आइकन आफ्नै तरिकाले मिलाउन मिल्ने',
          '🔄 समयमै नयाँ सफ्टवेयर अपडेटहरू आउँछन्',
          '⚠️ केही पहिलेदेखि राखिएका एपहरू हटाउन मिल्दैन'
        ]
      },
      {
        id: 17,
        k: 'ai_features',
        category: 'Smart AI Features',
        emoji: '🤖',
        title: '१७. फोनमा भएका नयाँ एआई सुविधाहरू कत्तिको उपयोगी छन्?',
        voiceText: (_name, phone) => `तपाईंले फोटोबाट मान्छे हटाउने, भाषा अनुवाद गर्ने वा एआई सर्च जस्ता फिचर चलाउनुभएको छ?`,
        aiAcknowledgement: () => `एआई फिचर्स सम्बन्धी तपाईंको मूल्याङ्कन रेकर्ड भयो।`,
        hint: 'एआई फोटो इरेजर र अनुवादबारे छान्नुहोस्',
        sampleText: 'फोटोबाट नचाहिने मान्छे हटाउने म्याजिक इरेजर एकदमै अचम्मको र काम लाग्ने छ।',
        options: [
          '🪄 फोटोबाट नचाहिने वस्तु मेटाउने एआई निकै राम्रो',
          '🌐 भाषा अनुवाद र लाइभ ट्रान्सलेट धेरै उपयोगी',
          '🔍 स्क्रिनमा गोलो लगाएर खोज्ने फिचर सजिलो',
          '🤖 नयाँ एआई फिचरहरू दैनिक काममा सहयोगी छन्'
        ]
      },
      {
        id: 18,
        k: 'biometrics',
        category: 'Biometrics & Security',
        emoji: '👁️',
        title: '१८. फिंगरप्रिन्ट र फेस अनलक कत्तिको छिटो खुल्छ?',
        voiceText: (_name, phone) => `हातको औंठा छुवाउँदा वा अनुहार देखाउँदा फोन कत्तिको छिटो अनलक हुन्छ? अँध्यारोमा फेस अनलक खुल्छ?`,
        aiAcknowledgement: () => `सुरक्षा र सेन्सरको विवरण टिपोट भयो।`,
        hint: 'फिंगरप्रिन्ट र फेस अनलक स्पिड छान्नुहोस्',
        sampleText: 'औंठा छुवाउने बित्तिकै आँखा झिम्क्याउने समयमै फोन खुल्छ, अँध्यारोमा पनि फेस अनलक चल्छ।',
        options: [
          '⚡ छुवाउने बित्तिकै तुरुन्तै अनलक हुन्छ',
          '🌙 पूरै अँध्यारो कोठामा पनि फेस अनलकले चिन्छ',
          '🖐️ हात हल्का ओभानो हुँदा पनि मज्जाले खुल्छ',
          '🔒 अत्यन्तै भरपर्दो र सुरक्षित सेन्सर'
        ]
      },
      {
        id: 19,
        k: 'sound_haptics',
        category: 'Speakers & Haptics',
        emoji: '🔊',
        title: '१९. स्पिकरको आवाज कत्तिको ठूलो छ र टाइप गर्दा भाइब्रेसन कस्तो लाग्छ?',
        voiceText: (_name, phone) => `दुवै स्पिकरबाट आउने आवाज कत्तिको ठूलो र बेसयुक्त छ? किबोर्डमा टाइप गर्दा भाइब्रेसन कस्तो लाग्छ?`,
        aiAcknowledgement: () => `ध्वनि र कम्पन सम्बन्धी प्रतिक्रिया सुरक्षित भयो।`,
        hint: 'स्पिकरको आवाज र किबोर्ड भाइब्रेसन छान्नुहोस्',
        sampleText: 'स्पिकरको आवाज एकदमै ठूलो र क्लियर छ, टाइप गर्दाको भाइब्रेसन प्रिमियम लाग्छ।',
        options: [
          '🔊 ठूलो, स्पष्ट र बेस भरिएको स्टेरियो स्पिकर',
          '🎵 गीत र चलचित्र हेर्दा आवाज कोठाभरि गुन्जिन्छ',
          '📳 किबोर्डमा टाइप गर्दा क्रिस्प प्रिमियम भाइब्रेसन',
          '📞 लाउडस्पिकरमा कुरा गर्दा आवाज प्रष्ट सुनिन्छ'
        ]
      },
      {
        id: 20,
        k: 'network_5g',
        category: 'Network & 5G',
        emoji: '📶',
        title: '२०. ५G नेटवर्क सिग्नल, वाइफाइ र फोन कलको आवाज कस्तो छ?',
        voiceText: (_name, phone) => `कमजोर नेटवर्क भएको ठाउँ वा बेसमेन्टमा ५G सिग्नल कत्तिको बलियो आउँछ? फोन कल गर्दा आवाज सफा सुनिन्छ?`,
        aiAcknowledgement: () => `नेटवर्क र कनेक्टिभिटीको जानकारी टिपियो। अब अन्तिम प्रश्न!`,
        hint: '५G सिग्नल र कल क्लियारिटीबारे छान्नुहोस्',
        sampleText: 'घरभित्र पनि ५G सिग्नल फुल आउँछ, फोनमा कुरा गर्दा आवाज एकदमै सफा सुनिन्छ।',
        options: [
          '📶 घरभित्र र बेसमेन्टमा पनि बलियो ५G सिग्नल',
          '⚡ वाइफाइ डाउनलोड स्पिड असाध्यै छिटो',
          '🗣️ फोन कलमा दुवैतर्फको आवाज क्रिस्टल क्लियर',
          '🔄 दुईवटा सिम बीच सहजै स्विच हुन्छ'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Final Recommendation & Stars',
        emoji: '🌟',
        title: '२१. अन्तिम सल्लाह, सुधार गर्नुपर्ने कुरा र कति स्टार दिनुहुन्छ?',
        voiceText: (name, phone) => `अन्तिम प्रश्न, ${name || 'श्रीमान'}! यो ${phone} मा कम्पनीले सबैभन्दा पहिले के सुधार गर्नुपर्छ? र ५ मध्ये कति स्टार दिनुहुन्छ?`,
        aiAcknowledgement: (name) => `अन्तर्वार्ता पूरा भयो! धन्यवाद ${name || 'श्रीमान'}, तपाईंको भिडियो रिभ्यु सफल भयो।`,
        hint: 'सुधार गर्नुपर्ने बुँदा र स्टार रेटिंग छान्नुहोस्',
        sampleText: 'म मेरा सबै साथीहरूलाई यो फोन सिफारिस गर्दछु। मेरो तर्फबाट ५ मा ५ स्टार!',
        options: [
          '⭐⭐⭐⭐⭐ ५ स्टार - उत्कृष्ट फोन, सबैलाई सिफारिस गर्दछु!',
          '⭐⭐⭐⭐ ४ स्टार - पैसाको राम्रो कदर छ, ब्याट्री अझ राम्रो चाहिएला',
          '⭐⭐⭐ ३ स्टार - ठिकठाक फोन, केही अपडेट चाहिन्छ',
          '⭐⭐⭐⭐⭐ ५ स्टार - यो मूल्यमा बजारकै सबैभन्दा राम्रो फोन!'
        ]
      }
    ]
  },

  en: {
    label: 'English',
    flag: '🇬🇧',
    greeting: (name, phone) => `Namaste, ${name || 'Friend'}, and welcome to our app! Let's start your ${phone} video review.`,
    callConnectText: (name, phone) => `Connected! AI Voice Interview for your ${phone} is now live with ${name || 'Mr. Customer'}.`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Unboxing & Retail Box',
        emoji: '📦',
        title: '1. Show Phone to Camera & Purchase Experience',
        voiceText: (name, phone) => `Namaste, ${name || 'Friend'}! Welcome to our review studio. Please hold your ${phone} up to the camera and tell us where you bought it and what came in the retail box.`,
        aiAcknowledgement: (name) => `Great start, ${name || 'friend'}! Unboxing details logged. Moving to question 2.`,
        hint: 'Hold phone to camera or choose your answer below',
        actionPrompt: '📸 Show phone to camera & tap Snapshot button',
        sampleText: 'I purchased this phone 2 months ago from an authorized retail store. In-hand feel is solid and sleek.',
        options: [
          '🛍️ Bought from Authorized Store (Brand New)',
          '📦 Ordered Online - Safe Packaging & Box',
          '🎁 Received as a Gift from Family',
          '🏪 Purchased from Local Mobile Shop'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'In-Hand Comfort',
        emoji: '🖐️',
        title: '2. In-Hand Grip, Weight & Everyday Comfort',
        voiceText: (_name, phone) => `How does your ${phone} feel in your hand during long daily usage? Is it lightweight and comfortable for one-handed typing?`,
        aiAcknowledgement: () => `Got it! Ergonomics and grip feedback recorded. Let's move on.`,
        hint: 'Describe hand comfort, grip, and weight balance',
        actionPrompt: '🔄 Flip camera to show back panel and camera bump',
        sampleText: 'The ergonomic curved corners make one-handed typing effortless, and the weight is evenly balanced.',
        options: [
          '🖐️ Very comfortable & lightweight in hand',
          '📱 Perfect size for single-hand texting',
          '⚠️ Back glass feels slightly slippery without case',
          '👌 Ergonomic weight balance for long calls'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Display & Refresh Rate',
        emoji: '📱',
        title: '3. Display Quality, Colors & 120Hz Smoothness',
        voiceText: (_name, phone) => `Look at the screen! How vibrant are colors on this ${phone}, and does the 120Hz refresh rate feel butter smooth?`,
        aiAcknowledgement: () => `Understood! Screen and 120Hz fluidity thoughts saved.`,
        hint: 'Describe screen sharpness, color vibrance, and refresh rate',
        sampleText: 'The 120Hz display is super fluid, text is razor sharp, and movies look deeply cinematic.',
        options: [
          '⚡ Ultra-smooth 120Hz screen scrolling & animations',
          '🌈 Vibrant AMOLED colors with deep blacks',
          '🎬 Cinematic display for YouTube & Netflix',
          '✨ Gentle on the eyes during nighttime reading'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Outdoor Brightness',
        emoji: '☀️',
        title: '4. Outdoor Sunlight Visibility & Peak Brightness',
        voiceText: (_name, phone) => `Can you clearly read the ${phone} screen outdoors under direct harsh midday sunlight? How responsive is the auto-brightness?`,
        aiAcknowledgement: () => `Thanks! Outdoor sunlight visibility data captured.`,
        hint: 'Tell us how legible the screen is under bright sun',
        sampleText: 'Even under blazing midday sunshine, text and maps remain crystal clear without squinting.',
        options: [
          '☀️ Perfectly readable under direct bright sunlight',
          '💡 High 2000+ nits peak brightness capability',
          '⚡ Fast and accurate ambient auto-brightness',
          '🕶️ Slight outdoor reflection but very usable'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Daylight Camera',
        emoji: '📸',
        title: '5. Daylight Main Camera Quality & Sharpness',
        voiceText: (_name, phone) => `Now for the camera! How sharp and detailed are daylight photos with the ${phone}? Are colors lifelike or oversaturated?`,
        aiAcknowledgement: () => `Awesome! Camera detail and sharpness assessment noted.`,
        hint: 'Rate daylight photo detail, dynamic range, and colors',
        sampleText: 'The primary camera captures crisp daylight photos with natural skin tones and rich dynamic range.',
        options: [
          '📸 Crisp 50MP/200MP details and natural colors (10/10)',
          '🎨 Accurate true-to-life color reproduction',
          '⚡ Zero shutter lag when capturing fast motion',
          '🌿 Sharp foliage and facial textures'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Night Photography',
        emoji: '🌙',
        title: '6. Low-Light & Night Mode Photography',
        voiceText: (_name, phone) => `How does your ${phone} perform at night or in dim indoor rooms? Does Night Mode brighten dark scenes without grainy noise?`,
        aiAcknowledgement: () => `Great insight! Low-light night photography recorded.`,
        hint: 'Evaluate dark room photos, street lights, and lens flare',
        sampleText: 'Night mode produces bright, noise-free images with excellent street lamp highlight control.',
        options: [
          '🌙 Bright, noise-free shots in complete darkness',
          '💡 Excellent control of street light reflections',
          '⏳ Fast 1-2 second night exposure processing',
          '🌃 Great indoor low-light party photos'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Portrait & Bokeh',
        emoji: '🎭',
        title: '7. Portrait Mode, Bokeh & Skin Tone Accuracy',
        voiceText: (_name, phone) => `When shooting portraits, how natural are skin tones? Does the background blur cleanly around hair and glasses?`,
        aiAcknowledgement: () => `Noted! Portrait edge separation and skin tone feedback saved.`,
        hint: 'Tell us about background bokeh blur and hair edge detection',
        sampleText: 'It produces creamy DSLR-style bokeh, separates messy hair cleanly, and keeps skin tones authentic.',
        options: [
          '🎭 Creamy DSLR-like background bokeh separation',
          '✨ Natural and authentic skin tone reproduction',
          '✂️ Clean edge detection around hair and spectacles',
          '📸 Studio-quality lighting portrait effects'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Zoom & Ultra-Wide',
        emoji: '🔍',
        title: '8. Ultra-Wide & Optical Zoom Capabilities',
        voiceText: (_name, phone) => `Have you tested the ultra-wide lens or zoomed in on distant subjects? How clear are zoom photos on this ${phone}?`,
        aiAcknowledgement: () => `Understood! Zoom lens and ultra-wide impressions stored.`,
        hint: 'Rate 0.5x ultra-wide and optical 3x/5x telephoto zoom',
        sampleText: 'Zooming in up to 5x maintains sharp text and zero pixelation, and ultra-wide fits huge landscapes.',
        options: [
          '🔭 Sharp optical telephoto zoom with zero pixelation',
          '🏔️ Expansive 120° distortion-free ultra-wide view',
          '🔍 Impressive close-up macro shots of flowers',
          '👌 Consistent colors across all rear lenses'
        ]
      },
      {
        id: 9,
        k: 'camera_video',
        category: 'Video & Stabilization',
        emoji: '🎥',
        title: '9. Video Recording Smoothness & Stabilization',
        voiceText: (_name, phone) => `How smooth are handheld walking videos in 4K? Is the optical image stabilization rock steady?`,
        aiAcknowledgement: () => `Excellent! Video stabilization and mic clarity recorded.`,
        hint: 'Tell us about handheld walking 4K video and microphone audio',
        sampleText: 'Handheld 4K recording is buttery smooth like a dedicated gimbal, and stereo mic sound is clear.',
        options: [
          '🎥 Gimbal-smooth 4K video with zero walking shake',
          '🎙️ Clear stereo microphones with wind reduction',
          '⚡ 60fps ultra-fluid cinematic motion',
          '🎬 Fast auto-focus tracking on moving subjects'
        ]
      },
      {
        id: 10,
        k: 'camera_selfie',
        category: 'Front Selfie Camera',
        emoji: '🤳',
        title: '10. Front Selfie Camera & Video Calling Clarity',
        voiceText: (_name, phone) => `Look into the front camera! How clear are your selfies and WhatsApp or FaceTime video calls on this ${phone}?`,
        aiAcknowledgement: () => `Thanks! Front selfie camera performance noted.`,
        hint: 'Evaluate front selfie sharpness and video call quality',
        sampleText: 'The front camera looks sharp and natural on video calls, without artificial over-smoothing.',
        options: [
          '🤳 Crisp and natural selfie photos without over-smoothing',
          '📞 Crystal clear WhatsApp and FaceTime video calls',
          '👥 Wide-angle field of view for group selfies',
          '✨ Great low-light exposure for late night calls'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Daily Speed & RAM',
        emoji: '⚡',
        title: '11. Daily Speed, App Switching & RAM Multitasking',
        voiceText: (_name, phone) => `How snappy is the ${phone} during daily multitasking? Do apps open immediately without closing in the background?`,
        aiAcknowledgement: () => `Crucial feedback! Speed and RAM multitasking logged.`,
        hint: 'Comment on everyday app opening speed, stutter, and RAM',
        sampleText: 'Multitasking is instantaneous. I can switch between 15 apps and none reload from scratch.',
        options: [
          '⚡ Zero lag or stutter, instant app launching',
          '📑 Keeps 15+ apps open in RAM without reloading',
          '🚀 Lightning-fast fluid system animations',
          '💨 Handles busy workdays with effortless speed'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Heavy Gaming',
        emoji: '🎮',
        title: '12. Heavy Gaming & Graphic Performance',
        voiceText: (_name, phone) => `How does your ${phone} handle intensive games like PUBG, Free Fire, or Genshin? Are frame rates rock solid?`,
        aiAcknowledgement: () => `Gamer feedback captured! Moving to thermal performance.`,
        hint: 'Rate FPS stability, touch response, and gyro delay in games',
        sampleText: 'Rock solid 90 FPS in PUBG with zero frame drops and instantaneous gyroscope response.',
        options: [
          '🎮 Consistent 90/120 FPS in PUBG with zero stutter',
          '🎯 Ultra-responsive touch sampling & instant gyro',
          '🕹️ Smooth gameplay even after 45 minutes of action',
          '🔥 Warms up slightly during long sessions but playable'
        ]
      },
      {
        id: 13,
        k: 'heating',
        category: 'Heating & Thermal',
        emoji: '🔥',
        title: '13. Thermal Management & Overheating Issues',
        voiceText: (_name, phone) => `Be 100% honest: does the ${phone} body or frame get hot during long calls, gaming, or fast charging?`,
        aiAcknowledgement: () => `Thank you for the honesty! Thermal behavior saved.`,
        hint: 'Mention if the phone stays cool or gets uncomfortably warm',
        sampleText: 'Normal everyday tasks stay cool. During heavy gaming the camera bump warms up mildly.',
        options: [
          '❄️ Phone stays comfortably cool during everyday usage',
          '🌡️ Mild warmth around camera island during heavy gaming',
          '🔥 Noticeable heat during outdoor camera recording in summer',
          '🛡️ Vapor chamber dissipates heat quickly after tasks'
        ]
      },
      {
        id: 14,
        k: 'battery',
        category: 'Battery Endurance',
        emoji: '🔋',
        title: '14. Battery Life & Full-Day Screen-on-Time',
        voiceText: (_name, phone) => `How long does a full charge last on your ${phone}? Does it comfortably get you through morning to bedtime?`,
        aiAcknowledgement: () => `Great! Battery endurance and screen time statistics noted.`,
        hint: 'Tell us how many hours of battery life you get',
        sampleText: 'It easily lasts from 7 AM to 11 PM with 30% battery remaining after heavy social media and calls.',
        options: [
          '🔋 Easily lasts from morning to night with 30% to spare',
          '⚡ Up to 1.5 days of endurance on moderate usage',
          '🌙 Minimal 1-2% battery drain overnight on standby',
          '⚠️ Heavy 5G users might need a top-up by evening'
        ]
      },
      {
        id: 15,
        k: 'charging',
        category: 'Fast Charging',
        emoji: '⚡',
        title: '15. Fast Charging Speed & Adapter Experience',
        voiceText: (_name, phone) => `How fast does the ${phone} charge from 0 to 100%? Does it support wireless charging?`,
        aiAcknowledgement: () => `Logged! Charging speed and adapter observations saved.`,
        hint: 'Provide charging time in minutes and charger in box',
        sampleText: 'It charges from 0 to 70% in just 25 minutes. Extremely convenient before heading out.',
        options: [
          '⚡ Charges 0 to 100% in 30-45 minutes',
          '⏱️ 15-minute quick charge yields enough for half a day',
          '🔋 Convenient wireless charging support',
          '🔌 No power adapter in retail box, bought separately'
        ]
      },
      {
        id: 16,
        k: 'os_ui',
        category: 'Software & UI',
        emoji: '⚙️',
        title: '16. Operating System, UI Cleanliness & Bloatware',
        voiceText: (_name, phone) => `How do you like the software on this ${phone}? Is it clean and intuitive, or are there spam notifications and bloatware?`,
        aiAcknowledgement: () => `Understood! OS and software experience recorded.`,
        hint: 'Comment on software animations, ads, and preinstalled apps',
        sampleText: 'The operating system is sleek, uncluttered, and free of lockscreen ads or annoying spam.',
        options: [
          '✨ Clean, ad-free interface with smooth system animations',
          '🎨 Deep customization with intuitive home screen widgets',
          '🔄 Prompt monthly software updates and bug fixes',
          '⚠️ A few pre-installed brand apps that cannot be removed'
        ]
      },
      {
        id: 17,
        k: 'ai_features',
        category: 'Smart AI Features',
        emoji: '🤖',
        title: '17. Brand AI Features & Practical Productivity',
        voiceText: (_name, phone) => `Have you tried the built-in AI tools like object eraser, live translation, or circle to search on your ${phone}?`,
        aiAcknowledgement: () => `Valuable insights! Practical AI adoption noted.`,
        hint: 'Evaluate AI photo editing, translation, and summaries',
        sampleText: 'The AI photo object eraser is magic for deleting photobombers, and live translation is super helpful.',
        options: [
          '🪄 Magic photo eraser deletes photobombers flawlessly',
          '🌐 Live call translation and voice transcription work well',
          '🔍 Circle to Search is fast and intuitive',
          '🤖 Built-in AI features genuinely save time every day'
        ]
      },
      {
        id: 18,
        k: 'biometrics',
        category: 'Biometrics & Security',
        emoji: '👁️',
        title: '18. Fingerprint Scanner & Face Unlock Speed',
        voiceText: (_name, phone) => `How quick and reliable is the fingerprint scanner and Face Unlock? Does it recognize you in dark rooms or with moist fingers?`,
        aiAcknowledgement: () => `Security sensor performance captured!`,
        hint: 'Rate biometric unlock speed and low-light accuracy',
        sampleText: 'The fingerprint reader unlocks in a split second, and Face Unlock works reliably even in pitch black.',
        options: [
          '⚡ Instant split-second fingerprint unlocking',
          '🌙 Reliable Face Unlock even in pitch black rooms',
          '🖐️ Scans reliably with slightly damp fingers',
          '🔒 Highly secure and dependable biometric authentication'
        ]
      },
      {
        id: 19,
        k: 'sound_haptics',
        category: 'Speakers & Haptics',
        emoji: '🔊',
        title: '19. Dual Stereo Speakers & Haptic Vibration',
        voiceText: (_name, phone) => `How loud and rich is the sound from the stereo speakers? And how crisp is the keyboard vibration when typing?`,
        aiAcknowledgement: () => `Acoustic and haptic feedback saved!`,
        hint: 'Review speaker loudness, bass, and keyboard haptic clicks',
        sampleText: 'The stereo speakers are remarkably loud with clear bass, and typing haptics feel crisp and mechanical.',
        options: [
          '🔊 Loud, room-filling stereo sound with punchy bass',
          '🎵 Clear dialogue for movies and YouTube streaming',
          '📳 Crisp premium haptic clicks on keyboard typing',
          '📞 Loud and distinct speakerphone audio'
        ]
      },
      {
        id: 20,
        k: 'network_5g',
        category: 'Network & 5G',
        emoji: '📶',
        title: '20. 5G Network Reception, Wi-Fi & Call Clarity',
        voiceText: (_name, phone) => `How strong is network reception in elevators or basements? Are voice calls crystal clear over 5G and VoLTE?`,
        aiAcknowledgement: () => `Connectivity notes saved! Ready for the final question.`,
        hint: 'Rate 5G signal reception, Wi-Fi speed, and phone call quality',
        sampleText: 'Solid 5G reception throughout town, fast Wi-Fi speeds, and crystal clear call audio on both ends.',
        options: [
          '📶 Strong 5G signal reception even in indoor basements',
          '⚡ Blazing fast Wi-Fi download and upload speeds',
          '🗣️ Crystal clear voice call audio without dropouts',
          '🔄 Seamless dual SIM mobile data switching'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Final Recommendation & Stars',
        emoji: '🌟',
        title: '21. Critical Flaws, Recommendation & Star Rating',
        voiceText: (name, phone) => `Final question, ${name || 'friend'}! What is the #1 thing the company must improve, and how many stars out of 5 do you give this ${phone}?`,
        aiAcknowledgement: (name) => `Interview complete! Thank you, ${name || 'friend'}, for your comprehensive video review.`,
        hint: 'Give your final star rating and biggest advice',
        sampleText: 'I definitely recommend this phone to anyone seeking reliable performance. I give it 5 out of 5 stars!',
        options: [
          '⭐⭐⭐⭐⭐ 5 Stars - Highly Recommended, Must Buy!',
          '⭐⭐⭐⭐ 4 Stars - Great Value For Money',
          '⭐⭐⭐ 3 Stars - Average Everyday Phone',
          '⭐⭐⭐⭐⭐ 5 Stars - Best In Class Flagship Experience!'
        ]
      }
    ]
  },

  hi: {
    label: 'हिंदी (Hindi)',
    flag: '🇮🇳',
    greeting: (name, phone) => `नमस्ते, ${name || 'श्रीमान'}, हमारे ऐप में आपका स्वागत है! चलिए ${phone} का वीडियो रिव्यू शुरू करते हैं।`,
    callConnectText: (name, phone) => `कॉल कनेक्ट हो गई है! ${phone} के लिए AI वॉइस इंटरव्यू शुरू हो चुका है।`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Unboxing & Retail Box',
        emoji: '📦',
        title: '1. फोन कैमरे पर दिखाएं और खरीद का अनुभव बताएं',
        voiceText: (name, phone) => `नमस्ते, ${name || 'श्रीमान'}, हमारे ऐप में आपका स्वागत है! सबसे पहले अपना ${phone} कैमरे के सामने दिखाएं और बताएं आपने यह कहां से खरीदा और बॉक्स में क्या मिला।`,
        aiAcknowledgement: (name) => `बहुत खूब, ${name || 'जी'}! अनबॉक्सिंग की जानकारी दर्ज हो गई। अगले सवाल पर चलते हैं।`,
        hint: 'कैमरे पर फोन दिखाएं या नीचे से जवाब चुनें',
        actionPrompt: '📸 फोन कैमरे पर दिखाएं और फोटो लें',
        sampleText: 'मैंने यह फोन 2 महीने पहले अधिकृत स्टोर से लिया था, इसका लुक काफी प्रीमियम है।',
        options: [
          '🛍️ अधिकृत स्टोर से खरीदा (बिल्कुल नया)',
          '📦 ऑनलाइन मंगाया - सुरक्षित पैकिंग और ओरिजिनल',
          '🎁 परिवार या दोस्त से गिफ्ट मिला',
          '🏪 नजदीकी मोबाइल दुकान से खरीदा'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'In-Hand Comfort',
        emoji: '🖐️',
        title: '2. हाथ में पकड़ने पर ग्रिप और वजन कैसा लगता है?',
        voiceText: (_name, phone) => `दिनभर इस्तेमाल में ${phone} हाथ में पकड़ने में कैसा लगता है? क्या एक हाथ से टाइप करना आसान है?`,
        aiAcknowledgement: () => `बढ़िया! ग्रिप और कम्फर्ट का डेटा दर्ज हो गया।`,
        hint: 'हाथ में पकड़ने की सुविधा और वजन का विकल्प चुनें',
        actionPrompt: '🔄 कैमरा घुमाकर बैक पैनल दिखाएं',
        sampleText: 'हाथ में पकड़ने में काफी हल्का और बैलेंस्ड है। साइड फ्रेम की ग्रिप मजबूत है।',
        options: [
          '🖐️ हाथ में हल्का और आरामदायक ग्रिप, फिसलता नहीं',
          '📱 एक हाथ से चलाने और टाइप करने में आसान',
          '⚠️ बिना बैक कवर के थोड़ा फिसलता है',
          '👌 देर तक फोन चलाने पर भी हाथ नहीं थकता'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Display & Refresh Rate',
        emoji: '📱',
        title: '3. 120Hz डिस्प्ले और रंगों की क्वालिटी कैसी है?',
        voiceText: (_name, phone) => `इस ${phone} की स्क्रीन कितनी स्मूथ है? 120Hz पर स्क्रॉलिंग और वीडियो का अनुभव कैसा है?`,
        aiAcknowledgement: () => `नोट कर लिया गया! डिस्प्ले की समीक्षा सुरक्षित हो गई।`,
        hint: 'डिस्प्ले और रंगों की क्वालिटी बताएं',
        sampleText: '120Hz स्क्रीन काफी स्मूथ है और वीडियो देखते समय कलर्स बहुत खूबसूरत लगते हैं।',
        options: [
          '⚡ सुपर स्मूथ 120Hz स्क्रीन स्क्रॉलिंग और स्पीड',
          '🌈 चटक और जीवंत AMOLED कलर्स',
          '🎬 यूट्यूब और मूवीज के लिए शानदार स्क्रीन',
          '✨ आंखों पर जोर न डालने वाला डिस्प्ले'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Outdoor Brightness',
        emoji: '☀️',
        title: '4. तेज धूप में बाहर स्क्रीन कितनी साफ दिखती है?',
        voiceText: (_name, phone) => `दोपहर की तेज धूप में बाहर जाने पर ${phone} की स्क्रीन आसानी से पढ़ी जा सकती है?`,
        aiAcknowledgement: () => `धन्यवाद! धूप में स्क्रीन विजिबिलिटी की जानकारी सेव हो गई।`,
        hint: 'तेज धूप में स्क्रीन की ब्राइटनेस बताएं',
        sampleText: 'कड़क धूप में भी स्क्रीन साफ दिखाई देती है, टेक्स्ट पढ़ने में कोई दिक्कत नहीं होती।',
        options: [
          '☀️ तेज धूप में भी सब कुछ साफ दिखाई देता है',
          '💡 2000+ निट्स की शानदार पीक ब्राइटनेस',
          '⚡ ऑटो ब्राइटनेस तुरंत एडजस्ट होती है',
          '🕶️ हल्का रिफ्लेक्शन होता है लेकिन काम चल जाता है'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Daylight Camera',
        emoji: '📸',
        title: '5. दिन के उजाले में मुख्य कैमरे की फोटो कैसी आती है?',
        voiceText: (_name, phone) => `अब कैमरे की बात करें! दिन के उजाले में ${phone} कितनी शार्प और साफ फोटो खींचता है?`,
        aiAcknowledgement: () => `शानदार! प्राइमरी कैमरे की डिटेल्स नोट हो गईं।`,
        hint: 'कैमरे की डिटेल्स और रंगों की क्वालिटी बताएं',
        sampleText: 'मेन कैमरा काफी शार्प और नेचुरल फोटो खींचता है, रंगों में कोई बनावटीपन नहीं है।',
        options: [
          '📸 कैमरा डिटेल्स और क्लैरिटी शानदार (10/10)',
          '🎨 बिल्कुल नेचुरल और वास्तविक कलर्स',
          '⚡ बिना किसी देरी के तुरंत फोटो क्लिक होती है',
          '🌿 चेहरे और बैकग्राउंड की बारीक डिटेल्स स्पष्ट हैं'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Night Photography',
        emoji: '🌙',
        title: '6. रात में या नाइट मोड में फोटो कैसी आती है?',
        voiceText: (_name, phone) => `रात के समय या कमरे की हल्की रोशनी में ${phone} का नाइट मोड कैसी फोटो निकालता है?`,
        aiAcknowledgement: () => `नाइस! नाइट फोटोग्राफी का फीडबैक दर्ज हुआ।`,
        hint: 'नाइट मोड और अंधेरे की फोटो क्वालिटी बताएं',
        sampleText: 'नाइट मोड में अंधेरे में भी काफी ब्राइट और बिना ग्रेन वाली साफ फोटो आती है।',
        options: [
          '🌙 रात में भी काफी ब्राइट और साफ फोटो',
          '💡 स्ट्रीट लाइट्स का फैलाव कंट्रोल रहता है',
          '⏳ 1-2 सेकंड में फास्ट नाइट प्रोसेसिंग',
          '🌃 पार्टी और इंडोर लाइट में अच्छा काम करता है'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Portrait & Bokeh',
        emoji: '🎭',
        title: '7. पोर्ट्रेट मोड, बैकग्राउंड ब्लर और स्किन टोन कैसा है?',
        voiceText: (_name, phone) => `पोर्ट्रेट फोटो में बैकग्राउंड का ब्लर और चेहरे का स्किन टोन कितना नेचुरल दिखता है?`,
        aiAcknowledgement: () => `सही अवलोकन! पोर्ट्रेट मोड की डिटेल्स सेव हो गईं।`,
        hint: 'पोर्ट्रेट ब्लर और स्किन टोन का विकल्प चुनें',
        sampleText: 'डीएसएलआर जैसा सुंदर ब्लर आता है और बालों के किनारों को बहुत सफाई से काटता है।',
        options: [
          '🎭 डीएसएलआर जैसा नेचुरल बैकग्राउंड ब्लर',
          '✨ असली और नेचुरल स्किन टोन',
          '✂️ बालों और चश्मे के किनारे साफ कटते हैं',
          '📸 स्टूडियो लाइटिंग जैसी आकर्षक पोर्ट्रेट फोटो'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Zoom & Ultra-Wide',
        emoji: '🔍',
        title: '8. अल्ट्रा-वाइड और जूम लेंस का अनुभव कैसा है?',
        voiceText: (_name, phone) => `क्या आपने दूर की चीजों को जूम करके या अल्ट्रा-वाइड से फोटो ली है? क्वालिटी कैसी रही?`,
        aiAcknowledgement: () => `समझा गया! जूम लेंस का रिव्यू सुरक्षित हो गया।`,
        hint: 'जूम और अल्ट्रा-वाइड फोटो क्वालिटी बताएं',
        sampleText: '5 गुना तक जूम करने पर भी फोटो फटती नहीं है, अल्ट्रा-वाइड भी काफी चौड़ा व्यू देता है।',
        options: [
          '🔭 बिना क्वालिटी खोए शार्प ऑप्टिकल जूम',
          '🏔️ बिना मुड़े हुए बड़ा 120° अल्ट्रा-वाइड व्यू',
          '🔍 पास की चीजों के लिए बेहतरीन मैक्रो शॉट्स',
          '👌 सभी लेंसों में एक जैसे कलर्स'
        ]
      },
      {
        id: 9,
        k: 'camera_video',
        category: 'Video & Stabilization',
        emoji: '🎥',
        title: '9. वीडियो रिकॉर्डिंग कितनी स्मूथ और स्टेबल रहती है?',
        voiceText: (_name, phone) => `चलते हुए 4K वीडियो रिकॉर्ड करते समय वीडियो हिलता है या स्थिर रहता है? माइक की आवाज कैसी है?`,
        aiAcknowledgement: () => `बहुत खूब! वीडियो स्टेबलाइजेशन की समीक्षा दर्ज हुई।`,
        hint: 'वीडियो स्थिरता और माइक की आवाज बताएं',
        sampleText: 'चलते हुए 4K वीडियो भी गिंबल की तरह स्थिर रहता है, आवाज बहुत साफ रिकॉर्ड होती है।',
        options: [
          '🎥 गिंबल जैसी स्मूथ 4K वीडियो स्टेबलाइजेशन',
          '🎙️ माइक की आवाज लाउड और क्लियर रिकॉर्ड होती है',
          '⚡ 60fps पर सुपर स्मूथ सिनेमैटिक मोशन',
          '🎬 चलते हुए ऑब्जेक्ट्स पर तुरंत फोकस'
        ]
      },
      {
        id: 10,
        k: 'camera_selfie',
        category: 'Front Selfie Camera',
        emoji: '🤳',
        title: '10. फ्रंट सेल्फी कैमरा और वीडियो कॉल कैसी है?',
        voiceText: (_name, phone) => `फ्रंट कैमरे की तरफ देखें! सेल्फी और व्हाट्सएप वीडियो कॉल में आपका चेहरा कितना साफ दिखता है?`,
        aiAcknowledgement: () => `सेल्फी कैमरा परफॉर्मेंस नोट हो गई!`,
        hint: 'सेल्फी और वीडियो कॉल क्वालिटी बताएं',
        sampleText: 'सेल्फी काफी साफ आती है और वीडियो कॉल में चेहरा एकदम स्पष्ट दिखता है।',
        options: [
          '🤳 बिना ज्यादा स्मूथ किए नेचुरल और साफ सेल्फी',
          '📞 व्हाट्सएप और वीडियो कॉल में चेहरा साफ दिखता है',
          '👥 दोस्तों के साथ ग्रुप सेल्फी के लिए अच्छा एंगल',
          '✨ कम रोशनी में भी बढ़िया सेल्फी आती है'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Daily Speed & RAM',
        emoji: '⚡',
        title: '11. रोजमर्रा की स्पीड कैसी है? क्या कभी हैंग होता है?',
        voiceText: (_name, phone) => `रोजाना कई ऐप्स एक साथ चलाने पर ${phone} की स्पीड कैसी रहती है? कभी कोई हैंग या लैग हुआ?`,
        aiAcknowledgement: () => `महत्वपूर्ण इनपुट! स्पीड और रैम परफॉर्मेंस सेव हो गई।`,
        hint: 'ऐप्स खुलने की स्पीड और लैग बताएं',
        sampleText: 'फोन कभी अटकता नहीं है, सारे ऐप्स तुरंत खुल जाते हैं और फोन मक्खन की तरह चलता है।',
        options: [
          '⚡ बिना किसी लैग या हैंग के बहुत तेज चलता है',
          '📑 बैकग्राउंड में 15 से ज्यादा ऐप्स खुले रहते हैं',
          '🚀 ऐप्स तुरंत एक पल में खुल जाते हैं',
          '💨 मल्टीटास्किंग बहुत आसान और तेज है'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Heavy Gaming',
        emoji: '🎮',
        title: '12. पबजी, फ्री-फायर जैसे भारी गेम्स में परफॉर्मेंस कैसी है?',
        voiceText: (_name, phone) => `क्या आपने ${phone} में पबजी या फ्री-फायर खेला है? फ्रेम रेट स्टेबल रहता है या गिरता है?`,
        aiAcknowledgement: () => `गेमिंग फीडबैक नोट हो गया! अगले प्रश्न पर चलते हैं।`,
        hint: 'गेमिंग स्मूथनेस और फ्रेम रेट बताएं',
        sampleText: 'पबजी में स्मूथ 90 FPS मिलता है, जायरोस्कोप बहुत तेज है और गेम खेलने में मजा आता है।',
        options: [
          '🎮 पबजी में बिना अटके स्मूथ 90 FPS',
          '🎯 फास्ट टच रिस्पॉन्स और तुरंत जायरोस्कोप',
          '🕹️ 45 मिनट लगातार खेलने पर भी स्मूथ',
          '🔥 ज्यादा देर खेलने पर हल्का गर्म होता है'
        ]
      },
      {
        id: 13,
        k: 'heating',
        category: 'Heating & Thermal',
        emoji: '🔥',
        title: '13. क्या फोन चलाने पर ज्यादा गर्म या ओवरहीट होता है?',
        voiceText: (_name, phone) => `ईमानदारी से बताएं—लंबे समय तक गेम खेलने या धूप में फोन चलाने पर क्या बॉडी बहुत गर्म होती है?`,
        aiAcknowledgement: () => `सच्चाई के लिए धन्यवाद! हीटिंग का डेटा सुरक्षित हुआ।`,
        hint: 'फोन गर्म होने या ठंडा रहने की बात बताएं',
        sampleText: 'नॉर्मल यूज में बिल्कुल ठंडा रहता है, भारी गेमिंग पर कैमरे के पास हल्का गर्म होता है।',
        options: [
          '❄️ रोजमर्रा इस्तेमाल में फोन बिल्कुल ठंडा रहता है',
          '🌡️ भारी गेमिंग पर कैमरे के पास मामूली गरमी',
          '🔥 गर्मियों में धूप में कैमरा चलाने पर गर्म होता है',
          '🛡️ काम खत्म होते ही फोन तुरंत ठंडा हो जाता है'
        ]
      },
      {
        id: 14,
        k: 'battery',
        category: 'Battery Endurance',
        emoji: '🔋',
        title: '14. एक बार चार्ज करने पर बैटरी कितने समय चलती है?',
        voiceText: (_name, phone) => `इस ${phone} की बैटरी कितनी देर टिकती है? सुबह से लेकर रात तक आराम से चल जाती है?`,
        aiAcknowledgement: () => `बैटरी बैकअप का रिकॉर्ड सेव कर लिया गया!`,
        hint: 'बैटरी चलने का समय और बैकअप बताएं',
        sampleText: 'दिनभर कॉलिंग, यूट्यूब और सोशल मीडिया चलाने के बाद भी रात को 25% बैटरी बची रहती है।',
        options: [
          '🔋 सुबह से रात तक आराम से चलती है, दमदार बैकअप',
          '⚡ नॉर्मल इस्तेमाल पर 1.5 दिन तक चल जाती है',
          '🌙 रातभर स्टैंडबाय में सिर्फ 1-2% बैटरी गिरती है',
          '⚠️ भारी 5G इस्तेमाल में शाम तक चार्ज की जरूरत'
        ]
      },
      {
        id: 15,
        k: 'charging',
        category: 'Fast Charging',
        emoji: '⚡',
        title: '15. फोन फुल चार्ज होने में कितने मिनट लेता है?',
        voiceText: (_name, phone) => `0 से 100 प्रतिशत चार्ज होने में कितना समय लगता है? क्या चार्जिंग के समय फोन गर्म होता है?`,
        aiAcknowledgement: () => `चार्जिंग स्पीड और अनुभव दर्ज हो गया!`,
        hint: 'चार्जिंग में लगने वाला समय बताएं',
        sampleText: 'आधे घंटे में ही 70% से ज्यादा चार्ज हो जाता है, बहुत तेज चार्जिंग है।',
        options: [
          '⚡ 30 से 45 मिनट में पूरा फुल चार्ज हो जाता है',
          '⏱️ 15 मिनट की चार्जिंग में आधा दिन निकल जाता है',
          '🔋 वायरलेस चार्जिंग की सुविधा काफी अच्छी है',
          '🔌 बॉक्स में चार्जर नहीं था, अलग से खरीदना पड़ा'
        ]
      },
      {
        id: 16,
        k: 'os_ui',
        category: 'Software & UI',
        emoji: '⚙️',
        title: '16. सॉफ्टवेयर चलाने में कैसा है? क्या फालतू विज्ञापन आते हैं?',
        voiceText: (_name, phone) => `इस ${phone} का सॉफ्टवेयर इंटरफेस कैसा लगा? क्या लॉकस्क्रीन पर कोई अनचाहे विज्ञापन आते हैं?`,
        aiAcknowledgement: () => `सॉफ्टवेयर एक्सपीरियंस का फीडबैक नोट हो गया!`,
        hint: 'सॉफ्टवेयर की सफाई और विज्ञापनों के बारे में बताएं',
        sampleText: 'सॉफ्टवेयर बहुत साफ-सुथरा है, कोई फालतू ऐड या बकवास ऐप्स नहीं हैं।',
        options: [
          '✨ बिना किसी विज्ञापन के साफ और स्मूथ इंटरफेस',
          '🎨 कस्टमाइजेशन और सुंदर विजेट्स की सुविधा',
          '🔄 समय पर नए सॉफ्टवेयर और सिक्योरिटी अपडेट्स',
          '⚠️ कुछ पहले से इंस्टॉल ऐप्स जो हटाए नहीं जा सकते'
        ]
      },
      {
        id: 17,
        k: 'ai_features',
        category: 'Smart AI Features',
        emoji: '🤖',
        title: '17. फोन के स्मार्ट AI फीचर्स कितने काम के हैं?',
        voiceText: (_name, phone) => `क्या आपने फोटो से चीजें हटाने, लाइव ट्रांसलेट या सर्कल टू सर्च वाले AI फीचर्स इस्तेमाल किए?`,
        aiAcknowledgement: () => `AI फीचर्स का रिव्यू सुरक्षित हो गया!`,
        hint: 'AI फोटो इरेजर और ट्रांसलेशन के बारे में बताएं',
        sampleText: 'फोटो से अनचाहे लोगों को हटाने वाला मैजिक इरेजर वाकई बहुत कमाल का है।',
        options: [
          '🪄 फोटो से चीजें हटाने वाला AI इरेजर बहुत उपयोगी है',
          '🌐 कॉल और टेक्स्ट ट्रांसलेशन काफी काम आता है',
          '🔍 स्क्रीन पर सर्कल करके सर्च करना बहुत आसान है',
          '🤖 नए AI फीचर्स रोजमर्रा के कामों में समय बचाते हैं'
        ]
      },
      {
        id: 18,
        k: 'biometrics',
        category: 'Biometrics & Security',
        emoji: '👁️',
        title: '18. फिंगरप्रिंट और फेस अनलॉक कितनी तेजी से खुलता है?',
        voiceText: (_name, phone) => `फिंगरप्रिंट और फेस अनलॉक कितना तेज है? क्या अंधेरे कमरे में फेस अनलॉक पहचान लेता है?`,
        aiAcknowledgement: () => `बायोमेट्रिक्स और सुरक्षा का डेटा दर्ज हुआ!`,
        hint: 'फिंगरप्रिंट और फेस अनलॉक की स्पीड बताएं',
        sampleText: 'उंगली टच करते ही तुरंत स्क्रीन खुल जाती है, अंधेरे में भी फेस अनलॉक काम करता है।',
        options: [
          '⚡ टच करते ही पलक झपकते अनलॉक हो जाता है',
          '🌙 बिल्कुल अंधेरे में भी फेस अनलॉक पहचान लेता है',
          '🖐️ हल्की गीली उंगलियों से भी खुल जाता है',
          '🔒 बहुत सुरक्षित और भरोसेमंद बायोमेट्रिक सेंसर'
        ]
      },
      {
        id: 19,
        k: 'sound_haptics',
        category: 'Speakers & Haptics',
        emoji: '🔊',
        title: '19. स्टीरियो स्पीकर की आवाज और टाइपिंग वाइब्रेशन कैसा है?',
        voiceText: (_name, phone) => `स्पीकर्स से आने वाली आवाज कितनी तेज और बेस से भरी है? कीबोर्ड पर टाइप करते वक्त वाइब्रेशन कैसा लगता है?`,
        aiAcknowledgement: () => `ऑडियो और हैप्टिक्स का फीडबैक दर्ज हुआ!`,
        hint: 'स्पीकर की आवाज और वाइब्रेशन बताएं',
        sampleText: 'स्पीकर्स की आवाज बहुत लाउड और क्लियर है, कीबोर्ड की टाइपिंग वाइब्रेशन प्रीमियम लगती है।',
        options: [
          '🔊 लाउड, क्लियर और बेस से भरा स्टीरियो साउंड',
          '🎵 मूवीज और गानों के लिए बेहतरीन आवाज',
          '📳 टाइप करते समय क्रिस्प प्रीमियम वाइब्रेशन',
          '📞 लाउडस्पीकर पर बात करते समय साफ आवाज'
        ]
      },
      {
        id: 20,
        k: 'network_5g',
        category: 'Network & 5G',
        emoji: '📶',
        title: '20. 5G नेटवर्क सिग्नल, वाई-फाई और कॉलिंग कैसी है?',
        voiceText: (_name, phone) => `कमजोर नेटवर्क वाली जगहों पर 5G सिग्नल कैसा रहता है? फोन कॉल पर आवाज साफ आती है?`,
        aiAcknowledgement: () => `कनेक्टिविटी रिव्यू दर्ज हुआ! अब अंतिम सवाल पर चलते हैं।`,
        hint: '5G सिग्नल और कॉल क्लैरिटी बताएं',
        sampleText: 'घर के अंदर भी 5G नेटवर्क फुल रहता है, फोन पर बात करते समय आवाज बहुत साफ आती है।',
        options: [
          '📶 घर के अंदर और बेसमेंट में भी मजबूत 5G सिग्नल',
          '⚡ वाई-फाई डाउनलोड स्पीड बहुत तेज है',
          '🗣️ फोन कॉल पर दोनों तरफ साफ आवाज सुनाई देती है',
          '🔄 दो सिम कार्ड्स के बीच आसानी से डेटा स्विच होता है'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Final Recommendation & Stars',
        emoji: '🌟',
        title: '21. अंतिम सलाह, क्या सुधार चाहिए और 5 में से कितने स्टार?',
        voiceText: (name, phone) => `आखिरी सवाल, ${name || 'श्रीमान'}! इस ${phone} में कंपनी को सबसे पहले क्या सुधारना चाहिए? और 5 में से कितने स्टार देंगे?`,
        aiAcknowledgement: (name) => `इंटरव्यू पूरा हुआ! धन्यवाद ${name || 'श्रीमान'}, आपका वीडियो रिव्यू सफलतापूर्वक दर्ज हो गया।`,
        hint: 'सुधार की सलाह और स्टार रेटिंग चुनें',
        sampleText: 'मैं अपने सभी दोस्तों को यह फोन लेने की सलाह दूंगा। मेरी तरफ से पूरे 5 में से 5 स्टार!',
        options: [
          '⭐⭐⭐⭐⭐ 5 स्टार - बेहतरीन फोन, सबको लेने की सलाह दूंगा!',
          '⭐⭐⭐⭐ 4 स्टार - पैसा वसूल फोन है, बस थोड़ी और बैटरी चाहिए',
          '⭐⭐⭐ 3 स्टार - ठीक-ठाक फोन है, कुछ अपडेट्स की जरूरत है',
          '⭐⭐⭐⭐⭐ 5 स्टार - इस बजट में सबसे शानदार फोन!'
        ]
      }
    ]
  },

  'ne-en': {
    label: 'नेपाली + English Mix',
    flag: '🇳🇵🇬🇧',
    greeting: (name, phone) => `Namaste ${name || 'Friend'}, welcome to our video studio! Let's start your ${phone} review.`,
    callConnectText: (name, phone) => `Call connected! AI Video call interview for ${phone} is now active.`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Unboxing & Retail Box',
        emoji: '📦',
        title: '१. Show phone to camera & Purchase Store',
        voiceText: (name, phone) => `Namaste, ${name || 'Friend'}, and welcome to our app! First ma ${phone} camera agadi dekhaunus ra kaha bata purchase garnu bhayeko thiyo share garnus!`,
        aiAcknowledgement: (name) => `Great start, ${name || 'friend'}! Unboxing info note bhayo. Let's move to question 2.`,
        hint: 'Show the physical phone or choose answer below',
        actionPrompt: '📸 Camera ma phone dekhaunu ra photo linu',
        sampleText: 'Official store bata order gareko, packaging ekdam safe thiyo ra phone lightweight cha.',
        options: [
          '🛍️ Official showroom bata kineko (Brand New)',
          '📦 Online order gareko - Safe delivery & Original box',
          '🎁 Family bata gift paayeko',
          '🏪 Local mobile shop bata kineko'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'In-Hand Comfort',
        emoji: '🖐️',
        title: '२. In-Hand Grip & Daily Comfort',
        voiceText: (_name, phone) => `Daily use garda yo ${phone} haat ma lida kasto feel huncha? One-hand texting ra grip sajilo cha?`,
        aiAcknowledgement: () => `Awesome! Ergonomics ra grip feedback note bhayo.`,
        hint: 'Describe hand grip and weight balance',
        sampleText: 'Haat ma lina lightweight cha, side frame ko grip solid cha.',
        options: [
          '🖐️ Haat ma ekdam lightweight & comfortable grip',
          '📱 Single hand le type garna sajilo size',
          '⚠️ Back glass halka slippery feel huncha',
          '👌 Long hours use garda pani comfortable'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Display & Refresh Rate',
        emoji: '📱',
        title: '३. 120Hz Display & Color Quality',
        voiceText: (_name, phone) => `Yo ${phone} ko screen katti smooth cha? 120Hz scroll garda ra video herda kasto lagcha?`,
        aiAcknowledgement: () => `Understood! Screen ra 120Hz refresh rate review save bhayo.`,
        hint: '120Hz smoothness ra colors explain garnus',
        sampleText: '120Hz display super smooth cha, text crisp cha ra video ekdam clear cha.',
        options: [
          '⚡ Super smooth 120Hz scrolling & speed',
          '🌈 Punchy AMOLED colors & deep blacks',
          '🎬 YouTube ra Netflix movie herna perfect screen',
          '✨ Eye comfort mode le garda raati chalauna sajilo'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Outdoor Brightness',
        emoji: '☀️',
        title: '४. Outdoor Sunlight Visibility',
        voiceText: (_name, phone) => `Ghaam ma bahira jada ${phone} ko display ramrari dekhincha ki dhilo huncha?`,
        aiAcknowledgement: () => `Thanks! Outdoor sunlight visibility data note gariyo.`,
        hint: 'Ghaam ma screen visibility bare bhannus',
        sampleText: 'Direct sunlight ma pani text ra maps easily readable cha.',
        options: [
          '☀️ Bright sunshine ma pani clearly readable',
          '💡 High 2000+ nits peak brightness',
          '⚡ Auto brightness sensor fast adjust huncha',
          '🕶️ Halka glare huncha tara easily usable'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Daylight Camera',
        emoji: '📸',
        title: '५. Daylight Main Camera Quality',
        voiceText: (_name, phone) => `Daylight ma ${phone} ko main camera le katti sharp photo khichcha? Colors natural cha?`,
        aiAcknowledgement: () => `Great! Daylight camera sharpness capture bhayo.`,
        hint: 'Daylight camera photo clarity rate garnus',
        sampleText: 'Daylight photos sharp cha, natural colors ra dynamic range ramro cha.',
        options: [
          '📸 Crisp details ra lifelike colors (10/10)',
          '🎨 Over-saturated nahune natural skin tone',
          '⚡ Zero shutter lag rapidly click huncha',
          '🌿 Detailed fine textures clearly visible'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Night Photography',
        emoji: '🌙',
        title: '६. Night Mode & Low-Light Quality',
        voiceText: (_name, phone) => `Raati ko time ma va low-light room ma ${phone} ko night mode kasto kaam garcha?`,
        aiAcknowledgement: () => `Got it! Night mode photography details recorded.`,
        hint: 'Night shots ra low-light noise bare bhannus',
        sampleText: 'Night mode ma bright ra noise-free photos auncha, street lights well controlled cha.',
        options: [
          '🌙 Dark room ma pani bright ra clean photo',
          '💡 Street light flare control ekdam ramro',
          '⏳ 1-2 seconds fast night mode processing',
          '🌃 Low light ma reliable photography'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Portrait & Bokeh',
        emoji: '🎭',
        title: '७. Portrait Mode & Edge Detection',
        voiceText: (_name, phone) => `Portrait photo khichda background blur kasto auncha? Hair ra edges clean cut huncha?`,
        aiAcknowledgement: () => `Noted! Portrait blur ra edge separation note bhayo.`,
        hint: 'Portrait bokeh ra edge cut bare rate garnus',
        sampleText: 'DSLR jastai clean background blur dincha, hair edges clean cut garcha.',
        options: [
          '🎭 DSLR-like creamy bokeh background separation',
          '✨ Natural skin tone ra facial clarity',
          '✂️ Hair ra glasses ko edges clean cut garcha',
          '📸 Studio quality lighting portrait'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Zoom & Ultra-Wide',
        emoji: '🔍',
        title: '८. Ultra-Wide & Zoom Lens Experience',
        voiceText: (_name, phone) => `Tapaile zoom garera va ultra-wide lens le photo khichnu bhayeko cha? Quality kasto cha?`,
        aiAcknowledgement: () => `Understood! Zoom lens impressions recorded.`,
        hint: 'Zoom shots ra ultra wide landscape rate garnus',
        sampleText: '5x samma zoom garda pani photo phatdaina, ultra-wide pani wide cha.',
        options: [
          '🔭 Sharp optical zoom with zero pixelation',
          '🏔️ 120° distortion-free wide landscape view',
          '🔍 Impressive close-up macro shots',
          '👌 Consistent colors across all rear lenses'
        ]
      },
      {
        id: 9,
        k: 'camera_video',
        category: 'Video & Stabilization',
        emoji: '🎥',
        title: '९. Video Stabilization & Audio Quality',
        voiceText: (_name, phone) => `Handheld walking video 4K ma khichda halincha ki stable bascha? Mic audio kasto cha?`,
        aiAcknowledgement: () => `Awesome! Video OIS stabilization notes saved.`,
        hint: 'Video shake ra mic clarity evaluate garnus',
        sampleText: 'Walking garda pani video steady bascha, gimbal jastai smooth cha.',
        options: [
          '🎥 Gimbal-smooth 4K video zero walking shake',
          '🎙️ Clear stereo mic with wind reduction',
          '⚡ 60fps cinematic smooth motion',
          '🎬 Fast auto-focus on moving objects'
        ]
      },
      {
        id: 10,
        k: 'camera_selfie',
        category: 'Front Selfie Camera',
        emoji: '🤳',
        title: '१०. Front Selfie & Video Calling',
        voiceText: (_name, phone) => `Front camera hernus! WhatsApp va video call ma tapaiko face katti clear dekhincha?`,
        aiAcknowledgement: () => `Thanks! Front selfie camera performance note gariyo.`,
        hint: 'Selfie camera ra video call clarity rate garnus',
        sampleText: 'Front camera crisp cha, video call ma natural skin tone auncha.',
        options: [
          '🤳 Crisp natural selfie without artificial smoothing',
          '📞 Crystal clear WhatsApp & FaceTime video calls',
          '👥 Wide group selfie angle',
          '✨ Good low light performance for late night calls'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Daily Speed & RAM',
        emoji: '⚡',
        title: '११. Daily Speed & Multitasking',
        voiceText: (_name, phone) => `Daily multi-app chalauda ${phone} ko speed kasto cha? Kunai lag va stutter feel bhayo?`,
        aiAcknowledgement: () => `Crucial feedback! Speed ra RAM performance note bhayo.`,
        hint: 'App switching ra speed explain garnus',
        sampleText: 'Phone buttery smooth cha, 15 apps background ma switch garda reload hudaina.',
        options: [
          '⚡ Zero lag or stutter, instant app launching',
          '📑 Keeps 15+ apps open in RAM without reload',
          '🚀 Ultra fast smooth system animations',
          '💨 Handles heavy workload effortlessly'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Heavy Gaming',
        emoji: '🎮',
        title: '१२. PUBG & Heavy Gaming Performance',
        voiceText: (_name, phone) => `Tapaile yo ${phone} ma PUBG va Free Fire khelera hernu bhayeko cha? FPS drop huncha?`,
        aiAcknowledgement: () => `Gamer review logged! Next thermal ma jump garum.`,
        hint: 'PUBG FPS ra touch response rate garnus',
        sampleText: 'Solid 90 FPS PUBG ma auncha, gyro response instantaneous cha.',
        options: [
          '🎮 Stable 90 FPS in PUBG with zero frame drops',
          '🎯 Ultra responsive touch & fast gyro',
          '🕹️ 45 minutes continuous gaming without lag',
          '🔥 Long session ma halka warm huncha tara totally playable'
        ]
      },
      {
        id: 13,
        k: 'heating',
        category: 'Heating & Thermal',
        emoji: '🔥',
        title: '१३. Thermal & Overheating Issues',
        voiceText: (_name, phone) => `Honestly bhannus: heavy gaming va ghaam ma video khichda phone dherai tato huncha?`,
        aiAcknowledgement: () => `Thank you for honest review! Thermal data saved.`,
        hint: 'Phone tato hune va cool basne bare bhannus',
        sampleText: 'Normal use ma cool bascha, heavy gaming ma camera area halka warm huncha.',
        options: [
          '❄️ Everyday use ma cool ra comfortable bascha',
          '🌡️ Heavy gaming ma camera bump halka warm huncha',
          '🔥 Summer ghaam ma video khichda heating notice huncha',
          '🛡️ Cooling system le chito heat dissipate garcha'
        ]
      },
      {
        id: 14,
        k: 'battery',
        category: 'Battery Endurance',
        emoji: '🔋',
        title: '१४. Battery Life & Screen-on-Time',
        voiceText: (_name, phone) => `Full charge ma ${phone} ko battery katti time tikcha? Morning to night easily pugcha?`,
        aiAcknowledgement: () => `Great! Battery endurance statistics saved.`,
        hint: 'Battery backup ra Screen on time bataunus',
        sampleText: 'Morning 7 AM dekhi night 11 PM samma majjale chalcha, 25% battery baki huncha.',
        options: [
          '🔋 Morning to night easily lasts with 25%+ spare',
          '⚡ 1.5 days endurance on normal moderate usage',
          '🌙 Overnight standby ma 1-2% matra drop huncha',
          '⚠️ Heavy 5G streaming ma evening top-up chaincha'
        ]
      },
      {
        id: 15,
        k: 'charging',
        category: 'Fast Charging',
        emoji: '⚡',
        title: '१५. Fast Charging Speed & Adapter',
        voiceText: (_name, phone) => `0 to 100% full charge huna katti minutes lagcha? Phone charge huda tato huncha?`,
        aiAcknowledgement: () => `Logged! Charging speed observation save bhayo.`,
        hint: 'Charging time in minutes describe garnus',
        sampleText: '35 minutes ma full charge huncha, fast charging ekdam convenient cha.',
        options: [
          '⚡ 30 to 45 minutes ma 100% full charge',
          '⏱️ 15 minutes charge le half day backup dincha',
          '🔋 Convenient wireless charging support',
          '🔌 Box ma adapter thiyena, chuttai kinnu paryo'
        ]
      },
      {
        id: 16,
        k: 'os_ui',
        category: 'Software & UI',
        emoji: '⚙️',
        title: '१६. Operating System & UI Cleanliness',
        voiceText: (_name, phone) => `Software kasto feel huncha? Clean cha ki unwanted ads ra spam notifications auncha?`,
        aiAcknowledgement: () => `Understood! OS software experience note bhayo.`,
        hint: 'UI cleanliness ra spam ads bare bhannus',
        sampleText: 'OS clean cha, unwanted ads chaina ra animation smooth cha.',
        options: [
          '✨ Clean ad-free interface with fluid animations',
          '🎨 Easy customization with useful widgets',
          '🔄 Regular monthly security & OS updates',
          '⚠️ Few pre-installed apps that cannot be deleted'
        ]
      },
      {
        id: 17,
        k: 'ai_features',
        category: 'Smart AI Features',
        emoji: '🤖',
        title: '१७. AI Features & Smart Productivity',
        voiceText: (_name, phone) => `Phone ko AI features try garnu bhayo? Magic eraser va circle to search katti helpful cha?`,
        aiAcknowledgement: () => `AI features review note bhayo!`,
        hint: 'AI photo edit ra circle search evaluate garnus',
        sampleText: 'Magic eraser photo edit garna magic jasto cha, useful feature cha.',
        options: [
          '🪄 Magic eraser photobomber delete garna super',
          '🌐 Live call translation & voice notes helpful',
          '🔍 Circle to Search fast ra intuitive cha',
          '🤖 Built-in AI features daily time save garcha'
        ]
      },
      {
        id: 18,
        k: 'biometrics',
        category: 'Biometrics & Security',
        emoji: '👁️',
        title: '१८. Fingerprint & Face Unlock Speed',
        voiceText: (_name, phone) => `Fingerprint scanner ra Face Unlock katti fast cha? Dark room ma face unlock huncha?`,
        aiAcknowledgement: () => `Biometrics performance data capture bhayo!`,
        hint: 'Unlock speed ra dark room recognition rate garnus',
        sampleText: 'Fingerprint instant open huncha, dark room ma pani face unlock le chinchha.',
        options: [
          '⚡ Instant split-second fingerprint unlocking',
          '🌙 Pitch dark room ma pani reliable Face Unlock',
          '🖐️ Slightly moist finger ma pani majjale scan huncha',
          '🔒 Highly secure & dependable biometric sensor'
        ]
      },
      {
        id: 19,
        k: 'sound_haptics',
        category: 'Speakers & Haptics',
        emoji: '🔊',
        title: '१९. Dual Stereo Speakers & Typing Haptics',
        voiceText: (_name, phone) => `Stereo speakers ko sound katti loud ra clear cha? Typing garda vibration kasto lagcha?`,
        aiAcknowledgement: () => `Sound ra haptics feedback note bhayo!`,
        hint: 'Speaker loudness ra keyboard vibration rate garnus',
        sampleText: 'Speakers ekdam loud cha, typing garda crisp tactile haptics auncha.',
        options: [
          '🔊 Loud punchy stereo sound with deep bass',
          '🎵 Movie streaming & gaming ma clear audio',
          '📳 Crisp tactile vibration on keyboard typing',
          '📞 Loudspeaker call voice clean ra loud'
        ]
      },
      {
        id: 20,
        k: 'network_5g',
        category: 'Network & 5G',
        emoji: '📶',
        title: '२०. 5G Network, Wi-Fi & Call Clarity',
        voiceText: (_name, phone) => `Weak area va basement ma 5G signal katti strong auncha? Call clarity kasto cha?`,
        aiAcknowledgement: () => `Network clarity noted! Last question ma jump garum.`,
        hint: '5G network reception ra call clarity bataunus',
        sampleText: '5G signal solid cha, voice call clear cha without any call drop.',
        options: [
          '📶 Strong 5G signal reception indoors & basement',
          '⚡ Blazing fast Wi-Fi download & upload speeds',
          '🗣️ Crystal clear voice call audio without dropouts',
          '🔄 Seamless dual SIM mobile data switching'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Final Recommendation & Stars',
        emoji: '🌟',
        title: '२१. Critical Flaws & Final Star Rating',
        voiceText: (name, phone) => `Final question, ${name || 'friend'}! Company le yo ${phone} ma k improve garnu parcha? Ra 5 ma katti stars dinu huncha?`,
        aiAcknowledgement: (name) => `Interview complete bhayo! Thank you ${name || 'friend'}, video review successfully submitted!`,
        hint: 'Final star rating ra recommendation select garnus',
        sampleText: 'Definitely recommend garchu, value for money cha. 5 out of 5 stars!',
        options: [
          '⭐⭐⭐⭐⭐ 5 Stars - Highly Recommended, Must Buy!',
          '⭐⭐⭐⭐ 4 Stars - Great Value For Money',
          '⭐⭐⭐ 3 Stars - Average Everyday Phone',
          '⭐⭐⭐⭐⭐ 5 Stars - Best Phone in its Class!'
        ]
      }
    ]
  },

  mai: {
    label: 'मैथिली / भोजपुरी',
    flag: '🌾',
    greeting: (name, phone) => `प्रणाम ${name || ''} जी! dot वीडियो स्टूडियो में अहाँक स्वागत अछि। ${phone} के वीडियो समीक्षा शुरू कएल जाउ।`,
    callConnectText: (name, phone) => `कॉल कनेक्ट भऽ गेल! ${phone} खातिर AI वॉइस इंटरव्यू शुरू भऽ गेल अछि।`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Unboxing & Retail Box',
        emoji: '📦',
        title: '१. फोन क्यामरा पर देखाऊ आ खरीद अनुभव बताऊ',
        voiceText: (name, phone) => `प्रणाम ${name || ''} जी! dot में अहाँक स्वागत अछि। सबसँ पहिने अपन ${phone} क्यामरा सोझा देखाऊ आ बताऊ कतय सँ खरीदलहुँ आ बक्स में की भेटल?`,
        aiAcknowledgement: (name) => `बहुत नीक, ${name || 'जी'}! अनबॉक्सिंग के बात दर्ज भऽ गेल। आब दोसर प्रश्न पर चलैत छी।`,
        hint: 'क्यामरा सोझा फोन देखाऊ वा विकल्प चुनू',
        actionPrompt: '📸 क्यामरा पर फोन देखाऊ आ Snapshot लीअ',
        sampleText: 'हम ई फोन अधिकृत दोकान सँ लेलहुँ। एकर बॉडी आ डिस्प्ले नीक अछि।',
        options: [
          '🛍️ अधिकृत शोरुम सँ लेलहुँ (एकदम नव)',
          '📦 ऑनलाइन मँगेलहुँ - सुरक्षित पैकिंग',
          '🎁 परिवार सँ उपहार भेटल',
          '🏪 नजदीकी दोकान सँ लेलहुँ'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'In-Hand Comfort',
        emoji: '🖐️',
        title: '२. हाथ में पकड़य में ग्रिप आ वजन केहन बुझाइत अछि?',
        voiceText: (_name, phone) => `दिन भरि चलाबय पर ${phone} हाथ में केहन बुझाइत अछि? एक हाथ सँ चलाबय में सहज अछि?`,
        aiAcknowledgement: () => `बहुत बढ़िया! ग्रिप आ कम्फर्ट दर्ज कएल गेल।`,
        hint: 'हाथ के ग्रिप आ आराम के बारे में बताऊ',
        sampleText: 'हाथ में पकड़य में हल्का आ सहज अछि, साइड फ्रेम के ग्रिप मजबूत अछि।',
        options: [
          '🖐️ हाथ में हल्का आ आरामदायक ग्रिप, नहि फिसलैत अछि',
          '📱 एक हाथ सँ चलाबय में आसान',
          '⚠️ कभर बिना पाछाँ के ग्लास अलि फिसलैत अछि',
          '👌 दिन भरि चलाबय पर हाथ नहि दुखाइत अछि'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Display & Refresh Rate',
        emoji: '📱',
        title: '३. १२०Hz डिस्प्ले आ रंग केहन अछि?',
        voiceText: (_name, phone) => `ई ${phone} के स्क्रिन कतेक स्मूथ अछि? १२०Hz पर स्क्रोल करय आ भिडियो देखय में केहन लागैत अछि?`,
        aiAcknowledgement: () => `बुझि गेलहुँ! डिस्प्ले के समीक्षा सुरक्षित भऽ गेल।`,
        hint: 'डिस्प्ले आ रंग के बारे में चुनू',
        sampleText: '१२०Hz डिस्प्ले एकदम पानी जकाँ स्मूथ अछि, रंग बहुत सुन्दर अछि।',
        options: [
          '⚡ १२०Hz एकदम स्मूथ आ तेज डिस्प्ले',
          '🌈 चटक आ जीवन्त AMOLED रंग',
          '🎬 फिल्म आ भिडियो देखय खातिर बढ़िया स्क्रिन',
          '✨ आँखि पर जोर नहि पड़य वला डिस्प्ले'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Outdoor Brightness',
        emoji: '☀️',
        title: '४. कड़ा घाम में बाहर स्क्रिन कतेक साफ देखाइत अछि?',
        voiceText: (_name, phone) => `दुपहरिया के कड़ा घाम में ${phone} के स्क्रिन साफ-साफ पढ़ल जा सकैत अछि?`,
        aiAcknowledgement: () => `धन्यवाद! घाम में ब्राइटनेस के जानकारी दर्ज भऽ गेल।`,
        hint: 'घाम में स्क्रिन देखाय के अनुभव चुनू',
        sampleText: 'घाम में सेहो सब किछु साफ देखाइत अछि, कोनो दिक्कत नहि होइत अछि।',
        options: [
          '☀️ कड़ा घाम में सेहो अक्षर साफ पढ़ल जाइत अछि',
          '💡 २०००+ निट्स के बढ़िया ब्राइटनेस',
          '⚡ अटो ब्राइटनेस तुरंत काम करैत अछि',
          '🕶️ हल्का चमक आबैत अछि मुदा काम चलि जाइत अछि'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Daylight Camera',
        emoji: '📸',
        title: '५. दिन के उजियार में मुख्य क्यामरा केहन फोटो खींचैत अछि?',
        voiceText: (_name, phone) => `आब क्यामरा के बात! दिन के उजियार में ${phone} कतेक साफ फोटो खींचैत अछि?`,
        aiAcknowledgement: () => `सुन्दर! मुख्य क्यामरा के समीक्षा नोट भऽ गेल।`,
        hint: 'फोटो के क्लियारिटी चुनू',
        sampleText: 'मुख्य क्यामरा सँ एकदम साफ, प्राकृतिक रंग वला फोटो आबैत अछि।',
        options: [
          '📸 क्यामरा फोटो आ भिडियो क्लियारिटी (१०/१०)',
          '🎨 प्राकृतिक रंग, बेसी बनावटी नहि',
          '⚡ बिना कोनो देरी के तुरंते फोटो खिँचाइत अछि',
          '🌿 चेहरा आ बैकग्राउन्ड के सूक्ष्म डिटेल साफ'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Night Photography',
        emoji: '🌙',
        title: '६. राति के समय में नाइट मोड क्यामरा केहन अछि?',
        voiceText: (_name, phone) => `राति के बेर वा कम अजोरिया में ${phone} के नाइट मोड केहन फोटो निकालैत अछि?`,
        aiAcknowledgement: () => `बहुत नीक! नाइट मोड के विवरण दर्ज भऽ गेल।`,
        hint: 'अन्हार में फोटो के क्वालिटी चुनू',
        sampleText: 'नाइट मोड में अन्हार में सेहो बढ़िया उजियार आ साफ फोटो आबैत अछि।',
        options: [
          '🌙 अन्हार में सेहो उजियार आ साफ फोटो',
          '💡 सड़क के बत्ती के रोशनी नियन्त्रित रहैत अछि',
          '⏳ १-२ सेकेन्ड में नाइट फोटो प्रोसेस',
          '🌃 पार्टी आ घर के अन्हार में बढ़िया काम'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Portrait & Bokeh',
        emoji: '🎭',
        title: '७. पोट्रेट मोड, बैकग्राउन्ड ब्लर आ छाला के रंग केहन अछि?',
        voiceText: (_name, phone) => `पोट्रेट फोटो खींचय काल पाछाँ के भाग कतेक बढ़िया ब्लर होइत अछि?`,
        aiAcknowledgement: () => `सही विश्लेषण! पोट्रेट मोड के बात टिपायल।`,
        hint: 'पोट्रेट ब्लर के बारे में चुनू',
        sampleText: 'डीएसएलआर जकाँ पाछाँ ब्लर होइत अछि, मुँह के रंग प्राकृतिक आबैत अछि।',
        options: [
          '🎭 डीएसएलआर जकाँ पाछाँ बढ़िया ब्लर',
          '✨ प्राकृतिक छाला के रंग',
          '✂️ बाल आ चश्मा के किनारा साफ काटैत अछि',
          '📸 स्टुडियो जकाँ आकर्षक पोट्रेट'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Zoom & Ultra-Wide',
        emoji: '🔍',
        title: '८. दूर के चीज जूम कऽ कऽ खींचय में केहन अछि?',
        voiceText: (_name, phone) => `की अहाँ दूर के चीज जूम कऽ कऽ फोटो खींचलहुँ अछि? क्वालिटी केहन रहल?`,
        aiAcknowledgement: () => `बुझि गेलहुँ! जूम लेन्स के समीक्षा दर्ज भेल।`,
        hint: 'जूम आ अल्ट्रा-वाइड फोटो चुनू',
        sampleText: '५ गुना तक जूम कयला पर सेहो फोटो नहि फटैत अछि।',
        options: [
          '🔭 बिना फटल साफ जुम फोटो',
          '🏔️ बड़का दृश्य समेटय वला अल्ट्रा-वाइड',
          '🔍 नगीच के छोट चीजक मैक्रो सट बढ़िया',
          '👌 सब लेन्स में एक रंग'
        ]
      },
      {
        id: 9,
        k: 'camera_video',
        category: 'Video & Stabilization',
        emoji: '🎥',
        title: '९. भिडियो रेकर्डिंग कतेक स्थिर आ साफ रहैत अछि?',
        voiceText: (_name, phone) => `डोलैत-चलैत भिडियो खींचय पर ${phone} में भिडियो स्थिर रहैत अछि? माइक के आवाज केहन अछि?`,
        aiAcknowledgement: () => `बढ़िया! भिडियो स्टेबलाइजेसन सुरक्षित भेल।`,
        hint: 'भिडियो स्थिरता आ माइक के बारे में चुनू',
        sampleText: 'चलैत भिडियो खींचला पर सेहो गिम्बल जकाँ स्थिर रहैत अछि।',
        options: [
          '🎥 गिम्बल जकाँ स्थिर ४K भिडियो',
          '🎙️ माइक के आवाज साफ रेकर्ड होइत अछि',
          '⚡ एकदम स्मूथ सिनेम्याटिक भिडियो',
          '🎬 चलय वला चीज पर तुरंत फोकस'
        ]
      },
      {
        id: 10,
        k: 'camera_selfie',
        category: 'Front Selfie Camera',
        emoji: '🤳',
        title: '१०. आगाँ के सेल्फी क्यामरा आ भिडियो कल केहन अछि?',
        voiceText: (_name, phone) => `सेल्फी क्यामरा सोझाँ देखू! व्हाट्सएप वा भिडियो कल में चेहरा कतेक साफ देखाइत अछि?`,
        aiAcknowledgement: () => `सेल्फी क्यामरा के समीक्षा दर्ज भऽ गेल!`,
        hint: 'सेल्फी आ भिडियो कल क्लियारिटी चुनू',
        sampleText: 'सेल्फी क्यामरा साफ अछि, भिडियो कल में चेहरा एकदम स्पष्ट देखाइत अछि।',
        options: [
          '🤳 बिना ज्यादा स्मूथ कएल प्राकृतिक सेल्फी',
          '📞 व्हाट्सएप भिडियो कल में चेहरा साफ देखाइत अछि',
          '👥 ग्रुप सेल्फी खातिर बढ़िया एंगल',
          '✨ कम अजोरिया में सेहो बढ़िया सेल्फी'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Daily Speed & RAM',
        emoji: '⚡',
        title: '११. दिनभरि चलाबय में स्पिड केहन अछि? कहियो अटकैत अछि?',
        voiceText: (_name, phone) => `रोजमर्रा में विभिन्न एप्स चलाबय पर ${phone} के स्पिड केहन रहैत अछि? कहियो हैंग भेल?`,
        aiAcknowledgement: () => `महत्वपूर्ण फिडब्याक! स्पिड आ मल्टिटास्किंग दर्ज भेल।`,
        hint: 'एप्स खुलय के गति चुनू',
        sampleText: 'फोन कहियो नहि अटकैत अछि, सब एप्स तुरंते खुलि जाइत अछि।',
        options: [
          '⚡ बिना कोनो अटकन के बहुत तेज चलैत अछि',
          '📑 १५ सँ बेसी एप्स बैकग्राउन्ड में खुलल रहैत अछि',
          '🚀 एप्स तुरंते खुलि जाइत अछि',
          '💨 मल्टिटास्किंग बहुत आसान अछि'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Heavy Gaming',
        emoji: '🎮',
        title: '१२. पब्जी वा फ्री-फायर जकाँ भारी गेम में परफर्मेन्स केहन अछि?',
        voiceText: (_name, phone) => `की अहाँ ${phone} में पब्जी वा गेम खेललहुँ अछि? फ्रेम रेट स्थिर रहैत अछि?`,
        aiAcknowledgement: () => `गेमिंग फिडब्याक नोट भेल! हीटिंग पर चलैत छी।`,
        hint: 'गेमिंग स्मूथनेस चुनू',
        sampleText: 'पब्जी में स्मूथ ९० एफपीएस भेटैत अछि, गेम खेलय में आनन्द आबैत अछि।',
        options: [
          '🎮 पब्जी में बिना अटकिले स्मूथ ९० एफपीएस',
          '🎯 फास्ट टच रेस्पोन्स आ जाइरोस्कोप',
          '🕹️ लगातार गेम खेलला पर सेहो स्मूथ',
          '🔥 बेसी बेर खेलला पर हल्का गरम होइत अछि'
        ]
      },
      {
        id: 13,
        k: 'heating',
        category: 'Heating & Thermal',
        emoji: '🔥',
        title: '१३. की फोन चलाबय पर बेसी गरम वा ओभरहिट होइत अछि?',
        voiceText: (_name, phone) => `इमानदारी सँ बताऊ—बेसी बेर गेम खेलय वा घाम में फोन चलाबय पर फोन गरम होइत अछि?`,
        aiAcknowledgement: () => `सच्चाई खातिर धन्यवाद! हीटिंग डेटा सुरक्षित भेल।`,
        hint: 'फोन गरम होय के बारे में चुनू',
        sampleText: 'सामान्य काम में सेहो शीतल रहैत अछि, बेसी गेम खेलला पर हल्का गरम होइत अछि।',
        options: [
          '❄️ रोजमर्रा में फोन एकदम शीतल रहैत अछि',
          '🌡️ बेसी गेम खेलला पर क्यामरा नगीच हल्का गरम',
          '🔥 गर्मी में घाम में भिडियो खिँचला पर गरम होइत अछि',
          '🛡️ काम खतम भेने तुरंते शीतल भऽ जाइत अछि'
        ]
      },
      {
        id: 14,
        k: 'battery',
        category: 'Battery Endurance',
        emoji: '🔋',
        title: '१४. एक बेर चार्ज कयला पर ब्याट्री कतेक समय चलैत अछि?',
        voiceText: (_name, phone) => `ई ${phone} के ब्याट्री कतेक देर टिकैत अछि? भोर सँ राति धरि मज्जा सँ चलि जाइत अछि?`,
        aiAcknowledgement: () => `ब्याट्री ब्याकअप सुरक्षित भऽ गेल!`,
        hint: 'ब्याट्री चलय के समय चुनू',
        sampleText: 'दिन भरि बात करय, युट्युब देखय पर सेहो राति में २५% ब्याट्री बाँचि जाइत अछि।',
        options: [
          '🔋 भोर सँ राति धरि आराम सँ चलैत अछि',
          '⚡ १.५ दिन धरि चलय के क्षमता',
          '🌙 राति में १-२% मात्र ब्याट्री खतम होइत अछि',
          '⚠️ ५G बेसी चलाबय पर साँझ में चार्ज चाही'
        ]
      },
      {
        id: 15,
        k: 'charging',
        category: 'Fast Charging',
        emoji: '⚡',
        title: '१५. फोन पूरा फुल चार्ज होमय में कतेक मिनट लगैत अछि?',
        voiceText: (_name, phone) => `शून्य सँ १०० प्रतिशत चार्ज होमय में कतेक समय लगैत अछि?`,
        aiAcknowledgement: () => `चार्जिंग स्पिड के बात दर्ज भेल!`,
        hint: 'चार्ज होमय के समय चुनू',
        sampleText: 'आध घंटा में ७०% सँ बेसी चार्ज भऽ जाइत अछि, बहुत तेज अछि।',
        options: [
          '⚡ ३० सँ ४५ मिनट में पूरा फुल चार्ज',
          '⏱️ १५ मिनट चार्ज कयला पर आध दिन चलैत अछि',
          '🔋 वायरलेस चार्जिंग के बढ़िया सुविधा',
          '🔌 बक्स में चार्जर नहि छल, अलग सँ लेबय पड़ल'
        ]
      },
      {
        id: 16,
        k: 'os_ui',
        category: 'Software & UI',
        emoji: '⚙️',
        title: '१६. सफ्टवेयर चलाबय में केहन अछि? बेकार विज्ञापन आबैत अछि?',
        voiceText: (_name, phone) => `ई ${phone} के सफ्टवेयर केहन लागल? लकस्क्रिन पर फालतू विज्ञापन आबैत अछि?`,
        aiAcknowledgement: () => `सफ्टवेयर फिडब्याक दर्ज भऽ गेल!`,
        hint: 'सफ्टवेयर आ विज्ञापन के बारे में चुनू',
        sampleText: 'सफ्टवेयर एकदम साफ अछि, कोनो फालतू विज्ञापन वा बकवास एप्स नहि अछि।',
        options: [
          '✨ बिना विज्ञापन के साफ आ स्मूथ इन्टरफेस',
          '🎨 विजेट्स आ कस्टमाइजेसन के बढ़िया सुविधा',
          '🔄 समय पर नव सफ्टवेयर अपडेट आबैत अछि',
          '⚠️ किछु पहिले सँ राखल एप्स हटाओल नहि जा सकैत'
        ]
      },
      {
        id: 17,
        k: 'ai_features',
        category: 'Smart AI Features',
        emoji: '🤖',
        title: '१७. फोन के स्मार्ट AI फिचर्स कतेक काम के अछि?',
        voiceText: (_name, phone) => `की अहाँ फोटो सँ चीज हटाबय वा भाषा अनुवाद करय वला AI फिचर्स चलाओलहुँ?`,
        aiAcknowledgement: () => `AI फिचर्स समीक्षा सुरक्षित भेल!`,
        hint: 'AI फोटो इरेजर आ अनुवाद चुनू',
        sampleText: 'फोटो सँ फालतू आदमी हटाबय वला म्याजिक इरेजर बहुत काम के अछि।',
        options: [
          '🪄 फोटो सँ चीज मेटाबय वला AI बहुत उपयोगी',
          '🌐 भाषा अनुवाद आ भ्वाइस नोट बढ़िया काम करैत अछि',
          '🔍 स्क्रिन पर घेरा लगा कऽ खोजय वला फिचर आसान',
          '🤖 नव AI फिचर्स रोज के काम में समय बचबैत अछि'
        ]
      },
      {
        id: 18,
        k: 'biometrics',
        category: 'Biometrics & Security',
        emoji: '👁️',
        title: '१८. फिंगरप्रिन्ट आ फेस अनलक कतेक तेजी सँ खुलैत अछि?',
        voiceText: (_name, phone) => `फिंगरप्रिन्ट आ फेस अनलक कतेक तेज अछि? की अन्हार में फेस अनलक पहिचान लैत अछि?`,
        aiAcknowledgement: () => `बायोमेट्रिक्स सुरक्षा डेटा दर्ज भेल!`,
        hint: 'अनलक स्पिड चुनू',
        sampleText: 'अंगूठा सटबैत तुरंते खुलि जाइत अछि, अन्हार में सेहो फेस अनलक काम करैत अछि।',
        options: [
          '⚡ सटबैत तुरंते अनलक भऽ जाइत अछि',
          '🌙 पूरै अन्हार में सेहो फेस अनलक पहिचान लैत अछि',
          '🖐️ हल्का भीजल हाथ सँ सेहो खुलि जाइत अछि',
          '🔒 बहुत सुरक्षित बायोमेट्रिक सेन्सर'
        ]
      },
      {
        id: 19,
        k: 'sound_haptics',
        category: 'Speakers & Haptics',
        emoji: '🔊',
        title: '१९. स्टेरियो स्पिकर के आवाज आ टाइपिंग भाइब्रेसन केहन अछि?',
        voiceText: (_name, phone) => `स्पिकर के आवाज कतेक तेज आ बेस भरल अछि? किबोर्ड पर टाइप करय काल भाइब्रेसन केहन लागैत अछि?`,
        aiAcknowledgement: () => `अवाज आ भाइब्रेसन के फिडब्याक सुरक्षित भेल!`,
        hint: 'स्पिकर अवाज आ भाइब्रेसन चुनू',
        sampleText: 'स्पिकर के आवाज बहुत तेज आ साफ अछि, टाइपिंग भाइब्रेसन प्रिमियम लागैत अछि।',
        options: [
          '🔊 तेज, साफ आ बेस सँ भरल स्टेरियो अवाज',
          '🎵 सिनेमा आ गीत खातिर बढ़िया आवाज',
          '📳 टाइप करय काल क्रिस्प प्रिमियम भाइब्रेसन',
          '📞 लाउडस्पिकर पर बात करय में साफ आवाज'
        ]
      },
      {
        id: 20,
        k: 'network_5g',
        category: 'Network & 5G',
        emoji: '📶',
        title: '२०. ५G नेटवर्क सिग्नल, वाइफाइ आ कलिंग केहन अछि?',
        voiceText: (_name, phone) => `कमजोर नेटवर्क वला ठाउँ में ५G सिग्नल केहन आबैत अछि? फोन कल में आवाज साफ अबैत अछि?`,
        aiAcknowledgement: () => `कनेक्टिविटी विवरण टिपायल! आब अंतिम प्रश्न!`,
        hint: '५G सिग्नल आ कल क्लियारिटी चुनू',
        sampleText: 'घरक भीतर सेहो ५G सिग्नल फुल रहैत अछि, फोन पर बात करय में आवाज साफ आबैत अछि।',
        options: [
          '📶 घरक भीतर आ बेसमेन्ट में सेहो मजबूत ५G सिग्नल',
          '⚡ वाइफाइ डाउनलोड स्पिड बहुत तेज',
          '🗣️ फोन कल में दुनू दिस साफ आवाज',
          '🔄 दू टा सिम बीच आसानी सँ डेटा स्विच'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Final Recommendation & Stars',
        emoji: '🌟',
        title: '२१. अंतिम सलाह, की सुधार चाही आ कतेक स्टार देब?',
        voiceText: (name, phone) => `अंतिम प्रश्न, ${name || ''} जी! ई ${phone} में कम्पनी केँ सबसँ पहिले की सुधारय पड़त? आ ५ में सँ कतेक स्टार देब?`,
        aiAcknowledgement: (name) => `अन्तर्वार्ता पूरा भेल! धन्यवाद ${name || ''} जी, अहाँक भिडियो समीक्षा सफलतापूर्वक दर्ज भऽ गेल।`,
        hint: 'सुधार सलाह आ स्टार रेटिंग चुनू',
        sampleText: 'हम सब गोटे केँ ई फोन लेबय के कहब, पाँच में पाँच स्टार!',
        options: [
          '⭐⭐⭐⭐⭐ ५ स्टार - सब केँ लेबय के कहब!',
          '⭐⭐⭐⭐ ४ स्टार - पैसा के सही कदर अछि, ब्याट्री अलि बेसी चाही',
          '⭐⭐⭐ ३ स्टार - सामान्य फोन अछि, किछु अपडेट चाही',
          '⭐⭐⭐⭐⭐ ५ स्टार - ई बजेट में सबसँ बढ़िया फोन!'
        ]
      }
    ]
  },

  es: {
    label: 'Español (Spanish)',
    flag: '🇪🇸',
    greeting: (name, phone) => `¡Hola, ${name || 'amigo'}! Te damos la bienvenida a nuestra app. ¡Comencemos tu video reseña de ${phone}!`,
    callConnectText: (name, phone) => `¡Conectado! La entrevista de voz con IA para tu ${phone} está activa con ${name || 'el cliente'}.`,
    questions: [
      {
        id: 1,
        k: 'unboxing',
        category: 'Desempaquetado y Caja',
        emoji: '📦',
        title: '1. Muestra tu teléfono a la cámara y experiencia de compra',
        voiceText: (name, phone) => `¡Hola, ${name || 'amigo'}! Te damos la bienvenida. Por favor muestra tu ${phone} frente a la cámara y cuéntanos dónde lo compraste y qué venía en la caja.`,
        aiAcknowledgement: (name) => `¡Excelente inicio, ${name || 'amigo'}! Detalles de compra guardados. Pasemos a la pregunta 2.`,
        hint: 'Muestra el teléfono a la cámara o elige tu respuesta abajo',
        actionPrompt: '📸 Muestra el teléfono a la cámara y toma una foto',
        sampleText: 'Compré este teléfono hace poco en una tienda autorizada. La sensación en mano es sólida y elegante.',
        options: [
          '🛍️ Comprado en Tienda Oficial (Nuevo Sellado)',
          '📦 Pedido en línea, paquete seguro y en buen estado',
          '🎁 Regalo recibido de familiares o amigos',
          '🏪 Comprado en tienda local autorizada'
        ]
      },
      {
        id: 2,
        k: 'comfort',
        category: 'Comodidad en Mano',
        emoji: '🖐️',
        title: '2. Agarre, peso y ergonomía en el uso diario',
        voiceText: (_name, phone) => `¿Cómo se siente tu ${phone} en la mano durante el día? ¿Es liviano y cómodo para escribir con una sola mano?`,
        aiAcknowledgement: () => `¡Entendido! Evaluación de agarre y ergonomía registrada. Continuemos.`,
        hint: 'Describe la comodidad en mano, agarre y equilibrio de peso',
        actionPrompt: '🔄 Gira la cámara para mostrar el panel trasero',
        sampleText: 'Las esquinas ergonómicas facilitan escribir con una sola mano y el peso está muy bien equilibrado.',
        options: [
          '🖐️ Muy cómodo y ligero en la mano',
          '📱 Tamaño perfecto para escribir con una mano',
          '⚠️ La parte trasera resbala un poco sin funda',
          '👌 Excelente equilibrio de peso para llamadas largas'
        ]
      },
      {
        id: 3,
        k: 'display',
        category: 'Pantalla y Fluidez',
        emoji: '📱',
        title: '3. Calidad de pantalla, colores AMOLED y tasa de 120Hz',
        voiceText: (_name, phone) => `¡Mira la pantalla! ¿Qué tan vivos son los colores en este ${phone} y se siente ultra fluida la tasa de 120Hz?`,
        aiAcknowledgement: () => `¡Anotado! Comentarios sobre la pantalla y los 120Hz guardados.`,
        hint: 'Describe la nitidez, colores y suavidad al desplazarte',
        sampleText: 'La pantalla de 120Hz es súper fluida, el texto es nítido y ver videos es un placer.',
        options: [
          '⚡ Desplazamiento ultra fluido a 120Hz y animaciones suaves',
          '🌈 Colores AMOLED vibrantes con negros profundos',
          '🎬 Pantalla cinematográfica para YouTube y streaming',
          '✨ Agradable a la vista durante la lectura nocturna'
        ]
      },
      {
        id: 4,
        k: 'brightness',
        category: 'Brillo Exterior',
        emoji: '☀️',
        title: '4. Visibilidad bajo la luz solar y brillo máximo',
        voiceText: (_name, phone) => `¿Puedes leer con claridad la pantalla del ${phone} en exteriores bajo el sol directo del mediodía?`,
        aiAcknowledgement: () => `¡Gracias! Datos de visibilidad bajo el sol registrados.`,
        hint: 'Indica qué tan legible es la pantalla con luz solar intensa',
        sampleText: 'Incluso bajo la luz directa del sol, los textos y mapas se leen con total claridad.',
        options: [
          '☀️ Perfectamente legible bajo luz solar directa',
          '💡 Alto nivel de brillo máximo sin reflejos molestos',
          '⚡ Brillo automático rápido y preciso según el entorno',
          '🕶️ Ligero reflejo exterior pero totalmente utilizable'
        ]
      },
      {
        id: 5,
        k: 'camera_main',
        category: 'Cámara Principal',
        emoji: '📸',
        title: '5. Calidad fotográfica diurna y nivel de nitidez',
        voiceText: (_name, phone) => `¡Hablemos de la cámara! ¿Qué tan nítidas y detalladas son las fotos de día con el ${phone}? ¿Los colores son naturales?`,
        aiAcknowledgement: () => `¡Genial! Evaluación de nitidez y cámara principal anotada.`,
        hint: 'Califica el detalle de las fotos diurnas, rango dinámico y colores',
        sampleText: 'La cámara principal captura fotos nítidas con tonos de piel naturales y gran rango dinámico.',
        options: [
          '📸 Gran nitidez de detalle y colores naturales (10/10)',
          '🎨 Reproducción de color realista y fiel',
          '⚡ Disparo instantáneo sin retardo de obturación',
          '🌿 Gran nivel de textura en paisajes y retratos'
        ]
      },
      {
        id: 6,
        k: 'camera_night',
        category: 'Fotografía Nocturna',
        emoji: '🌙',
        title: '6. Rendimiento con poca luz y Modo Noche',
        voiceText: (_name, phone) => `¿Cómo rinde tu ${phone} de noche o en interiores oscuros? ¿El Modo Noche ilumina sin generar grano o ruido?`,
        aiAcknowledgement: () => `¡Muy valioso! Experiencia de fotografía nocturna guardada.`,
        hint: 'Evalúa fotos en habitaciones con poca luz y luces de calle',
        sampleText: 'El modo noche produce fotos iluminadas y sin ruido, controlando muy bien las farolas.',
        options: [
          '🌙 Fotos claras y limpias incluso en oscuridad casi total',
          '💡 Excelente control de luces y farolas nocturnas',
          '⏳ Procesamiento de exposición nocturna rápido en 1-2 seg',
          '🌃 Muy buenas fotos en interiores y reuniones de noche'
        ]
      },
      {
        id: 7,
        k: 'camera_portrait',
        category: 'Retratos y Bokeh',
        emoji: '🎭',
        title: '7. Modo Retrato, desenfoque bokeh y tonos de piel',
        voiceText: (_name, phone) => `¿Cómo quedan las fotos de personas en el modo retrato de tu ${phone}? ¿El desenfoque de fondo es natural alrededor del cabello?`,
        aiAcknowledgement: () => `¡Perfecto! Calidad de retratos y bokeh anotada.`,
        hint: 'Evalúa la separación del fondo y tonos de piel',
        sampleText: 'El recorte de silueta es preciso y el desenfoque bokeh luce como una cámara profesional.',
        options: [
          '🎭 Desenfoque suave estilo cámara réflex profesional',
          '✂️ Recorte de bordes y cabello muy preciso',
          '🎨 Tonos de piel favorecedores sin filtros exagerados',
          '👌 Detección confiable incluso con mascotas y objetos'
        ]
      },
      {
        id: 8,
        k: 'camera_zoom',
        category: 'Teleobjetivo y Zoom',
        emoji: '🔍',
        title: '8. Nitidez de zoom y detalles a distancia',
        voiceText: (_name, phone) => `¿Has probado hacer zoom a 2x, 3x o más en el ${phone}? ¿Los textos lejanos y letreros siguen siendo legibles?`,
        aiAcknowledgement: () => `¡Excelente! Pruebas de zoom y teleobjetivo guardadas.`,
        hint: 'Evalúa fotos al hacer zoom en objetos distantes',
        sampleText: 'El zoom mantiene gran nitidez hasta 5x o 10x sin pixelarse.',
        options: [
          '🔍 Zoom nítido con excelente preservación de detalle',
          '🏢 Letreros lejanos y matrículas totalmente legibles',
          '⚡ Estabilización firme al usar zoom para que no vibre',
          '✨ Aceptable para fotos cotidianas a distancia'
        ]
      },
      {
        id: 9,
        k: 'video_record',
        category: 'Grabación de Video',
        emoji: '🎥',
        title: '9. Grabación de video y estabilización al caminar',
        voiceText: (_name, phone) => `¿Qué tan estables son los videos en 4K o 1080p cuando caminas grabando con tu ${phone}? ¿El audio del micrófono se escucha claro?`,
        aiAcknowledgement: () => `¡Guardado! Estabilidad de video y calidad de grabación registradas.`,
        hint: 'Describe la suavidad del video al caminar y la claridad de audio',
        sampleText: 'La estabilización óptica hace que el video parezca grabado sobre rieles, con audio limpio.',
        options: [
          '🎥 Estabilización ultra suave sin temblores al caminar',
          '🎙️ Audio de micrófono limpio que filtra el viento',
          '⚡ Enfoque continuo rápido sobre sujetos en movimiento',
          '🎬 Video 4K 60fps con colores vibrantes y nítidos'
        ]
      },
      {
        id: 10,
        k: 'selfie_cam',
        category: 'Cámara Frontal Selfie',
        emoji: '🤳',
        title: '10. Cámara frontal para selfies y videollamadas',
        voiceText: (_name, phone) => `¿Qué opinas de la cámara frontal de tu ${phone}? ¿Las selfies y videollamadas en WhatsApp se ven claras y naturales?`,
        aiAcknowledgement: () => `¡Muy bien! Rendimiento de la cámara frontal guardado.`,
        hint: 'Evalúa selfies, videollamadas y claridad facial',
        sampleText: 'Las selfies salen con gran nitidez y en videollamadas de trabajo me veo perfectamente iluminado.',
        options: [
          '🤳 Selfies nítidas con tonos de piel naturales y claros',
          '📹 Excelente calidad para llamadas de WhatsApp y Zoom',
          '🌟 Gran ángulo para selfies grupales con amigos',
          '💡 Buen rendimiento incluso con luz artificial de interiores'
        ]
      },
      {
        id: 11,
        k: 'performance',
        category: 'Velocidad y Fluidez',
        emoji: '⚡',
        title: '11. Velocidad general, multitarea y apertura de apps',
        voiceText: (_name, phone) => `¿Qué tan rápido responde tu ${phone} al abrir múltiples aplicaciones, cambiar entre redes sociales o navegar?`,
        aiAcknowledgement: () => `¡Anotado! Rendimiento del procesador y fluidez diaria registrados.`,
        hint: 'Describe si hay lentitud, tirones o si va instantáneo',
        sampleText: 'El procesador es súper veloz, las aplicaciones abren al instante y la multitarea nunca se traba.',
        options: [
          '⚡ Apertura instantánea de aplicaciones y cero tirones',
          '🔄 Multitarea fluida manteniendo más de 10 apps en memoria',
          '📱 Transiciones y gestos del sistema sumamente suaves',
          '👌 Rendimiento estable y consistente durante todo el día'
        ]
      },
      {
        id: 12,
        k: 'gaming',
        category: 'Juegos y Calentamiento',
        emoji: '🎮',
        title: '12. Experiencia en juegos pesados y control térmico',
        voiceText: (_name, phone) => `¿Juegas en tu ${phone}? ¿Cómo mantiene los cuadros por segundo en títulos pesados y el teléfono se calienta?`,
        aiAcknowledgement: () => `¡Genial! Datos de rendimiento en juegos y temperatura registrados.`,
        hint: 'Comenta sobre FPS en juegos y temperatura del equipo',
        sampleText: 'Los juegos corren a 60 o 90 FPS estables y la disipación térmica mantiene el teléfono tibio.',
        options: [
          '🎮 60-90 FPS estables en juegos con gráficos altos',
          '❄️ Excelente control térmico sin calentamiento excesivo',
          '🔋 Consumo moderado de batería durante partidas',
          '📱 Buen rendimiento para juegos casuales del día a día'
        ]
      },
      {
        id: 13,
        k: 'battery_life',
        category: 'Duración de Batería',
        emoji: '🔋',
        title: '13. Autonomía de la batería durante todo el día',
        voiceText: (_name, phone) => `¿Cuánto te dura la batería del ${phone} en un día típico? ¿Llegas a la noche con carga restante sin necesidad de cargador?`,
        aiAcknowledgement: () => `¡Anotado! Autonomía y horas de pantalla registradas.`,
        hint: 'Indica si dura 1 día completo, horas de pantalla y porcentaje restante',
        sampleText: 'La batería me dura fácilmente día y medio con uso continuo, llegando a la noche con 35%.',
        options: [
          '🔋 Dura fácilmente todo el día completo de uso intenso (30%+ de noche)',
          '⚡ Más de 7 a 8 horas de pantalla activa',
          '🌙 Consumo en reposo mínimo durante la noche (1-2%)',
          '🔌 Requiere una carga corta al final de la tarde con uso pesado'
        ]
      },
      {
        id: 14,
        k: 'charging',
        category: 'Carga Rápida',
        emoji: '⚡',
        title: '14. Velocidad de carga rápida y temperatura del cargador',
        voiceText: (_name, phone) => `¿Qué tan rápido se recarga tu ${phone} del 0% al 100%? ¿El cargador venía en la caja de compra?`,
        aiAcknowledgement: () => `¡Perfecto! Tiempos de carga rápida registrados.`,
        hint: 'Menciona los minutos para llegar al 50% o 100% y accesorios de carga',
        sampleText: 'Carga al 50% en unos 20 minutos, lo que me salva cuando tengo prisa por salir.',
        options: [
          '⚡ Carga ultra veloz del 0 al 50% en solo 20-30 minutos',
          '🔌 Carga completa del 100% en menos de una hora',
          '🌡️ El teléfono se mantiene fresco sin calentarse al cargar',
          '👌 Velocidad de carga adecuada y segura para la vida útil'
        ]
      },
      {
        id: 15,
        k: 'speakers',
        category: 'Altavoces y Sonido',
        emoji: '🔊',
        title: '15. Altavoces estéreo, claridad de voz y volumen',
        voiceText: (_name, phone) => `¿Qué tal suenan los altavoces de tu ${phone}? ¿El volumen es potente para ver videos y la música tiene buenos graves?`,
        aiAcknowledgement: () => `¡Anotado! Evaluación de altavoces y audio guardada.`,
        hint: 'Evalúa la potencia de volumen, claridad de voces y graves',
        sampleText: 'Los altavoces estéreo suenan nítidos y potentes sin distorsión incluso al volumen máximo.',
        options: [
          '🔊 Sonido estéreo envolvente y nítido para ver películas',
          '🎵 Voces claras y presencia agradable de graves',
          '📢 Timbre y alarmas muy potentes que no pasan desapercibidos',
          '🎧 Excelente calidad de audio con auriculares Bluetooth'
        ]
      },
      {
        id: 16,
        k: 'haptics',
        category: 'Vibración y Háptica',
        emoji: '📳',
        title: '16. Motor de vibración y respuesta táctil al escribir',
        voiceText: (_name, phone) => `¿Cómo se siente la vibración del ${phone} al teclear en el teclado o recibir notificaciones? ¿Es precisa y firme?`,
        aiAcknowledgement: () => `¡Entendido! Sensación del motor háptico registrada.`,
        hint: 'Describe si la vibración es un clic seco premium o un zumbido',
        sampleText: 'La respuesta háptica es precisa y satisfactoria como un clic mecánico de calidad.',
        options: [
          '📳 Clic háptico seco, preciso y de categoría premium',
          '⌨️ Escribir en el teclado se siente muy placentero',
          '🔔 Notificaciones discretas pero fáciles de sentir en el bolsillo',
          '👍 Respuesta de vibración estándar y confiable'
        ]
      },
      {
        id: 17,
        k: 'biometrics',
        category: 'Desbloqueo Biométrico',
        emoji: '🔒',
        title: '17. Huella dactilar y reconocimiento facial',
        voiceText: (_name, phone) => `¿Qué tan rápido y confiable desbloquea tu ${phone}? ¿El lector de huella y el desbloqueo facial fallan alguna vez?`,
        aiAcknowledgement: () => `¡Guardado! Confiabilidad biométrica anotada.`,
        hint: 'Comenta sobre la rapidez del sensor de huellas y rostro',
        sampleText: 'El sensor de huellas desbloquea de inmediato al poner el dedo, incluso con dedos húmedos.',
        options: [
          '🔒 Lector de huellas instantáneo con 99% de acierto al primer toque',
          '👁️ Reconocimiento facial veloz al levantar el teléfono',
          '⚡ Acceso rápido a aplicaciones bancarias seguras',
          '👍 Sensor confiable y ubicado en una posición cómoda'
        ]
      },
      {
        id: 18,
        k: 'connectivity',
        category: 'Llamadas y Red 5G',
        emoji: '📡',
        title: '18. Calidad de llamadas, cobertura 5G y Wi-Fi',
        voiceText: (_name, phone) => `¿Cómo es la señal 5G, Wi-Fi y la claridad de voz durante las llamadas en tu ${phone}? ¿Se cortan las llamadas?`,
        aiAcknowledgement: () => `¡Anotado! Rendimiento de red y llamadas guardado.`,
        hint: 'Evalúa la claridad de voz en llamadas y velocidad de datos',
        sampleText: 'La señal es sólida donde voy, el 5G descarga rapidísimo y el auricular de llamadas se escucha fuerte.',
        options: [
          '📡 Cobertura de señal 5G fuerte y estable sin cortes',
          '📞 Voces en llamadas nítidas y cancelación de ruido exterior',
          '📶 Conexión Wi-Fi de alta velocidad y amplio alcance en casa',
          '🚗 Conexión Bluetooth inmediata y estable en el auto'
        ]
      },
      {
        id: 19,
        k: 'durability',
        category: 'Construcción y Resistencia',
        emoji: '🛡️',
        title: '19. Calidad de construcción, materiales y resistencia',
        voiceText: (_name, phone) => `¿Qué tan resistente se siente tu ${phone}? ¿Ha sufrido caídas accidentales o salpicaduras de agua y cómo resistió?`,
        aiAcknowledgement: () => `¡Excelente información de durabilidad! Anotada.`,
        hint: 'Menciona la solidez del marco, cristal protector y resistencia al agua',
        sampleText: 'Se me cayó una vez al piso y no le pasó absolutamente nada gracias a la solidez de los materiales.',
        options: [
          '🛡️ Construcción sólida y materiales de primera calidad',
          '💧 Protección contra salpicaduras de agua y lluvia',
          '💎 Cristal frontal resistente a rayaduras en el bolsillo',
          '📱 Muy buena resistencia a caídas leves cotidianas'
        ]
      },
      {
        id: 20,
        k: 'os_ui',
        category: 'Sistema y Software',
        emoji: '✨',
        title: '20. Experiencia del sistema operativo y actualizaciones',
        voiceText: (_name, phone) => `¿Qué opinas del sistema operativo y software de tu ${phone}? ¿Es fácil de usar y recibe actualizaciones a tiempo?`,
        aiAcknowledgement: () => `¡Anotado! Experiencia de software y sistema registrada.`,
        hint: 'Comenta sobre la facilidad de uso del sistema y funciones útiles',
        sampleText: 'La interfaz es limpia y fácil de navegar para cualquier persona, con actualizaciones constantes.',
        options: [
          '✨ Interfaz limpia, intuitiva y sumamente fácil de usar',
          '🛡️ Actualizaciones de seguridad y nuevas funciones periódicas',
          '📱 Cero aplicaciones basura y gran nivel de personalización',
          '🔄 Todo funciona de manera fluida y sin complicaciones'
        ]
      },
      {
        id: 21,
        k: 'recommend',
        category: 'Veredicto y Recomendación',
        emoji: '🌟',
        title: '21. Veredicto final, qué mejorar y calificación en estrellas',
        voiceText: (name, phone) => `¡Última pregunta, ${name || 'amigo'}! ¿Qué debería mejorar el fabricante en este ${phone}? ¿Y cuántas estrellas de 5 le das?`,
        aiAcknowledgement: (name) => `¡Entrevista completada! Muchas gracias ${name || 'amigo'}, tu video reseña ha sido registrada exitosamente.`,
        hint: 'Consejo de mejora y calificación en estrellas',
        sampleText: 'Recomiendo este teléfono a todo el mundo, le doy cinco de cinco estrellas por su gran valor.',
        options: [
          '⭐⭐⭐⭐⭐ 5 Estrellas - ¡Lo recomiendo totalmente a todos!',
          '⭐⭐⭐⭐ 4 Estrellas - Excelente relación precio-calidad',
          '⭐⭐⭐ 3 Estrellas - Buen teléfono pero con detalles por pulir',
          '⭐⭐⭐⭐⭐ 5 Estrellas - La mejor compra de su segmento'
        ]
      }
    ]
  }
};

/**
 * Returns 21 comprehensive smartphone evaluation questions customized
 * specifically to the user's selected phone model, brand hardware, and language.
 */
export function getPhoneSpecificQuestions(
  phone: { id: string; name: string; brand: string; spec?: string; priceNPR?: number },
  lang: InterviewLanguage = 'ne'
): InterviewQuestionItem[] {
  const baseScript = INTERVIEW_SCRIPTS_20[lang] || INTERVIEW_SCRIPTS_20.ne;
  const brandLower = (phone.brand || '').toLowerCase();
  const phoneName = phone.name || 'Smartphone';

  const isApple = brandLower === 'apple' || phoneName.toLowerCase().includes('iphone');
  const isSamsung = brandLower === 'samsung' || phoneName.toLowerCase().includes('galaxy');
  const isXiaomi = ['xiaomi', 'redmi', 'poco'].includes(brandLower) || phoneName.toLowerCase().includes('redmi') || phoneName.toLowerCase().includes('poco');
  const isOnePlus = brandLower === 'oneplus';
  const isPixel = brandLower === 'google' || phoneName.toLowerCase().includes('pixel');
  const isVivo = ['vivo', 'iqoo'].includes(brandLower);
  const isOppo = ['oppo', 'realme'].includes(brandLower);

  // Camera technology badge
  const cameraTech = isApple
    ? '48MP Fusion & Photonic Engine'
    : isSamsung
    ? (phoneName.includes('Ultra') ? '200MP Quad Telephoto & Space Zoom' : '50MP OIS Dual Pixel')
    : isXiaomi
    ? (phoneName.includes('Ultra') ? 'Leica 1-inch Summilux' : '200MP OIS Camera')
    : isOnePlus
    ? 'Hasselblad 4th Gen Color Tuning'
    : isPixel
    ? 'Pixel Real Tone & Computational AI'
    : isVivo
    ? 'ZEISS APO Optics & Aura Light'
    : '50MP Ultra-Clear OIS';

  // Fast charging technology
  const chargeTech = isOnePlus
    ? '100W SUPERVOOC Fast Charge'
    : isXiaomi
    ? '120W HyperCharge'
    : isVivo
    ? '80W/100W FlashCharge'
    : isSamsung
    ? '45W Super Fast Charging'
    : isApple
    ? '25W MagSafe & USB-C Fast Charge'
    : 'Fast Rapid Charging';

  // OS name
  const osName = isApple
    ? 'iOS'
    : isSamsung
    ? 'One UI'
    : isXiaomi
    ? 'Xiaomi HyperOS'
    : isOnePlus
    ? 'OxygenOS'
    : isPixel
    ? 'Pure Google Android'
    : isVivo
    ? 'FuntouchOS'
    : isOppo
    ? 'ColorOS'
    : 'Android';

  return baseScript.questions.map((q) => {
    // Customize question details dynamically for this exact model
    let customizedOptions = [...q.options];

    if (q.k === 'unboxing') {
      if (lang === 'en') {
        customizedOptions = [
          `🛍️ Official ${phone.brand} Brand Store (Sealed New)`,
          `📦 Online Order, arrived safely in pristine packaging`,
          `🎁 Gift from family/friend, loving this ${phoneName}`,
          `🏪 Authorized Local Tech Retailer`
        ];
      } else if (lang === 'es') {
        customizedOptions = [
          `🛍️ Tienda Oficial ${phone.brand} (Nuevo Sellado)`,
          `📦 Pedido en línea, paquete seguro y protegido`,
          `🎁 Regalo de un familiar o amigo, fascinado con este ${phoneName}`,
          `🏪 Distribuidor local oficial autorizado`
        ];
      } else {
        customizedOptions = [
          `🛍️ आधिकारिक ${phone.brand} शोरुमबाट किनेको (ब्रान्ड न्यू)`,
          `📦 अनलाइन अर्डर गरेको, सुरक्षित बक्समा आइपुग्यो`,
          `🎁 उपहार पाएको ${phoneName}, एकदमै मन पर्यो`,
          `🏪 स्थानीय आधिकारिक मोबाइल पसलबाट किनेको`
        ];
      }
    } else if (q.k === 'like' || q.k === 'camera_zoom') {
      if (lang === 'en') {
        customizedOptions = [
          `📸 Outstanding ${cameraTech} daylight photo sharpness`,
          `🎨 Natural and true-to-life skin tones & color accuracy`,
          `🔍 Clear details even when zooming into distant subjects`,
          `⚡ Fast shutter speed, zero motion blur while moving`
        ];
      } else if (lang === 'es') {
        customizedOptions = [
          `📸 Nitidez sobresaliente de fotos con luz diurna ${cameraTech}`,
          `🎨 Tonos de piel naturales y gran precisión de color`,
          `🔍 Detalles nítidos incluso al hacer zoom en objetos lejanos`,
          `⚡ Obturación rápida, cero fotos borrosas en movimiento`
        ];
      } else {
        customizedOptions = [
          `📸 निकै स्पष्ट ${cameraTech} डेलाइट फोटो र सार्पनेस`,
          `🎨 प्राकृतिक स्किन टोन र आकर्षक कलर एक्युरेसी`,
          `🔍 टाढाको वस्तु जुम गर्दा पनि डिटेल नफाट्ने`,
          `⚡ फास्ट सटर, हिँड्दा पनि फोटो नधमिलिने`
        ];
      }
    } else if (q.k === 'charging') {
      if (lang === 'en') {
        customizedOptions = [
          `⚡ ${chargeTech} powers up battery very quickly`,
          `📦 Retail box ${isApple || (isSamsung && !phoneName.includes('A15')) ? 'does not include charger brick' : 'includes fast charger inside'}`,
          `🔋 Reaches 50%+ in just 20-30 minutes`,
          `🌡️ Keeps cool without excessive heating while plugged in`
        ];
      } else if (lang === 'es') {
        customizedOptions = [
          `⚡ ${chargeTech} recarga la batería muy rápidamente`,
          `📦 La caja ${isApple || (isSamsung && !phoneName.includes('A15')) ? 'no incluye cargador, se usa uno aparte' : 'incluye cargador rápido'}`,
          `🔋 Llega al 50%+ en solo 20-30 minutos`,
          `🌡️ Se mantiene fresco sin calentamiento excesivo al cargar`
        ];
      } else {
        customizedOptions = [
          `⚡ ${chargeTech} ले ब्याट्री निकै छिटो चार्ज गर्छ`,
          `📦 रिटेल बक्समा चार्जर ${isApple || (isSamsung && !phoneName.includes('A15')) ? 'आउँदैन, छुट्टै प्रयोग गर्नुपर्छ' : 'सहित आएको, धेरै सजिलो भयो'}`,
          `🔋 २० देखि ३० मिनेटमै ५०%+ चार्ज हुन्छ`,
          `🌡️ चार्ज गर्दा फोन धेरै तातो हुँदैन`
        ];
      }
    } else if (q.k === 'os_ui') {
      if (lang === 'en') {
        customizedOptions = [
          `✨ ${osName} interface is buttery smooth with zero lags`,
          `🛡️ Frequent security patches and software updates`,
          `📱 Clean system aesthetics with great customizability`,
          `🔄 Apps launch instantly and stay in background memory`
        ];
      } else if (lang === 'es') {
        customizedOptions = [
          `✨ La interfaz ${osName} es muy fluida y sin retrasos`,
          `🛡️ Parches de seguridad y actualizaciones frecuentes`,
          `📱 Estética limpia del sistema con gran personalización`,
          `🔄 Las aplicaciones abren al instante y se mantienen en memoria`
        ];
      } else {
        customizedOptions = [
          `✨ ${osName} इन्टरफेस निकै स्मूथ र छिटो छ`,
          `🛡️ समयमै सेक्युरिटी र फिचर अपडेट प्राप्त हुन्छ`,
          `📱 सफा लुक र उपयोगी फिचरहरू छन्`,
          `🔄 एपहरू बिना कुनै ढिलाइ तुरुन्तै खुल्छन्`
        ];
      }
    } else if (q.k === 'recommend') {
      if (lang === 'en') {
        customizedOptions = [
          `⭐⭐⭐⭐⭐ 5 Stars - Highly recommend ${phoneName} to everyone!`,
          `⭐⭐⭐⭐ 4 Stars - Excellent value for money, great performance`,
          `⭐⭐⭐ 3 Stars - Decent daily phone, needs minor software polish`,
          `⭐⭐⭐⭐⭐ 5 Stars - Best smartphone purchase in this category!`
        ];
      } else if (lang === 'es') {
        customizedOptions = [
          `⭐⭐⭐⭐⭐ 5 Estrellas - ¡Recomiendo ${phoneName} a todos!`,
          `⭐⭐⭐⭐ 4 Estrellas - Excelente relación precio-calidad`,
          `⭐⭐⭐ 3 Estrellas - Buen teléfono para el día a día`,
          `⭐⭐⭐⭐⭐ 5 Estrellas - La mejor compra en esta categoría!`
        ];
      } else {
        customizedOptions = [
          `⭐⭐⭐⭐⭐ ५ स्टार - ${phoneName} सबैलाई लिन सिफारिस गर्दछु!`,
          `⭐⭐⭐⭐ ४ स्टार - मूल्य अनुसार एकदमै राम्रो फोन`,
          `⭐⭐⭐ ३ स्टार - दैनिक कामको लागि ठिकै छ`,
          `⭐⭐⭐⭐⭐ ५ स्टार - यो सेगमेन्टमा उत्कृष्ट फोन!`
        ];
      }
    }

    return {
      ...q,
      title: q.title.replace(/फोन/g, phoneName),
      options: customizedOptions,
      voiceText: (name: string, pName: string) => q.voiceText(name, pName || phoneName),
      aiAcknowledgement: (name: string, pName: string, nextIdx: number) => q.aiAcknowledgement(name, pName || phoneName, nextIdx),
    };
  });
}

/**
 * Returns the exact 10 core mobile review questions specifically tailored
 * to the exact phone brand and model (e.g. Vivo, Apple, Samsung, OnePlus, Xiaomi, Pixel),
 * with natural sequential questions and greeting by user name ONLY ONCE at the start.
 */
export function get10CoreMobileQuestions(
  phone: { id: string; name: string; brand: string; spec?: string; priceNPR?: number },
  lang: InterviewLanguage = 'ne'
): InterviewQuestionItem[] {
  const brandLower = (phone.brand || '').toLowerCase();
  const phoneName = phone.name || 'Smartphone';

  const isApple = brandLower === 'apple' || phoneName.toLowerCase().includes('iphone');
  const isSamsung = brandLower === 'samsung' || phoneName.toLowerCase().includes('galaxy');
  const isVivo = ['vivo', 'iqoo'].includes(brandLower) || phoneName.toLowerCase().includes('vivo') || phoneName.toLowerCase().includes('iqoo');
  const isOnePlus = brandLower === 'oneplus' || phoneName.toLowerCase().includes('oneplus');
  const isXiaomi = ['xiaomi', 'redmi', 'poco'].includes(brandLower) || phoneName.toLowerCase().includes('redmi') || phoneName.toLowerCase().includes('poco') || phoneName.toLowerCase().includes('xiaomi');
  const isPixel = brandLower === 'google' || phoneName.toLowerCase().includes('pixel');
  const isOppo = ['oppo', 'realme'].includes(brandLower) || phoneName.toLowerCase().includes('oppo') || phoneName.toLowerCase().includes('realme');

  // Camera technology
  const cameraTech = isVivo
    ? '50MP ZEISS Optics & Aura Light Portrait'
    : isApple
    ? '48MP Fusion & Photonic Engine'
    : isSamsung
    ? (phoneName.includes('Ultra') ? '200MP Quad Zoom & Nightography' : '50MP OIS Dual Pixel')
    : isOnePlus
    ? '50MP Hasselblad Color Tuning'
    : isXiaomi
    ? (phoneName.includes('Ultra') ? 'Leica 1-inch Summilux' : '200MP Ultra-Clear OIS')
    : isPixel
    ? '50MP Pixel Real Tone & Gemini AI'
    : isOppo
    ? '50MP Sony Ultra-Clear Portrait OIS'
    : '50MP High-Resolution OIS';

  // Fast charging technology
  const chargeTech = isVivo
    ? '80W/100W FlashCharge'
    : isOnePlus
    ? '100W SUPERVOOC Fast Charge'
    : isXiaomi
    ? '120W HyperCharge'
    : isSamsung
    ? '45W Super Fast Charging'
    : isApple
    ? '25W MagSafe & USB-C Fast Charge'
    : isPixel
    ? '30W Fast Charge'
    : 'Fast Turbo Charging';

  // OS name
  const osName = isApple
    ? 'iOS'
    : isSamsung
    ? 'One UI'
    : isVivo
    ? 'FuntouchOS'
    : isOnePlus
    ? 'OxygenOS'
    : isXiaomi
    ? 'Xiaomi HyperOS'
    : isPixel
    ? 'Pure Google Android'
    : isOppo
    ? 'ColorOS'
    : 'Android';

  // 1. Unboxing
  const q1: InterviewQuestionItem = {
    id: 1,
    k: 'unboxing',
    category: lang === 'es' ? 'Desempaque y Caja' : lang === 'en' ? 'Unboxing & Retail Box' : lang === 'hi' ? 'अनबॉक्सिंग और खरीद' : 'अनबक्सिङ र खरिद अनुभव',
    emoji: '📦',
    title: lang === 'es' ? `1. ¿Dónde compraste tu ${phoneName} y qué venía dentro de la caja?`
      : lang === 'en' ? `1. Where did you buy your ${phoneName} and what came in the retail box?`
      : lang === 'hi' ? `१. आपने यह ${phoneName} कहाँ से खरीदा और बॉक्स में क्या-क्या मिला?`
      : `१. तपाईंले यो ${phoneName} कहाँबाट किन्नुभयो र बक्समा के-के आयो?`,
    voiceText: (name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') {
        const greet = name ? `¡Hola ${name}! Te damos la bienvenida a la reseña de tu ${targetPhone}. ` : '';
        return `${greet}Pregunta 1: ¿Dónde compraste tu ${targetPhone} y qué venía dentro de la caja?`;
      }
      if (lang === 'en') {
        const greet = name ? `Namaste ${name}! Welcome to your ${targetPhone} video review. ` : '';
        return `${greet}Question 1: Where did you purchase your ${targetPhone}, and what came in the retail box?`;
      }
      if (lang === 'hi') {
        const greet = name ? `नमस्ते ${name}! आपके ${targetPhone} के वीडियो रिव्यू में स्वागत है। ` : '';
        return `${greet}सवाल १: आपने अपना ${targetPhone} कहाँ से खरीदा और बॉक्स में क्या-क्या मिला?`;
      }
      const greet = name ? `नमस्ते ${name}! तपाईंको ${targetPhone} को भिडियो रिभ्युमा स्वागत छ। ` : '';
      return `${greet}प्रश्न १: तपाईंले यो ${targetPhone} कहाँबाट किन्नुभएको हो र बक्समा के-के आयो?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Entendido! Compra registrada. Pasemos a la siguiente pregunta.'
      : lang === 'en' ? 'Got it! Unboxing noted. Moving to question 2.'
      : lang === 'hi' ? 'समझ गया! खरीदारी का अनुभव नोट हुआ। आगे बढ़ते हैं।'
      : 'बुझियो! खरिद अनुभव टिपियो। अब दोस्रो प्रश्नमा जाऔँ।',
    hint: 'Choose your purchase location and packaging details',
    sampleText: `I bought this ${phoneName} brand new from an authorized store in sealed original box.`,
    options: lang === 'es' ? [
      '🛍️ Tienda Oficial',
      '📦 Pedido Online',
      '🎁 Regalo Familiar',
      '🏪 Tienda Local'
    ] : lang === 'en' ? [
      '🛍️ Official Store',
      '📦 Online Delivery',
      '🎁 Gift from Family',
      '🏪 Local Retailer'
    ] : lang === 'hi' ? [
      '🛍️ ऑफिशियल स्टोर',
      '📦 ऑनलाइन डिलीवरी',
      '🎁 परिवार से गिफ्ट',
      '🏪 लोकल दुकान'
    ] : [
      '🛍️ आधिकारिक शोरुम',
      '📦 अनलाइन अर्डर',
      '🎁 परिवारबाट उपहार',
      '🏪 स्थानीय पसल'
    ]
  };

  // 2. In-Hand Comfort & Grip
  const q2: InterviewQuestionItem = {
    id: 2,
    k: 'comfort',
    category: lang === 'es' ? 'Comodidad en Mano' : lang === 'en' ? 'In-Hand Comfort & Grip' : lang === 'hi' ? 'इन-हैंड कम्फर्ट' : 'ग्रिप र कम्फर्ट',
    emoji: '🖐️',
    title: lang === 'es' ? `2. ¿Cómo se siente en la mano el peso y agarre de este ${phoneName}?`
      : lang === 'en' ? `2. How is the in-hand comfort, grip and weight of this ${phoneName}?`
      : lang === 'hi' ? `२. इस ${phoneName} का इन-हैंड कम्फर्ट, ग्रिप और वज़न कैसा है?`
      : `२. यो ${phoneName} को ग्रिप, तौल र हातमा कम्फर्ट कस्तो छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 2: ¿Cómo se siente en la mano el peso y agarre de este ${targetPhone}?`;
      if (lang === 'en') return `Question 2: In your hand, how comfortable is the grip and weight of this ${targetPhone}?`;
      if (lang === 'hi') return `सवाल २: इस ${targetPhone} को हाथ में पकड़ने पर ग्रिप और वज़न कैसा लगता है?`;
      return `प्रश्न २: यो ${targetPhone} हातमा समातेर चलाउँदा कस्तो महसुस हुन्छ? तौल र ग्रिप कत्तिको सजिलो छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Genial! Comodidad y ergonomía guardadas.'
      : lang === 'en' ? 'Nice! Grip and ergonomics recorded.'
      : lang === 'hi' ? 'बहुत खूब! ग्रिप और कम्फर्ट दर्ज हुआ।'
      : 'धेरै राम्रो! ग्रिप कम्फर्ट सुरक्षित भयो।',
    hint: 'Rate daily hand comfort and single-handed use',
    sampleText: 'Lightweight in hand, balanced weight distribution and comfortable for long typing.',
    options: lang === 'es' ? [
      '🖐️ Agarre Firme',
      '📱 Fácil a 1 Mano',
      '⚠️ Mejor con Funda',
      '👌 Ligero y Cómodo'
    ] : lang === 'en' ? [
      '🖐️ Solid, Firm Grip',
      '📱 Easy 1-Hand Text',
      '⚠️ Best With Case',
      '👌 Light & Balanced'
    ] : lang === 'hi' ? [
      '🖐️ सॉलिड ग्रिप',
      '📱 एक हाथ से आसान',
      '⚠️ कवर लगाना बेहतर',
      '👌 हल्का और आरामदायक'
    ] : [
      '🖐️ बलियो ग्रिप',
      '📱 एक हातले सजिलो',
      '⚠️ कभर सहित राम्रो',
      '👌 हलुका र कम्फर्ट'
    ]
  };

  // 3. Display Clarity & Smoothness
  const q3: InterviewQuestionItem = {
    id: 3,
    k: 'display',
    category: lang === 'es' ? 'Pantalla y 120Hz' : lang === 'en' ? 'Display & 120Hz Fluidity' : lang === 'hi' ? 'डिस्प्ले और १२०Hz' : 'डिस्प्ले र १२०Hz',
    emoji: '📱',
    title: lang === 'es' ? `3. ¿Qué tan nítida y fluida es la pantalla a 120Hz de tu ${phoneName}?`
      : lang === 'en' ? `3. How is the display vibrancy and 120Hz smoothness on your ${phoneName}?`
      : lang === 'hi' ? `३. इस ${phoneName} की डिस्प्ले क्लैरिटी और १२०Hz स्मूथनेस कैसी है?`
      : `३. यो ${phoneName} को स्क्रिन क्लियारिटी र १२०Hz स्मूथनेस कस्तो छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 3: ¿Qué tan fluida y nítida es la pantalla de tu ${targetPhone}?`;
      if (lang === 'en') return `Question 3: How is the screen smoothness and display clarity on your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल ३: इस ${targetPhone} की स्क्रीन और डिस्प्ले स्मूथनेस आपको कैसी लगी?`;
      return `प्रश्न ३: यो ${targetPhone} को स्क्रिन कत्तिको स्मूथ र सफा छ? भिडियो हेर्दा अनुभव कस्तो लाग्छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Excelente! Pantalla anotada.'
      : lang === 'en' ? 'Superb! Display feedback logged.'
      : lang === 'hi' ? 'बढ़िया! डिस्प्ले की समीक्षा रिकॉर्ड हुई।'
      : 'उत्कृष्ट! डिस्प्ले रिभ्यु रेकर्ड भयो।',
    hint: 'Rate screen sharpness, colors, and refresh rate',
    sampleText: 'Super smooth 120Hz display with rich vibrant colors and clear sunlight visibility.',
    options: lang === 'es' ? [
      '⚡ Fluida 120Hz',
      '🌈 Colores Vivos',
      '☀️ Brillo al Sol',
      '✨ Cómoda de Noche'
    ] : lang === 'en' ? [
      '⚡ Butter-Smooth 120Hz',
      '🌈 Vibrant Colors',
      '☀️ Crisp in Sunlight',
      '✨ Gentle on Eyes'
    ] : lang === 'hi' ? [
      '⚡ स्मूथ १२०Hz',
      '🌈 ब्राइट रंग',
      '☀️ धूप में साफ',
      '✨ आँखों पर आराम'
    ] : [
      '⚡ पानी जस्तै स्मूथ',
      '🌈 आकर्षक रंगहरू',
      '☀️ घाममा प्रष्ट',
      '✨ आरामदायी स्क्रिन'
    ]
  };

  // 4. Camera: What You Like Most
  const q4: InterviewQuestionItem = {
    id: 4,
    k: 'camera_like',
    category: lang === 'es' ? 'Cámara: Lo que más te gusta' : lang === 'en' ? 'Camera: What You Like' : lang === 'hi' ? 'कैमरा: सबसे अच्छी बात' : 'क्यामेरा: सबैभन्दा मनपर्ने कुरा',
    emoji: '📸',
    title: lang === 'es' ? `4. ¿Qué es lo que más te GUSTA de la cámara de tu ${phoneName}?`
      : lang === 'en' ? `4. What do you LIKE MOST about the camera photos on your ${phoneName}?`
      : lang === 'hi' ? `४. इस ${phoneName} के कैमरे में आपको सबसे बढ़िया क्या लगा?`
      : `४. यो ${phoneName} को क्यामेरामा तपाईंलाई सबैभन्दा मन परेको कुरा के हो?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 4: ¿Qué es lo que más te gusta de la cámara de tu ${targetPhone}?`;
      if (lang === 'en') return `Question 4: What do you like most about the camera photos on your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल ४: अपने ${targetPhone} के कैमरे में आपको सबसे बढ़िया क्या लगा?`;
      return `प्रश्न ४: यो ${targetPhone} को क्यामेरामा तपाईंलाई सबैभन्दा मन परेको कुरा के हो?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Buen comentario de la cámara! Continuemos.'
      : lang === 'en' ? 'Great camera feedback logged! Moving forward.'
      : lang === 'hi' ? 'कैमरा फीडबैक नोट हो गया। आगे बढ़ते हैं।'
      : 'क्यामेरा मन परेको कुरा नोट भयो। अब अर्को प्रश्नमा जाऔँ।',
    hint: 'Highlight daylight photos, portrait mode, and detail',
    sampleText: `Primary sensor takes razor-sharp photos with true skin tone and zero shutter lag.`,
    options: lang === 'es' ? [
      '📸 Gran Nitidez',
      '🎨 Tonos Naturales',
      '🔍 Buen Zoom',
      '⚡ Disparo Rápido'
    ] : lang === 'en' ? [
      '📸 Razor-Sharp Daylight',
      '🎨 Natural Skin Tones',
      '🔍 Clear Zoom Detail',
      '⚡ Zero Shutter Blur'
    ] : lang === 'hi' ? [
      '📸 साफ डेलाइट फोटो',
      '🎨 नेचुरल स्किन टोन',
      '🔍 क्लियर ज़ूम',
      '⚡ तुरंत फोटो कैप्चर'
    ] : [
      '📸 सफा डेलाइट फोटो',
      '🎨 प्राकृतिक स्किन टोन',
      '🔍 स्पष्ट जुम डिटेल',
      '⚡ फास्ट सटर स्पीड'
    ]
  };

  // 5. Night Mode Photography
  const q5: InterviewQuestionItem = {
    id: 5,
    k: 'camera_night',
    category: lang === 'es' ? 'Fotografía Nocturna' : lang === 'en' ? 'Night & Low-Light Camera' : lang === 'hi' ? 'नाइट मोड कैमरा' : 'नाइट मोड फोटोग्राफी',
    emoji: '🌙',
    title: lang === 'es' ? `5. ¿Cómo rinde el modo nocturno con poca luz en tu ${phoneName}?`
      : lang === 'en' ? `5. How does Night Mode perform in dim rooms on your ${phoneName}?`
      : lang === 'hi' ? `५. रात के अंधेरे में या कम रोशनी में इस ${phoneName} का कैमरा कैसा है?`
      : `५. रातिको अँध्यारो वा कम बत्तीमा यो ${phoneName} को क्यामेरा कस्तो छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 5: ¿Cómo rinden las fotos nocturnas y con poca luz en tu ${targetPhone}?`;
      if (lang === 'en') return `Question 5: How do night mode and low-light photos look on your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल ५: रात के अंधेरे में या कम रोशनी में इस ${targetPhone} का कैमरा कैसा काम करता है?`;
      return `प्रश्न ५: रातिको समयमा वा कम बत्तीमा यो ${targetPhone} को क्यामेराले कस्तो फोटो खिच्छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Anotado! Modo noche guardado.'
      : lang === 'en' ? 'Noted! Low-light night mode details saved.'
      : lang === 'hi' ? 'नाइट मोड की जानकारी सुरक्षित हुई।'
      : 'नाइट मोडको प्रतिक्रिया सुरक्षित भयो।',
    hint: 'Evaluate dark room photos, street light flare, and noise',
    sampleText: 'Night mode brightens dark scenes cleanly without grainy noise.',
    options: lang === 'es' ? [
      '🌙 Noche Luminosa',
      '💡 Sin Reflejos',
      '⏳ Rápido en 1s',
      '🌃 Buena Luz Baja'
    ] : lang === 'en' ? [
      '🌙 Bright Night Shots',
      '💡 No Street Flare',
      '⏳ Fast 1s Shot',
      '🌃 Clear Low Light'
    ] : lang === 'hi' ? [
      '🌙 अंधेरे में ब्राइट',
      '💡 कोई चकाचौंध नहीं',
      '⏳ १ सेकंड में शॉट',
      '🌃 रात में साफ फोटो'
    ] : [
      '🌙 अँध्यारोमा उज्यालो',
      '💡 बत्ती नफैलने',
      '⏳ १ सेकेन्डमै सट',
      '🌃 सफा नाइट मोड'
    ]
  };

  // 6. Daily Performance & Speed
  const q6: InterviewQuestionItem = {
    id: 6,
    k: 'performance',
    category: lang === 'es' ? 'Velocidad y Rendimiento' : lang === 'en' ? 'Daily Speed & Multitasking' : lang === 'hi' ? 'दैनिक स्पीड और गति' : 'दैनिक स्पिड र मल्टिटास्किङ',
    emoji: '⚡',
    title: lang === 'es' ? `6. En el uso diario, ¿qué tan rápido responde tu ${phoneName}?`
      : lang === 'en' ? `6. In daily use, how fast and snappy is your ${phoneName}?`
      : lang === 'hi' ? `६. रोज़ाना इस्तेमाल में इस ${phoneName} की स्पीड और गति कैसी है?`
      : `६. दैनिक प्रयोगमा यो ${phoneName} को गति कस्तो छ? कत्तिको छिटो चल्छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 6: En el uso diario, ¿qué tan rápido y fluido responde tu ${targetPhone}?`;
      if (lang === 'en') return `Question 6: In daily use, how fast and responsive is your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल ६: रोज़ाना इस्तेमाल में इस ${targetPhone} की स्पीड और परफॉरमेंस कैसी है?`;
      return `प्रश्न ६: दैनिक प्रयोगमा विभिन्न एपहरू चलाउँदा ${targetPhone} को स्पिड कस्तो छ? कत्तिको छिटो चल्छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Comprendido! Rendimiento registrado.'
      : lang === 'en' ? 'Understood! Daily speed logged.'
      : lang === 'hi' ? 'स्पीड और परफॉरमेंस दर्ज हुआ।'
      : 'दैनिक स्पिड र पर्फर्मेन्स टिपियो।',
    hint: 'Rate app opening speed, multitasking, and stability',
    sampleText: 'Instant app launches, smooth multitasking, zero app crashes.',
    options: lang === 'es' ? [
      '⚡ Súper Rápido',
      '📑 Multitarea Fluida',
      `✨ Fluido ${osName}`,
      '💨 Cero Tirones'
    ] : lang === 'en' ? [
      '⚡ Fast, Zero Lag',
      '📑 Easy Multitasking',
      `✨ Fluid ${osName}`,
      '💨 Snappy All Day'
    ] : lang === 'hi' ? [
      '⚡ सुपर फास्ट स्पीड',
      '📑 मल्टीटास्किंग आसान',
      `✨ स्मूथ ${osName}`,
      '💨 बिना रुकावट'
    ] : [
      '⚡ तीव्र गति, नो ल्याग',
      '📑 धेरै एप सहजै',
      `✨ स्मूथ ${osName}`,
      '💨 फटाफट चल्ने'
    ]
  };

  // 7. Gaming & Thermals
  const q7: InterviewQuestionItem = {
    id: 7,
    k: 'gaming_heat',
    category: lang === 'es' ? 'Juegos y Temperatura' : lang === 'en' ? 'Gaming & Thermals' : lang === 'hi' ? 'गेमिंग और हीटिंग' : 'गेमिंग र तापक्रम',
    emoji: '🎮',
    title: lang === 'es' ? `7. Al jugar o grabar video en tu ${phoneName}, ¿se calienta o mantiene buen control?`
      : lang === 'en' ? `7. When gaming or recording video on your ${phoneName}, does it heat up?`
      : lang === 'hi' ? `७. गेमिंग या लंबा वीडियो बनाते समय क्या यह ${phoneName} गर्म होता है?`
      : `७. गेम खेल्दा वा लामो भिडियो खिच्दा यो ${phoneName} कत्तिको तातिन्छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 7: Al jugar o usar apps pesadas, ¿tu ${targetPhone} se calienta o mantiene buen rendimiento?`;
      if (lang === 'en') return `Question 7: When gaming or multitasking, does your ${targetPhone} stay cool or get warm?`;
      if (lang === 'hi') return `सवाल ७: गेमिंग के दौरान क्या यह ${targetPhone} गर्म होता है या स्मूथ चलता है?`;
      return `प्रश्न ७: लामो समय गेम खेल्दा वा धेरै काम गर्दा यो ${targetPhone} तातिने वा ल्याग हुने समस्या छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Perfecto! Temperatura anotada.'
      : lang === 'en' ? 'Got it! Thermals and gaming logged.'
      : lang === 'hi' ? 'हीटिंग और गेमिंग फीडबैक नोट हुआ।'
      : 'तापक्रम र गेमिंग विवरण सुरक्षित भयो।',
    hint: 'Mention thermal management, FPS stability, and hand feel',
    sampleText: 'Handles 3D games smoothly with steady frame rate and controlled thermals.',
    options: lang === 'es' ? [
      '🎮 Buenos FPS',
      '❄️ Se Mantiene Fresco',
      '🌡️ Apenas Tibio',
      '🕹️ Cero Caídas'
    ] : lang === 'en' ? [
      '🎮 High Stable FPS',
      '❄️ Stays Cool',
      '🌡️ Slight Warmth Only',
      '🕹️ Zero Frame Drops'
    ] : lang === 'hi' ? [
      '🎮 हाई FPS गेमिंग',
      '❄️ फोन ठंडा रहता',
      '🌡️ हल्का सा गर्म',
      '🕹️ कोई लैग नहीं'
    ] : [
      '🎮 हाइ FPS गेमिंग',
      '❄️ फोन चिसो रहन्छ',
      '🌡️ हल्का न्यानो मात्र',
      '🕹️ स्थिर पर्फर्मेन्स'
    ]
  };

  // 8. Battery Life & Fast Charge
  const q8: InterviewQuestionItem = {
    id: 8,
    k: 'battery',
    category: lang === 'es' ? 'Batería y Carga' : lang === 'en' ? 'Battery Life & Charging' : lang === 'hi' ? 'बैटरी और चार्जिंग' : 'ब्याट्री र चार्जिङ',
    emoji: '🔋',
    title: lang === 'es' ? `8. ¿Cuánto dura la batería y ${chargeTech} en tu ${phoneName}?`
      : lang === 'en' ? `8. How long does the battery and ${chargeTech} last on your ${phoneName}?`
      : lang === 'hi' ? `८. एक बार चार्ज करने पर इस ${phoneName} की बैटरी और ${chargeTech} कितनी चलती है?`
      : `८. एकपटक चार्ज गर्दा यो ${phoneName} को ब्याट्री र ${chargeTech} कति टिक्छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 8: ¿Cuánto tiempo dura la batería de este ${targetPhone} con una carga completa?`;
      if (lang === 'en') return `Question 8: How long does the battery last on your ${targetPhone} on a single charge?`;
      if (lang === 'hi') return `सवाल ८: एक बार चार्ज करने पर इस ${targetPhone} की बैटरी कितने समय तक चलती है?`;
      return `प्रश्न ८: एकपटक चार्ज गर्दा यो ${targetPhone} को ब्याट्री कति समयसम्म ढुक्कले टिक्छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Excelente! Batería registrada.'
      : lang === 'en' ? 'Great! Battery backup and charging noted.'
      : lang === 'hi' ? 'बैटरी बैकअप का विवरण दर्ज हुआ।'
      : 'ब्याट्री ब्याकअपको तथ्याङ्क नोट भयो।',
    hint: 'Rate screen-on time and charging speed',
    sampleText: 'All-day battery life with 30% remaining at night, charges super fast.',
    options: lang === 'es' ? [
      '🔋 Todo el Día',
      '⚡ Carga Rápida',
      '🌙 Bajo Gasto Noche',
      '🔌 Gran Autonomía'
    ] : lang === 'en' ? [
      '🔋 All-Day Endurance',
      '⚡ Ultra-Fast Charge',
      '🌙 Low Night Drain',
      '🔌 Solid Backup'
    ] : lang === 'hi' ? [
      '🔋 दिनभर की बैटरी',
      '⚡ सुपर फास्ट चार्जिंग',
      '🌙 रात में कम खपत',
      '🔌 लंबा बैटरी बैकअप'
    ] : [
      '🔋 दिनभर ढुक्क ब्याट्री',
      '⚡ छिटो फुल चार्ज',
      '🌙 रातभर नघट्ने',
      '🔌 बलियो ब्याकअप'
    ]
  };

  // 9. Main Dislike or Annoyance
  const q9: InterviewQuestionItem = {
    id: 9,
    k: 'dislike',
    category: lang === 'es' ? 'Lo que NO te gusta (Dislike)' : lang === 'en' ? 'Main Dislike / Annoyance' : lang === 'hi' ? 'जो पसंद नहीं आया (Dislike)' : 'नमनपरेको वा कमजोरी (Dislike)',
    emoji: '⚠️',
    title: lang === 'es' ? `9. ¿Qué es lo que MENOS te gusta o te molesta de este ${phoneName}?`
      : lang === 'en' ? `9. What is the ONE thing you DISLIKE or find annoying about your ${phoneName}?`
      : lang === 'hi' ? `९. इस ${phoneName} में ऐसी कौन सी बात है जो आपको बिल्कुल पसंद नहीं आई?`
      : `९. यो ${phoneName} मा तपाईंलाई मन नपरेको वा दिक्क लाग्ने मुख्य कुरा के हो?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 9: ¿Qué es lo que menos te gusta o mejorarías de este ${targetPhone}?`;
      if (lang === 'en') return `Question 9: What is the one thing you dislike or find annoying about your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल ९: इस ${targetPhone} में ऐसी कौन सी बात है जो आपको पसंद नहीं आई?`;
      return `प्रश्न ९: यो ${targetPhone} मा तपाईंलाई मन नपरेको वा दिक्क लाग्ने मुख्य कमजोरी के हो?`;
    },
    aiAcknowledgement: () => lang === 'es' ? '¡Crítica constructiva guardada! Ahora la última pregunta.'
      : lang === 'en' ? 'Crucial constructive feedback logged! Now the final question.'
      : lang === 'hi' ? 'कमजोरी नोट हो गई। अब आखिरी सवाल।'
      : 'महत्वपूर्ण कमजोरी टिपोट गरियो! अब अन्तिम प्रश्नमा जाऔँ।',
    hint: 'Be honest about heating, size, missing accessories or software quirks',
    sampleText: 'Slight warmth during outdoor summer video recording, back glass is slippery without case.',
    options: lang === 'es' ? [
      '⚠️ Tibio en Video 4K',
      '📱 Resbala sin Funda',
      '📦 Pocos Accesorios',
      '🔋 Gasto Alto al Sol'
    ] : lang === 'en' ? [
      '⚠️ Warm on 4K Video',
      '📱 Slippery Body',
      '📦 Needs More In-Box',
      '🔋 Fast Sun Drain'
    ] : lang === 'hi' ? [
      '⚠️ 4K वीडियो में गर्माहट',
      '📱 बिना कवर फिसलन',
      '📦 बॉक्स में कम सामान',
      '🔋 धूप में बैटरी खपत'
    ] : [
      '⚠️ ४K भिडियोमा तातो',
      '📱 कभर बिना चिप्लो',
      '📦 बक्समा सामान कम',
      '🔋 घाममा बढी खपत'
    ]
  };

  // 10. Need to Improve & Star Rating
  const q10: InterviewQuestionItem = {
    id: 10,
    k: 'need_to_improve',
    category: lang === 'es' ? 'Qué mejorar y Calificación' : lang === 'en' ? 'Need to Improve & Star Rating' : lang === 'hi' ? 'क्या सुधार चाहिए और रेटिंग' : 'कम्पनीले के सुधार गर्नुपर्छ र रेटिंग',
    emoji: '🌟',
    title: lang === 'es' ? `10. ¿Qué debe MEJORAR ${phone.brand} en este ${phoneName} y cuántas estrellas le das?`
      : lang === 'en' ? `10. What should ${phone.brand} IMPROVE in ${phoneName}, and your final rating?`
      : lang === 'hi' ? `१०. कंपनी को ${phoneName} में क्या सुधार करना चाहिए, और आपकी फाइनल स्टार रेटिंग?`
      : `१०. कम्पनीले ${phoneName} मा अब के सुधार गर्नुपर्छ, र ५ मा कति स्टार दिनुहुन्छ?`,
    voiceText: (_name, p) => {
      const targetPhone = p || phoneName;
      if (lang === 'es') return `Pregunta 10: ¿Qué debería mejorar la marca en este ${targetPhone} y cuántas estrellas de cinco le das?`;
      if (lang === 'en') return `Question 10: What should the company improve in the next update, and how many stars out of 5 do you rate your ${targetPhone}?`;
      if (lang === 'hi') return `सवाल १०: कंपनी को ${targetPhone} में क्या सुधार करना चाहिए और आप इसे ५ में से कितने स्टार देंगे?`;
      return `प्रश्न १०: कम्पनीले ${targetPhone} मा अब के सुधार गर्नुपर्छ र ५ मा कति स्टार दिनुहुन्छ?`;
    },
    aiAcknowledgement: () => lang === 'es' ? `¡Muchas gracias! Tu reseña de 10 preguntas para ${phoneName} ha finalizado con éxito.`
      : lang === 'en' ? `10-question mobile review completed! Thank you, your review for ${phoneName} is complete!`
      : lang === 'hi' ? `धन्यवाद! आपके ${phoneName} की १० सवालों की समीक्षा पूरी हुई!`
      : `धन्यवाद! तपाईंको ${phoneName} को १० वटै प्रश्नको रिभ्यु पूरा भयो!`,
    hint: 'Give your final star rating and suggestion for next update',
    sampleText: `I give ${phoneName} 5 stars! Outstanding phone in its class.`,
    options: lang === 'es' ? [
      '⭐⭐⭐⭐⭐ 5★ Recomendado',
      '⭐⭐⭐⭐ 4★ Gran Compra',
      '⭐⭐⭐ 3★ Mejorable',
      '⭐⭐⭐⭐⭐ 5★ El Mejor'
    ] : lang === 'en' ? [
      '⭐⭐⭐⭐⭐ 5★ Top Choice!',
      '⭐⭐⭐⭐ 4★ Great Value',
      '⭐⭐⭐ 3★ Needs Polish',
      '⭐⭐⭐⭐⭐ 5★ Best in Class'
    ] : lang === 'hi' ? [
      '⭐⭐⭐⭐⭐ ५★ टॉप चॉइस!',
      '⭐⭐⭐⭐ ४★ बढ़िया फोन',
      '⭐⭐⭐ ३★ सुधार चाहिए',
      '⭐⭐⭐⭐⭐ ५★ बेस्ट फोन'
    ] : [
      '⭐⭐⭐⭐⭐ ५★ उत्कृष्ट रोजाइ!',
      '⭐⭐⭐⭐ ४★ राम्रो मूल्य',
      '⭐⭐⭐ ३★ सुधार आवश्यक',
      '⭐⭐⭐⭐⭐ ५★ सर्वोत्कृष्ट'
    ]
  };

  return [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10];
}

