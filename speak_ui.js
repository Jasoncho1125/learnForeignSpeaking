let confirmCallback = null;

/**
 * 커스텀 확인 창을 표시합니다.
 * @param {string} message - 모달에 표시할 메시지
 * @param {function} onConfirm - '확인' 버튼을 눌렀을 때 실행할 콜백 함수
 */
function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const messageElement = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    messageElement.textContent = message;
    confirmCallback = onConfirm;

    modal.style.display = 'flex';

    confirmBtn.onclick = () => {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        hideConfirmationModal();
    };

    cancelBtn.onclick = () => {
        hideConfirmationModal();
    };
}

function hideConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    modal.style.display = 'none';
    confirmCallback = null; // 콜백 함수 초기화
}

// 설정 클릭했을때 동작하는 함수 : 토글 함수임. 
function toggleSettings() {
    const settingsContainer = document.getElementById('settings-container');
    const btn_setting = document.getElementById('btn_setting');

    if (settingsContainer.style.display === 'block') {
        settingsContainer.style.display = 'none';
        btn_setting.textContent = "설 정";
    } else {
        // Sync UI with current variable values
        document.getElementById('slider').value = defaultFontSize;
        document.getElementById('valueDisplay').textContent = defaultFontSize;
        document.getElementById('id_showscript_kor').checked = showScriptModeKor;
        document.getElementById('id_showscript').checked = showScriptMode;
        document.getElementById('id_mp3PlayMode').checked = mp3PlayMode;
        document.getElementById('korea_toggle').checked = koreaPlay;
        document.getElementById('compose').checked = composeMode;
        document.getElementById('foreign_first').checked = foreignFirst;
        
        // 영어사전 타입 라디오 버튼 동기화
        document.querySelector(`input[name="enDictSelect"][value="${englishDictType || 'enKo'}"]`).checked = true;
        
        settingsContainer.style.display = 'block';
        btn_setting.textContent = "설정닫기";
    }
}

// input slider 에서 아래 함수를 호출하여 폰트 설정을 함. 
function changeFontSize(value) {
    defaultFontSize = parseInt(value); // 기본 폰트 사이즈를 변경함. 
    
    // [추가] 메인 폰트 사이즈 변경 시 외국어 폰트 사이즈도 기본 비율(+4)에 맞춰 동기화함
    // 사용자가 별도로 +/- 버튼을 누르기 전까지는 이 비율을 유지함
    script_foreign_Font = defaultFontSize + 4;

    saveToFirebase(); // 변경된 기본 폰트 사이즈를 Firebase에 저장함. 
    let font_button = value;
    let font_button4th = parseInt(value) - 2;  // 숫자로 변환하여 폰트 크기 변경
    let font_button5th = parseInt(value) - 3;
    let font_p_font = value;
    let font_p_font_a = value;
    let font_p_font_script = value;  // 외국어 스크립트 전용 폰트 
    let font_p_font_a_large = parseInt(value) + 2;  //한국어는 더 작게
    let font_p_font_b_large = parseInt(value) + 6;  //외국어는 더 크게 함
    let font_p_font_b_title = parseInt(value) + 4;
    let font_p_font_b = parseInt(value) + 4;
    let font_font_guide_a = value;

    document.documentElement.style.setProperty('--font_button', font_button + 'px');
    document.documentElement.style.setProperty('--font_button4th', font_button4th + 'px');
    document.documentElement.style.setProperty('--font_button5th', font_button5th + 'px');
    document.documentElement.style.setProperty('--font_p_font', font_p_font + 'px');
    document.documentElement.style.setProperty('--font_p_font_a', font_p_font_a + 'px');
    document.documentElement.style.setProperty('--font_p_font_script', font_p_font_script + 'px');
    if(studyLang == "hanja"){  // hanja인 경우에는 폰트를 10폰트 크게 한다. 
        document.documentElement.style.setProperty('--font_p_font_a_large', (font_p_font_a_large + 14) + 'px');
    }else{
        document.documentElement.style.setProperty('--font_p_font_a_large', font_p_font_a_large + 'px');
    }
    document.documentElement.style.setProperty('--font_p_font_b_title', font_p_font_b_title + 'px');
    document.documentElement.style.setProperty('--font_p_font_b', font_p_font_b + 'px');
    document.documentElement.style.setProperty('--font_font_guide_a', font_font_guide_a + 'px');
    
    // 폰트 설정 화면이 열려 있을때에만 값을 표시 하도록 구현함. 
    if (document.getElementById('valueDisplay')){
        document.getElementById('valueDisplay').textContent = value;
    }
}

// PLAY 모드에서 터치로 다음, 이전 선택시 한국어 스크립트를 보일 것인지 선택하는 옵션
// default는 off 으로 되어 있음. 
let showScriptSwitchShowKor = false;
// ShowScript 스위치 생성 영역
function toggleShowScriptSwitchElementKor() {
    const showKorScriptDiv = document.getElementById('showScriptModeKor');
    showKorScriptDiv.style.display = showScriptSwitchShowKor ? 'block' : 'none';
}
// 한국어 show script 스위치 값 선택 및 저장 
function toggleShowScriptSwitchKor() {
    const checkbox = document.getElementById('id_showscript_kor');
    showScriptSwitchShowKor = checkbox.checked;
    if (showScriptSwitchShowKor) {
        showScriptModeKor = true;
    } else {
        showScriptModeKor = false;
    }
    saveToFirebase(); // 변경된 composeMode 정보를 저장한다. 
}


// PLAY 모드에서 터치로 다음, 이전 선택시 스크립트를 보일 것인지 선택하는 옵션
// default는 off 으로 되어 있음. 
let showScriptSwitchShow = false;
// ShowScript 스위치 생성 영역
function toggleShowScriptSwitchElement() {
    const showScriptDiv = document.getElementById('showScriptMode');
    showScriptDiv.style.display = showScriptSwitchShow ? 'block' : 'none';
}
// show script 스위치 값 선택 및 저장 
function toggleShowScriptSwitch() {
    const checkbox = document.getElementById('id_showscript');
    showScriptMode = checkbox.checked;
    const btnScript = document.getElementById('btn_script');
    if (btnScript) btnScript.textContent = showScriptMode ? "자막ON" : "자막OFF";
    saveToFirebase(); 
}



// PLAY 모드에서 터치로 다음, 이전 선택시 스크립트를 보일 것인지 선택하는 옵션션
// default는 off 으로 되어 있음. 
let mp3PlayModeSwitchShow = false;
// ShowScript 스위치 생성 영역
function toggleMp3PlayModeSwitchElement() {
    const mp3PlayModeDiv = document.getElementById('mp3PlayMode');
    mp3PlayModeDiv.style.display = mp3PlayModeSwitchShow ? 'block' : 'none';
}
// show script 스위치 값 선택 표시시 및 저장 
function toggleMp3PlayModeSwitch() {
    const checkbox = document.getElementById('id_mp3PlayMode');
    mp3PlayModeSwitchShow = checkbox.checked;
    if (mp3PlayModeSwitchShow) {
        mp3PlayMode = true;
    } else {
        mp3PlayMode = false;
        showPopup("한곡씩 play 되는 PLAY 모드에서 외국어 MP3 Play가 되지 않도록 설정을 변경합니다.", 3000);
    }
    saveToFirebase(); // 변경된 composeMode 정보를 저장한다. 
}



// 한국어가 있는 경우에 한국어를 play할 것인지 설정하는 스위치
// default는 play off 로 되어 있음. 
let koreaPlaySwitchShow = false;

function toggleKoreaPlaySwitchElement() {
    const koreaplayDiv = document.getElementById('koreaplay');
    koreaplayDiv.style.display = koreaPlaySwitchShow ? 'block' : 'none';
}

function toggleKoreaPlaySwitch() {
    const toggle = document.getElementById('korea_toggle');
    koreaPlaySwitchShow = toggle.checked;
    if (koreaPlaySwitchShow) {
        koreaPlay = true;
    } else {
        koreaPlay = false;
    }
    saveToFirebase(); // 변경된 koreaPlay 정보를 저장한다. 
}

// 한국어를 먼저 보고 외국어를 만들어내는 composeMode를 설정하는 스위치
// default는 off 로 되어 있음. 
let composeModeSwitchShow = false;
// composeMode 스위치 생성 영역
function toggleComposeModeSwitchElement() {
    const composeModeDiv = document.getElementById('composemode');
    composeModeDiv.style.display = composeModeSwitchShow ? 'block' : 'none';
}
// composeMode 스위치 값 선택 및 저장 
function toggleComposeModeSwitch() {
    const checkbox = document.getElementById('compose');
    composeModeSwitchShow = checkbox.checked;
    if (composeModeSwitchShow) {
        composeMode = true;
    } else {
        composeMode = false;
    }
    saveToFirebase(); // 변경된 composeMode 정보를 저장한다. 
}




// PLAY A 모드에서 외국어를 먼저 PLAY 할것인지 설정하는 스위치
// default는 off 로 되어 있음. ==> 한국어 먼저 PLAY 됨됨
let foreignFirstSwitchShow = false;
// composeMode 스위치 생성 영역
function toggleForeignFirstSwitchElement() {
    const foreignFirstDiv = document.getElementById('foreignfirst');
    foreignFirstDiv.style.display = foreignFirstSwitchShow ? 'block' : 'none';
}
// foreign First 스위치 값 선택 및 저장 
function toggleForeignFirstSwitch() {
    const checkbox = document.getElementById('foreign_first');
    foreignFirstSwitchShow = checkbox.checked;
    if (foreignFirstSwitchShow) {
        foreignFirst = true;
    } else {
        foreignFirst = false;
    }
    saveToFirebase(); // 변경된 foreignFirst 정보를 저장한다. 
}

// 영어사전 타입 변경 및 저장
function toggleEnglishDictType() {
    const selectedValue = document.querySelector('input[name="enDictSelect"]:checked').value;
    englishDictType = selectedValue;
    saveToFirebase();
}

// // AI 번역기를 선택하는 스위치
// let aiTranslatorSwitchShow = false;
// // aiTranslator 스위치 생성 영역
// function toggleAiTranslatorSwitchElement() {
//     const aiTranslatorDiv = document.getElementById('aitranslator');
//     aiTranslatorDiv.style.display = aiTranslatorSwitchShow ? 'block' : 'none';
// }
// // AI번역기 값 선택 및 저장 
// function toggleAiTranslatorSwitch() {
//     const selectedValue = document.querySelector('input[name="aiSelect"]:checked').value;
//     aiTranslator = selectedValue;
//     saveToFirebase(); // 변경된 AI 번역기 정보를 저장한다. 
// }

// PLAY A 모드에서 슬립모드 설정하기

let sleepTimeout; // 기존 슬립모드를 종료하기 위한 변수
let sleepInterval; // 남은 시간을 업데이트하기 위한 변수
let isSleepMode = false;

// 슬립모드 실행 함수
async function sleepMode(param) {
    // 파라미터가 'end' 이면 기존 슬립모드를 종료한다. 
    // 사용자가 'STOP'을 누르면 sleep 모드를 강제로 종료한다. 
    if (isSleepMode == true && param == 'end') {
        showPopup("슬립모드를 종료합니다.");
        clearTimeout(sleepTimeout);
        clearInterval(sleepInterval);
        document.getElementById("sleepmode").textContent = ""; // 슬립모드 표시 초기화
        isSleepMode = false;
        document.getElementById("show-finish-delete-button").style.display = "block";
        document.getElementById("show-previous-next-button").style.display = "none";
        return;
    }

    // sleepMode 적용 시간 정보를 팝업창에서 가져온다. 
    let sleepTime = await getSleepModeValue();
    let sleepSecond = sleepTime * 60 * 1000; // 분을 밀리초로 변환

    // 슬립모드가 0인 경우 종료 처리
    if (sleepTime == 0) {
        showPopup("슬립모드를 종료합니다.");
        clearTimeout(sleepTimeout);
        clearInterval(sleepInterval);
        document.getElementById("sleepmode").textContent = ""; // 슬립모드 표시 초기화
        isSleepMode = false;
        document.getElementById("show-finish-delete-button").style.display = "block";
        document.getElementById("show-previous-next-button").style.display = "none";
        return;
    }

    // 이미 슬립모드가 실행 중이면 기존 타이머 종료
    if (isSleepMode) {
        clearTimeout(sleepTimeout);
        clearInterval(sleepInterval);
    }

    isSleepMode = true;
    document.getElementById("show-finish-delete-button").style.display = "none";
    document.getElementById("show-previous-next-button").style.display = "block";

    // 남은 시간을 매 초마다 업데이트
    let remainingTime = sleepTime * 60; // 남은 시간(초)
    sleepInterval = setInterval(() => {
        if (remainingTime <= 0) {
            clearInterval(sleepInterval);
            document.getElementById("sleepmode").textContent = "";
        } else {
            remainingTime--;
            document.getElementById("sleepmode").textContent = `Sleep Mode 남은 시간 : ${Math.floor(remainingTime / 60)}분 ${remainingTime % 60}초`;
        }
    }, 1000);

    // 슬립모드 종료 타이머 설정
    sleepTimeout = setTimeout(() => {
        showPopup("슬립모드를 종료합니다.");
        toggleAllStop();
        document.getElementById("show-finish-delete-button").style.display = "block";
        document.getElementById("show-previous-next-button").style.display = "none";
        isSleepMode = false;
        clearInterval(sleepInterval);
        document.getElementById("sleepmode").textContent = ""; // 슬립모드 종료 시 표시 초기화
    }, sleepSecond);
}


// 슬립모드 시간 가져오기  
async function getSleepModeValue() {
    return new Promise(function (resolve, reject) {
        // 라디오 버튼에 대한 옵션 값들 저장한다. 
        const options = [
            { value: "0", label: "미사용" },
            { value: "10", label: "10분" },
            { value: "20", label: "20분" },
            { value: "30", label: "30분" },
            { value: "45", label: "45분" },
            { value: "60", label: "60분" },
            { value: "90", label: "90분" }
        ];

        // 라디오 버튼 HTML 생성
        let radioButtonsHtml = options.map((option, index) => {
            // 첫번째 미사용에 기본 default checked 속성을 추가
            let isChecked = (index === 0) ? "checked" : "";
            return `<label><input style="margin-bottom: 12px" type="radio" name="value" value="${option.value}" ${isChecked}> ${option.label} </label><br>`;
        }).join('');

        var content = `
            <!DOCTYPE html>
            <html lang="kr">
            <head>
                <meta charset="UTF-8">
                <title>슬립모드 설정하기</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="Style.css" rel="stylesheet">
            </head>
            <body>
                <p>슬립모드 설정할 시간을 선택하세요</p>
                ${radioButtonsHtml}
                <br><br>
                <button class="button4ea btn_color2" onclick="getValueAndClose()">확인</button>
                <button class="button4ea btn_color2" onclick="getValueCancel()">취소</button>
            </body>
            </html>
            `;

        var childWindow = window.open("", "슬립모드 설정", "width=device-width,height=300");
        childWindow.document.write(content);

        childWindow.getValueAndClose = function () {
            var selectedValueInChild;
            var radioButtons = childWindow.document.getElementsByName('value');
            for (var i = 0; i < radioButtons.length; i++) {
                if (radioButtons[i].checked) {
                    selectedValueInChild = radioButtons[i].value;
                    break;
                }
            }
            let sleepTime = parseFloat(selectedValueInChild);
            // defaultDevideNum = groupDevideNum1;  // 변경된 DevideNum 을 받아와서 저장한다. 
            // saveToFirebase();
            childWindow.close();
            resolve(sleepTime);
        };

        childWindow.getValueCancel = function () {
            childWindow.close();
            resolve("cancel"); // 취소하면 "cancel" 리턴함. 
        };
    });
}


// 프로그레스바 만들기 
const progressBar = document.getElementById("myProgressBar");

function updateProgressBar(progress) {
    progressBar.style.width = progress + "%";
}

function updateProgress(newProgress) {
    updateProgressBar(newProgress);
    // requestScreenOn();  // 화면 켜짐 유지 요청하기
}
