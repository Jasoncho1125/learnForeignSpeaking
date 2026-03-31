// 영어 문장에 대해서 단어를 클릭하면 네이버 사전으로 연결하는 기능 구현
function showDictionaryWord(sentence) {
    // 설정에 정의된 언어인지 확인 (config에 있는 언어들은 script_b에 링크 생성)
    const langConfig = CONFIG.DICTIONARIES[studyLang];
    
    // 일본어, 중국어는 발음(pronounce) 영역에, 나머지는 외국어 스크립트(script_b) 영역에 링크 생성
    const targetId = (studyLang === 'japanese' || studyLang === 'chinese') ? 'pronounce' : 'script_b';
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
        targetElement.innerHTML = generateClickableSentence(sentence);
        const links = targetElement.querySelectorAll('.dictionary-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                const word = link.getAttribute('data-word');
                const cleanWord = word.replace(/[,'"?!.¿¡]/g, '').replace(/&quot;/g, '"');
                openDictionary(cleanWord);
            });
        });
        if (targetId === 'pronounce') targetElement.style.textDecorationColor = "red";
    }
}

// Function to open Naver dictionary with the selected word
// 영어와 한자에 대해서 각각 사전 연동 처리함. 
function openDictionary(word) {
    // studyLang 값에 따라 CONFIG에서 설정을 가져옴
    const dict = CONFIG.DICTIONARIES[studyLang] || CONFIG.DICTIONARIES.default;
    const url = dict.baseUrl + encodeURIComponent(word);
    // '_blank' 대신 고정된 이름('speak_dictionary')을 사용하여 열려있는 창을 재사용합니다.
    window.open(url, 'speak_dictionary');
}

// Function to generate the clickable sentence
function generateClickableSentence(sentence) {
    if (!sentence) {
        return '';
    }
    // 단어를 줄바꿈(\n)과 공백으로 구분하여 처리
    const words = sentence.split(/(\s+|\n)/);
    const clickableSentence = words.map(word => {
        // 줄바꿈(\n)은 <br> 태그로 변환하여 화면에 출력
        if (word === '\n') {
            return '<br>';
        }

        // 쌍따옴표를 &quot;으로 변환 => 클릭시 에러 나지 않도록 수정함.
        const safeWord = word.replace(/"/g, '&quot;');
        if (studyLang == 'english' || studyLang == 'spanish' || studyLang == 'chapter' || studyLang == 'hanja') {  // english, spanish, chapter, hanja 인 경우에는 단어에 밑줄을 치치 않는다.
            return `<span class="dictionary-link" style="text-decoration:none;" data-word="${safeWord}">${word}</span>`;
        } else {
            return `<span class="dictionary-link" data-word="${safeWord}">${word}</span>`;
        }
    }).join('');

    return clickableSentence;
}


// Function to generate the clickable sentence
function generateClickableSentence_old(sentence) {
    const words = sentence.split(/[\s\n]+/);
    const clickableSentence = words.map(word => {
        // 쌍따옴표를 &quot;으로 변환 => 클릭시 에러 나지 않도록 수정함. 
        const safeWord = word.replace(/"/g, '&quot;');
        if (studyLang == 'chapter' || studyLang == 'hanja') {  // chapter, hanja 인 경우에는 단어에 밑줄을 치치 않는다.
            return `<span class="dictionary-link" style="text-decoration:none;" data-word="${safeWord}">${word}</span>`;
        } else {
            return `<span class="dictionary-link" data-word="${safeWord}">${word}</span>`;
        }
        }).join(' ');

    return clickableSentence;
}


const imageContainer = document.getElementById('image-container');
const image = document.getElementById('image');

// 이미지 표시 함수
function showImage(src) {
    // src 값을 문자열로 강제 변환합니다.
    const srcString = String(src); 

    // 이미지 소스(srcString)에서 마지막 점(.)의 인덱스를 찾습니다.
    const lastDotIndex = srcString.lastIndexOf('.');

    // 마지막 점이 없거나 점이 있더라도 그 뒤에 문자가 없으면 확장자가 없다고 판단합니다.
    if (lastDotIndex === -1 || lastDotIndex === srcString.length - 1) {
        // .jpg 확장자를 붙여줍니다.
        image.src = srcString + '.jpg';
    } else {
        // 이미 확장자가 있다면 그대로 사용합니다.
        image.src = srcString;
    }
    imageContainer.style.display = 'block';
}

// 이미지 숨기기 함수
function hideImage() {
    imageContainer.style.display = 'none';
}


// 출력할 id값 찾기
// const output = document.getElementById('study_date');

// 오늘 날짜를 "yyyy-mm-dd" 형식으로 반환하는 함수
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 클릭 또는 완료 버튼 클릭 시 myChapterInfo 데이터를 업데이트하는 함수
const updateStudyCountInfo = (type) => {
    // myChapterInfo 객체가 완전히 초기화되지 않았으면 함수를 종료합니다.
    if (!myChapterInfo || Object.keys(myChapterInfo).length === 0 || !myChapterInfo.studyCountInDay) {
        return;
    }

    // const myChapterInfo = loadMyChapterInfo();
    
    const today = getTodayDate();
    // play, finish에 따라서 값 업데이트 
    if (type === 'play' && isSleepMode == false) {  // sleepMode인 경우에는 정보 업데이트 안함. 
        if (!myChapterInfo.studyCountInDay[today]) {
            myChapterInfo.studyCountInDay[today] = 0;
        }
        myChapterInfo.studyCountInDay[today]++;
    } else if (type === 'finish') {
        if (!myChapterInfo.studyFinishCountInDay[today]) {
            myChapterInfo.studyFinishCountInDay[today] = 0;
        }
        myChapterInfo.studyFinishCountInDay[today]++;
    }

    saveToFirebase(); // 변경된 값 저장
    displayStudyCountInfo(myChapterInfo); // 업데이트 값 출력
};

// myChapterInfo 데이터를 기반으로 7일 이내의 자료만 화면에 출력하는 함수
const displayStudyCountInfo = (data) => {
    // data나 필요한 속성이 없으면 함수를 종료합니다.
    if (!data || Object.keys(data).length === 0 || !data.studyCountInDay || !data.studyFinishCountInDay) {
        // console.log("학습 카운트 정보가 아직 없습니다.");
        return;
    }
    // 출력할 html 요소 찾기 
    const output = document.getElementById('study_date');
    let totalPlay = 0;
    let totalFinish = 0;
    const lines = [];

    // 두 객체 가져오기 : playDate, FinishDate
    const studyCountInDay = data.studyCountInDay;
    const studyFinishCountInDay = data.studyFinishCountInDay;

    // 날짜 합치기 및 unique 처리 => 정보가 있는 모든 날짜를 합쳐서 중복 제거
    const uniqueDates = new Set([
        ...Object.keys(studyCountInDay),
        ...Object.keys(studyFinishCountInDay)
    ]);

    // 배열로 변환 후 내림차순 날짜로 정렬
    const sortedDates = [...uniqueDates].sort((a, b) => new Date(b) - new Date(a));

    // 현재 날짜
    const currentDate = new Date();
    const oneDay = 24 * 60 * 60 * 1000; // 하루를 밀리초로 변환

    // 최근 7일 이내의 날짜만 필터링
    const recentDates = sortedDates.filter(date => {
        const dateObj = new Date(date);
        const diffDays = Math.round((currentDate - dateObj) / oneDay);
        return diffDays <= 7 && diffDays >= 0;
    });

    // for (const date in data.studyCountInDay) {
    for (const date of recentDates) {
        // data.studyCountInDay[date]가 정의되지 않았거나 유효하지 않은 값일 경우 0을 기본값으로 사용하도록 보장
        const play = data.studyCountInDay[date] || 0;
        const finish = data.studyFinishCountInDay[date] || 0;

        // play, finish 값이 0 이상인 경우만 값을 저장함. 
        if (play > 0 || finish > 0) {
            totalPlay += play;
            totalFinish += finish;

            // 날짜를 "mm-dd" 형식으로 변환
            const displayDate = date.substring(5);
            lines.push(`•  ${displayDate} : ${finish}(${play})`);
        }
    }

    // play, finish 값이 0 이상인 경우만 출력 => 예시로 넣은 데이터 미출력
    if (totalPlay > 0 || totalFinish > 0) {
        output.innerHTML = `
            [최근7일 학습] Finish(Play) : ${totalFinish}(${totalPlay})<br>
            ${lines.join('<br>')}
        `;
    }
};
