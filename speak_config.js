/**
 * speak_config.js
 * 앱의 전역 설정 및 사전 연동 정보를 관리합니다.
 */
const CONFIG = {
    savePageTitle: "Foreign Speaking",
    studyFileName: 'studySpeakingData-v0.6.json',
    studySaveName: 'ForeignSpeaking',
    version: "v0.13",

    // 사전 연동 정보 (language -> 사전 URL 기본 경로)
    DICTIONARIES: {
        english: {
            name: 'Naver English',
            baseUrl: 'https://dict.naver.com/enkodict/#/search?query='
        },
        englishEnEn: {
            name: 'Naver English-English',
            baseUrl: 'https://english.dict.naver.com/english-dictionary/#/search?query='
        },
        spanish: {
            name: 'Naver Espanol',
            baseUrl: 'https://dict.naver.com/eskodict/#/search?query='
        },
        chinese: {
            name: 'Naver Chinese',
            baseUrl: 'https://dict.naver.com/zhkodict/#/search?query='
        },
        japanese: {
            name: 'Naver Japanese',
            baseUrl: 'https://dict.naver.com/jakodict/#/search?query='
        },
        hanja: {
            name: 'Naver Hanja',
            baseUrl: 'https://hanja.dict.naver.com/#/search?query='
        },
        // JSON의 language 값이 config에 없는 경우를 위한 기본값 설정
        default: {
            name: 'Naver Search',
            baseUrl: 'https://search.naver.com/search.naver?query='
        }
    },

    // Firebase 웹 앱 설정
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyDjp3DvH7soIztGVpqLKGIXY4l5qce9zIM",
        authDomain: "studyforeingspeaking.firebaseapp.com",
        databaseURL: "https://studyforeingspeaking-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "studyforeingspeaking",
        storageBucket: "studyforeingspeaking.firebasestorage.app",
        messagingSenderId: "544459214663",
        appId: "1:544459214663:web:622279a7d7250a05eb0662",
        measurementId: "G-QCQMLEGNMB"
    }
};

// Firebase 초기화
firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
firebase.analytics();