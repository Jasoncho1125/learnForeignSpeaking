// 어플별로 수정할 변수 정리 : 여러개 공부시 서로 충돌 방지 
// 엑셀 필수값 : num, mp3b, script_korean, script_foreign, chapter
// 엑셀 옵션값 : pronounce, explain, mp3a, chapter, list

let savePageTitle = CONFIG.savePageTitle;
let studyFileName = CONFIG.studyFileName;
let studySaveName = CONFIG.studySaveName;
let studyTitle = savePageTitle + " " + CONFIG.version + " : ";

// studyLang은 이제 JSON 데이터에서 동적으로 가져옵니다.
let studyLang = "";


//  Excel to Json : https://products.aspose.app/cells/ko/conversion/excel-to-json
//  웹호스팅 : https://www.netlify.com/?attr=homepage-modal

let showScriptMode; // 책인 경우에 이전, 다음에서 항상 script를 같이 보여 주도록 하는 설정값 저장
let showScriptModeKor; // 책의 경우에 한국어 자막을 보여 줄지 설정하는 설정값 저장장
let koreaPlay;  // 한국어 mp3가 있을 경우에 한국어도 play 해주는 옵션값.
let composeMode; // 한국어를 보고 외국어를 생각해내는 모드. 자동 mp3 Play를 하지 않음.
let mp3PlayMode; // 1곡을 play하는 모드에서 이 모드가 off이면 mp3를 play하지 않음. => 읽기 모드로 사용시 설정함. 
let foreignFirst; // Play A 모드에서 외국어를 먼저 play 할지 지정하는 옵션값. 

// =====================================================================
// studyData[i].finish == 'no'  ==> 암기 대상 : countNoInChapter(chapterName)
// studyData[i].finish == 'yes' ==> 암기 완료 : countYesInChapter(chapterName)
// studyData[i].finish == 'delete' ==> 암기 제외(삭제) : countDeleteInChapter(chapterName)
// Yes + No : countYesNoInChapter(chapterName)
// Chapter의 전체수 : countAllInChapter(chapterName)
// =====================================================================

let myChapterList = {}; // 각 chapter의 현황 정보를 저장. object 파일임.
let studyData; // json 전체 암기 파일의 정보를 object에 저장
let studyDataImsi; // 신규로 DB업데이트를 위한 임시 저장 파일
let currChapterName = ""; // 현재 공부하는 Chapter 이름 정보 저장하는 변수
let currBookName = ""; // 현재 공부하는 Book ID 정보 저장하는 변수
let myChapterInfo = {};  // 현재 공부하는 chapter 정보를 Firebase Database에 저장. object 파일임.
let chapterList = [];  // chapter 정보를 관리하는 배열
let currStudyDataNum = 0; // 현재 암기하고 있는 대상의 번호값 저장, 0부터 시작, 
                        // 그룹에 암기 대상이 0개 이면 현재 값을 99999로 할당한다. => 예외 처리하기 위함함
let yesNoCountInChapter; // 해당 chapter의 전체 암기 대상 수 : Yes + No => countYesNoInChapter()
let noCountInGroup; // 현재 그룹의 암기 대상수, currGroupMemberArr.length
let yesCountInChapter;  // Chapter에서 전체 암기 완료한 수 
let forNoSoundLength;  // mp3 전체 재생시에 외국어 mp3간 묵음 구간  => myChapterInfo
let defaultFontSize; // 기본 폰트 사이즈 설정 => myChapterInfo
let defaultDevideNum; // 기본적으로 그룹을 나누는 값  ==> myChapterInfo 에 저장
let script_foreign_Font = 20; // chapter인 경우 글자를 크게하기 위하여 사용 => myChapterInfo
let defaultPlayCount = 1; // 전체 재생시 외국어 반복 횟수 지정 (기본 1회)
let studyDataVersion; // 현재 학습중인 stady Data의 Version 정보 저장 => myChapterInfo
let studyCountInDay; // 날마다 몇번씩 공부를 했는지 mp3 재생 회수 저장 => myChapterInfo
let studyFinishCountInDAy; // 날마다 몇번씩 공부 완료 했는지 회수 저장 => myChapterInfo
let totalGroupCount; // 전체 그룹 수,  0 은 모두 암기 완료한 경우임. 
let currGroupNum; // 현재 학습중인 그룹 넘버, 최초는 로딩시 1로 설정
let groupDevideNum = 10; // 전체 대상을 학습할 단위로 나누는 개수, default 값 설정
let lastGroupMemberCount; // 제일 마지막 그룹의 멤버 숫자, 최초 그룹 재조정할때 1회 설정
let currGroupMemberArr = []; // 현재 공부하는 그룹의 맴버를 모은 배열
let chapterStudyFinishDate = ""; // chapter별 공부 완료한 날짜 정보 저장 

// 항상 메인 페이지가 열리면 기존에 저장된 값을 불러오게 한다. 
window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('my_title').innerHTML = savePageTitle;  // 웹페이지 타이틀을 불러온다. 
    document.getElementById('header-version').textContent = CONFIG.version; // 최상단 제목 옆에 버전 표시
    if (defaultFontSize == 0) {
        changeFontSize(16); // 최초 실행시에 폰트가 0 이면 폰트 16px 사이즈로 실행
    }
    // 데이터 로딩은 speak_auth.js의 Auth 상태 변화 리스너(loadFromFirebase)가 담당합니다.
    updateStudyCountInfo(); // 최초 로딩시에 날짜별 완료수 표시하기 
    // requestScreenOn();  // 화면 켜짐 유지 요청하기 
});




// 초기화 하기 : 옵션 1,2,3에 따라 초기화 수행
async function initializeStudyData(value) {
    // 그룹 사이즈를 비동기 처리를 하여 값을 가져온 이후에 진행하도록 구현한다. 
    let initializeValue = value || await getInitializeValue();
    // 취소 버튼을 누르면 그룹 재조정을 수행하지 않고 종료함. 
    if (initializeValue !== "cancel") {
        // 1.전체 초기화 수행
        if(initializeValue == 1){
            // 현재 Book에 속한 모든 항목의 진행 상황을 초기화합니다.
            for (let i = 0; i < studyData.length; i++) {
                if (studyData[i].book_name === currBookName) {
                    studyData[i].finish = "no";
                    studyData[i].finish_date = "";
                    studyData[i].group = 1; 
                    studyData[i].test_count = 0;
                }
            }

            // 현재 Book의 첫 번째 항목으로 이동
            const firstIdx = studyData.findIndex(item => item.book_name === currBookName);
            currStudyDataNum = firstIdx !== -1 ? firstIdx : 0;
            currChapterName = studyData[currStudyDataNum].chapter_name;

            await checkChapter(); 
            myChapterListInfoMake(); 

                // [수정] 현재 Book의 모든 챕터 완료 날짜 정보(finishDates) 및 히스토리 초기화
                chapterStudyFinishDate = ""; 
                chapterList.forEach(chap => {
                    if (myChapterList && myChapterList[chap]) {
                        myChapterList[chap].finishDates = "";
                    }
                });

            await groupReassign(); 
            currGroupNum = 1; 
            loadValue(currStudyDataNum); 
            saveToFirebase(); 
            showPopup(`현재 Book의 모든 Chapter를 초기화했습니다.`);
        }
        // 2.현재 Chapter을 초기화하기(암기제외는 그대로 유지)
        if(initializeValue == 2){
            initializeChapter(currChapterName, 2);
            await groupReassign(); // 그룹을 재할당 한다. 
            currGroupNum = 1; // 그룹 번호를 1번으로 초기화
            countYesInChapter(currChapterName); // Chapter 단위 카운트
            findGroupMember(currGroupNum);
            saveToFirebase();
            loadValue(currStudyDataNum);  // 첫 그룹 첫번째 값을 로드 한다.
            // chapter 완료 메시지가 있는 경우에 이를 초기화 해준다. 
            document.getElementById('finishComment').innerHTML = "";
        }
        // 3.현재 Chapter을 초기화하기(암기제외도 초기화함)
        if(initializeValue == 3){
            initializeChapter(currChapterName, 3);
            await groupReassign(); // 그룹을 재할당 한다. 
            currGroupNum = 1; // 그룹 번호를 1번으로 초기화
            countYesInChapter(currChapterName); // Chapter 단위 카운트
            findGroupMember(currGroupNum);
            saveToFirebase();
            loadValue(currStudyDataNum);  // 첫 그룹 첫번째 값을 로드 한다.
            // chapter 완료 메시지가 있는 경우에 이를 초기화 해준다. 
            document.getElementById('finishComment').innerHTML = "";
        }
        // 4.현재 Chapter 전체를 하나의 북으로 합친다. 
        if(initializeValue == 4){
            await changeToOneChapter();
        }
        // 5.하나의 Chapter에서 원래의 Chapter으로 원위치 시킨다다. 
        if(initializeValue == 5){
            await changeToOriginalChapter(); 
        }

        // 6.현재 Group을 암기제외 유지하고 초기화한다. 
        if(initializeValue == 6){
            initializeGroup(currGroupNum);
        }
        // 7.전체 Group을 암기제외 유지하고 초기화한다. 
        if(initializeValue == 7){
            initializeAllGroup();
        }
    }
}

// 초기화를 수행할때 옵션 선택해서 초기화 수행한다.
// 1번 : 모든 파일내용 초기화
// 2번 : 현재 Chapter 초기화
// 3번 : 학습 DB Update
function getInitializeValue() {
    return new Promise((resolve) => {
        // 모달 HTML을 동적으로 생성
        const modalHtml = `
            <div id="customModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <p>초기화할 대상을 선택하세요</p>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="1"> 1. 현재 Book의 모든 Chapter 초기화</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="2" checked> 2. 현재 Chapter 초기화(암기제외 유지)</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="3"> 3. 현재 Chapter 초기화(암기제외도 초기화)</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="4"> 4. Chapter 전체를 하나의 Chapter로 합치기</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="5"> 5. 원래의 Chapter로 되돌리기</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="6"> 6. 현재 Group 초기화(암기제외 유지)</label><br>
                    <label><input style="margin-bottom: 12px" type="radio" name="value" value="7"> 7. 전체 Group 초기화(암기제외 유지)</label><br>
                    <br>
                    <div class="button-container" style="display: flex; justify-content: center; gap: 10px;">
                        <button id="modalConfirm" class="button4ea btn_color2">확인</button>
                        <button id="modalCancel" class="button4ea btn_color2">취소</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('customModal');
        const confirmButton = document.getElementById('modalConfirm');
        const cancelButton = document.getElementById('modalCancel');
        const radioButtons = modal.querySelectorAll('input[name="value"]');

        confirmButton.addEventListener('click', () => {
            let selectedValue = "cancel";
            radioButtons.forEach(radio => {
                if (radio.checked) {
                    selectedValue = parseInt(radio.value);
                }
            });
            modal.remove();
            resolve(selectedValue);
        });

        cancelButton.addEventListener('click', () => {
            modal.remove();
            resolve("cancel");
        });
    });
}


// 초기화를 수행할때 옵션 선택해서 초기화 수행한다.
// 1번 : 모든 파일내용 초기화
// 2번 : 현재 Chapter 초기화
// 3번 : 학습 DB Update
async function getInitializeValue2() {
    return new Promise(function (resolve, reject) {
        // var inputValue = document.getElementById("inputValue").value;
        // <label> 을 쓴 이유는 숫자를 터치해도 선택이 되도록 구현함. 
        var content = `
            <!DOCTYPE html>
            <html lang="kr">
            <head>
                <meta charset="UTF-8">
                <title>초기화 하기</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="Style.css" rel="stylesheet">
            </head>
            <body>
                <p>초기화할 대상을 선택하세요</p>
                <label><input style="margin-bottom: 12px" type="radio" id="10" name="value" value="1" >   1. 현재 Book의 모든 Chapter 초기화  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="11" name="value" value="2" checked>   2. 현재 Chapter 초기화(암기제외 유지)  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="12" name="value" value="3" >   3. 현재 Chapter 초기화(암기제외도 초기화)  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="12" name="value" value="4" >   4. Chapter 전체를 하나의 Chapter로 합치기  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="12" name="value" value="5" >   5. 원래의 Chapter로 되돌리기  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="12" name="value" value="6" >   6. 현재 Group 초기화(암기제외 유지)  </label><br>
                <label><input style="margin-bottom: 12px" type="radio" id="12" name="value" value="7" >   7. 전체 Group 초기화(암기제외 유지)  </label><br>
                <br><br>
                <button class="button4ea btn_color2" onclick="getValueAndClose()">확인</button>
                <button class="button4ea btn_color2" onclick="getValueCancel()">취소</button>
            </body>
            </html>
            `;
        var childWindow = window.open("", "초기화 선택", "width=device-width,height=300");
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
            let initializeValue1 = parseInt(selectedValueInChild);
            childWindow.close();
            resolve(initializeValue1);
        };

        childWindow.getValueCancel = function () {
            childWindow.close();
            resolve("cancel"); // 취소하면 "cancel" 리턴함. 
        };
    });

}

// 현재 chapter의 test_count, finish, finish_date 값을 추가하고 초기화함.
function initializeChapter(chapterName, initializeValue = 3) {
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].chapter_name === chapterName) {
            // initializeValue == 2 이면 암기제외한 것은 그대로 유지한다. 
            if (initializeValue == 2) {
                if(studyData[i].finish == 'yes'){
                    studyData[i].finish = 'no';
                    studyData[i].finish_date = '';
                    studyData[i].group = 1;
                }            
            } else if (initializeValue == 3){
                // initializeValue == 3이면 암기제외한 것도 모두 초기화 시킨다. 
                studyData[i].finish = 'no';
                studyData[i].finish_date = '';
                studyData[i].group = 1;
            }
        }
    }
    // chapter 초기화시에는 chapter정보에 학습 완료된 값을 0로 초기화 설정한다. 
    if (myChapterList && myChapterList[chapterName]) {
        myChapterList[chapterName].countYesInChapter = 0;
        // 기존 그룹 분할 히스토리를 삭제하고 1개 그룹(All)으로 강제 설정
        myChapterList[chapterName].groupDevideNum = 5000;
    }
}




// 초기화 버튼을 누르면 json 파일에서 studyData를 만들어 내는 동작을 수행 
async function loadJsonFromFile() {
    // 초기화시에 기본 설정값을 초기화 한다. 
    koreaPlay = false;
    composeMode = false;
    showScriptMode = true; // 초기값에 항상 script가 보이도록 설정함. 
    showScriptModeKor = true;
    mp3PlayMode = true; 
    foreignFirst = false; 
    forNoSoundLength = 1.0;
    defaultFontSize = 16;
    script_foreign_Font = defaultFontSize; 
    defaultDevideNum = 8;
    defaultPlayCount = 1;
    studyDataVersion = studyFileName;

    // local 저장소의 json 파일 읽어와서 object 파일로 만들기.
    const data = await fetch(studyFileName);
    // JSON으로 해석
    const obj = await data.json();
    studyData = JSON.parse(JSON.stringify(obj, null, ' '));
    // json 파일에서 language 정보를 가져온다. 
    if (studyData.length > 0 && studyData[0].language) {
        studyLang = studyData[0].language;
    }

    // 신규 데이터 로드 시 포인터를 첫 번째 항목으로 설정
    currStudyDataNum = 0;
    currBookName = studyData[0].book_name;
    currChapterName = studyData[0].chapter_name; // chapter_name 기준으로 저장

    updateBasicStudyData() // studyData에 필요한 4개 파라미터값 초기화 생성
    await checkChapter(); 
    myChapterListInfoMake(); // chapter List의 각종 저장 정보를 위한 object를 만든다. 
    myChapterInfoMake(); // chapter의 기본 정보 저장을 위한 object를 만든다.
    initializeChapter(currChapterName, 3); // [Fix] 챕터명 누락 수정
    
    yesCountInChapter = 0; // 전체 암기 완료 개수를 0으로 설정함. 
    yesNoCountInChapter = countYesNoInChapter(currChapterName); // Chapter 내 암기 대상 수
    await groupReassign();  // 초기화시에 그룹 재조정 실시
    currGroupNum = 1; // 초기화시 현재 그룹넘버는 1로 설정 
    totalGroupCount = myChapterList[currChapterName].totalGroupCount;  // 현재 Chapter의 그룹 수 세기
    findGroupMember(currGroupNum); // 현재 Chapter의 해당 그룹 멤버를 찾아옴. 
    loadValue(currStudyDataNum); // 처음 값을 불러와서 화면에 표시하기  
    saveToFirebase(); // 현재 값을 Firebase에 저장함 
    updateProgress(0); // Initialize the progress bar
    document.getElementById('study_date').innerHTML = ""; // 초기 로딩시 date 값 삭제
    document.getElementById('finishComment').innerHTML = ""; // 초기 로딩시 과거 정보 삭제
    if (defaultFontSize == 0) {
        changeFontSize(16); // 최초 실행시에는 폰트 16px 사이즈로 실행
    } else {
        changeFontSize(defaultFontSize); // 최초 실행시에는 폰트 16px 사이즈로 실행
    }
}

// 해당 chapter의 첫번째 num 알아내기  
function findFirstNumInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].chapter_name == chapterName) {
            count = i;
            break;
        }
    }
    return count;
}

// 최초 초기화시에 studyData에 필요한 4개 파라미터값 추가함.
function updateBasicStudyData(){
    for (let i = 0; i < studyData.length; i++) {
        studyData[i].finish = "no";
        studyData[i].finish_date = "";
        studyData[i].group = 1; // 최초에는 그룹 1로 모두 설정한다.
        studyData[i].test_count = 0;
        studyData[i].chapter_orig = studyData[i].chapter; // 원래의 기본 chapter 정보를 보관한다. 향후 원복을 위해서. 
    }
}

// 현재 변경된 상태를 반영하여 화면에 정보를 다시 표시해 준다. 
function loadValue(currStudyDataNum) {
    const item = studyData ? studyData[currStudyDataNum] : null;
    if (!item) {
        if (currChapterName && countNoInChapter(currChapterName) === 0) finishAllComment();
        else if (currChapterName) finishGroupComment();
        return;
    }

    // 상단 타이틀 구성 (2줄 구조)
    const bookName = item.book || "No Book";
    const chapterName = item.chapter_name || "No Chapter";
    
    // [보완] 현재 학습 중인 Book과 언어 정보를 전역 변수에 동기화
    currBookName = item.book_name || ""; 
    studyLang = item.language || "english";
    currChapterName = chapterName; // 현재 챕터명 업데이트 (chapter_name 사용)

    let displayTitle = `<div><span class="mychaptercolor" onclick="changeBook()">${bookName}</span> - <span class="mychaptercolor" onclick="changeChapter()">${chapterName}</span></div>`;
    
    document.getElementById('study_title').innerHTML = displayTitle;

    // [수정] totalGroupCount가 null, 0, NaN인 경우 현재 데이터에서 다시 계산하여 복구합니다.
    if (!totalGroupCount || isNaN(totalGroupCount) || totalGroupCount == 0) {
        if (myChapterList[currChapterName] && myChapterList[currChapterName].totalGroupCount > 0) {
            totalGroupCount = myChapterList[currChapterName].totalGroupCount;
        } else {
            // myChapterList에도 정보가 없다면 studyData에서 직접 최대 그룹 번호를 찾습니다.
            let maxGroupFound = 0;
            for (let i = 0; i < studyData.length; i++) {
                if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName) {
                    let g = parseInt(studyData[i].group);
                    if (!isNaN(g) && g > maxGroupFound) maxGroupFound = g;
                }
            }
            totalGroupCount = maxGroupFound;
        }
    }

    // 그룹 표시 : 삭제는 제외하고 표출한다. 
    if(currGroupMemberArr.length === 0){
        document.getElementById('group').innerHTML = "GroupNo : "
        + currGroupNum + "/" + totalGroupCount
        + " (멤버수 : " + "0" + "/" + countYesNoInGroup(currChapterName, currGroupNum) + ")";
    }else{
        document.getElementById('group').innerHTML = "GroupNo : "
        + currGroupNum + "/" + totalGroupCount
        + " (멤버수 : " + noCountInGroup + "/" + countYesNoInGroup(currChapterName, currGroupNum) + ")";
    }

    let chapterInfo = studyData[currStudyDataNum].chapter ? " (chapter : " + studyData[currStudyDataNum].chapter + ")" : "";
    document.getElementById('num').innerHTML = "No : " + studyData[currStudyDataNum].num + chapterInfo;
    updateTestCount(); // num: 정보와 Test, Chapter 정보 표시, Test Count 실시간 업데이트

    document.getElementById('studyState').innerHTML = "Total/Delete/Finish/Left : "
        + countAllInChapter(currChapterName) + "/"
        + countDeleteInChapter(currChapterName) + "/"
        + countYesInChapter(currChapterName) + "/"
        + countNoInChapter(currChapterName) + " ➤ "
        + ((countDeleteInChapter(currChapterName) / countAllInChapter(currChapterName)) * 100).toFixed(1) + "%";
    //myAudio.src = "/mp3/" + studyData[currStudyDataNum].mp3b;
    isScriptShow = true; // 자막이 켜지고, 꺼지게 설정하는 값
    if(studyLang != "song"){  // 노래모드가 아니면 
        showScriptOff();  // script를 보이지 않게 함. 
    }else{
        showScriptOn(); // 노래모드이면 script를 항상 보여줌
    }
    if(studyLang == "korea"){  // 한국어 모드이면 
        showKorScriptToggle();  // 한국어 보이게 함. 
    }
    if(showScriptMode == true){
        showScriptOn();
    }else{
        showScriptOff();
    }
    // AI번역된 내용을 지운다. 
    document.getElementById('script_korean_llm').innerHTML = "";
    // 마지막 Group인 경우에는 나머지 값으로 progress 처리 해야 함
    if (studyData[currStudyDataNum].group == totalGroupCount) {
    } else {
        updateProgress(((groupDevideNum - noCountInGroup) / groupDevideNum) * 100);
    }
    showCurrStudyBar(currStudyDataNum);  // 현재 공부하는 순서를 사각 바에 표출
    // checkChapter();
    showChapterStatus(); // 현재 공부하는 Chapter 현황을 제일 하단에 보여줌. 
    // requestScreenOn();  // 화면 켜짐 유지 요청하기
}

// mp3B play Count 표시 Update 함수
function updateTestCount(){
    document.getElementById('mp3b').innerHTML = "mp3 : "
        + studyData[currStudyDataNum].mp3_foreign + " (Test Count : " + studyData[currStudyDataNum].test_count + ")";
}

// 한국어 자막을 보이기/안보이기 토글 처리 + 한국어 play(옵션에 따라)
let isKorScriptShow = false; // 자막이 켜지고, 꺼지게 설정하는 값
function showKorScriptOnAndPlay() {
    if (isKorScriptShow == false) {
        // 한국어가 있으면 보여 주도록 처리함. 
        if (studyData[currStudyDataNum].script_korean) {
            document.getElementById('script_korean').innerHTML = studyData[currStudyDataNum].script_korean;
            isKorScriptShow = true;
            // 한국어를 play 한다. 
            if (koreaPlay == true) {
                playMp3A();
            }
        }
    } else {
        document.getElementById('script_korean').innerHTML = "";
        isKorScriptShow = false;
    }
}

// 한국어 자막을 보이기/안보이기 토글 처리 
function showKorScriptToggle() {
    if (isKorScriptShow == false) {
        // 한국어가 있으면 보여 주도록 처리함. 
        if (studyData[currStudyDataNum].script_korean) {
            document.getElementById('script_korean').innerHTML = studyData[currStudyDataNum].script_korean;
            isKorScriptShow = true;
        }
    } else {
        document.getElementById('script_korean').innerHTML = "";
        isKorScriptShow = false;
    }

}

// 한국어 자막을 보이기 처리 
function showKorScriptOn() {
    // 한국어가 있으면 보여 주도록 처리함. 
    if (studyData[currStudyDataNum].script_korean) {
        document.getElementById('script_korean').innerHTML = studyData[currStudyDataNum].script_korean;
    }
}

// 한국어 자막을 안보이기 처리 
function showKorScriptOff() {
        document.getElementById('script_korean').innerHTML = "";
        isKorScriptShow = false;
}


// "자막" 버튼 클릭시 동작 : 자막 보이기/안보이기 토글 처리
let isScriptShow = false; // 자막이 켜지고, 꺼진 상태롤 설정하는 값
function showScript() {
    // 지금 스트립트가 안보이면 보이게 하고
    if (isScriptShow == false) {
        showScriptOn();
    } else { 
        showScriptOff();
    }
}
// 자막을 보이면서 외국어 play 하기 
function showScriptOnAndPlayMp3B() {
    showScriptOn();
    playMp3B();
}

// 한국어, 외국어 자막을 모두 보이게 한다. 
function showScriptOn() {
    // 한국어 자막 보이기
    if (isKorScriptShow == false) {
        showKorScriptToggle();
    }
    // 외국어 자막 보이기 
    document.getElementById('script_foreign').innerHTML = studyData[currStudyDataNum].script_foreign;

    // [수정] studyLang 조건에 상관없이 사용자가 조정한 외국어 폰트 사이즈(script_foreign_Font)를 적용함
    if (script_foreign_Font) {
        document.getElementById('script_foreign').style.fontSize = script_foreign_Font + "px";
    }

    // 발음이 있으면 발음 추가함. 
    if (studyData[currStudyDataNum].pronounce) {
        document.getElementById('pronounce').innerHTML = studyData[currStudyDataNum].pronounce;
    }
    // 언어가 영어나 한자이면 단어 터치시 네이버 사전으로 연동하도록 구현. 
    if (studyLang == 'english' || studyLang == 'spanish' || studyLang == 'hanja' || studyLang == 'chapter') {
        showDictionaryWord(studyData[currStudyDataNum].script_foreign);
    }
    // 언어가 일어나 중국어이면 단어 터치시 네이버 일어,중국어 사전으로 연동
    if (studyLang == 'japanese' || studyLang == 'chinese') {
        // pronounce에 값이 있을때만 적용함. 
        if (studyData[currStudyDataNum].pronounce != null) {
            showDictionaryWord(studyData[currStudyDataNum].pronounce);
        }
    }
    // 한자인 경우에 폰트 사이즈를 일반(16px)보다 20포인트 크게 함. 
    if (studyLang == 'hanja') {
        let hanjaFontSize = defaultFontSize + 20;
        let hanjaFont = hanjaFontSize + "px";
        document.getElementById('script_korean').style.fontSize = hanjaFont;
        // document.getElementById('script_korean').style.fontSize = "30px";
        document.getElementById('script_korean').style.fontWeight = "normal";
        document.getElementById('script_foreign').style.fontSize = hanjaFont;
        document.getElementById('script_foreign').style.fontWeight = "normal";
        document.getElementById('script_foreign').style.color = "red";
    }
    // 설명이 있으면 설명 추가함. 
    if (studyData[currStudyDataNum].explain) {
        document.getElementById('explain').innerHTML = studyData[currStudyDataNum].explain;
    }
    // AI번역기를 선택하면 폰트 조절 버튼, 번역기 버튼이 자막 하단에 나타나게 함. 
    if (studyLang == 'chapter'){
        document.getElementById("show-audio-controller").style.display = "block";
    } else{
        document.getElementById("show-audio-controller").style.display = "none";
    }

    // 이미지가 있으면 보여라.
    if (studyData[currStudyDataNum].image) {
        let src = "/image/" + studyData[currStudyDataNum].image;
        showImage(src);
    }
    isScriptShow = true;
}
// 자막을 안보이게 설정하기 
function showScriptOff() {
    if (isKorScriptShow == true) {
        showKorScriptToggle();
    }
    document.getElementById('script_korean').innerHTML = "";
    document.getElementById('script_foreign').innerHTML = "";
    document.getElementById('pronounce').innerHTML = "";
    document.getElementById('explain').innerHTML = "";
    hideImage();
    // Chapter 모드가 아니면 오디오 컨트롤러 숨김
    if (studyLang != 'chapter'){
        document.getElementById("show-audio-controller").style.display = "none";
    }
    isScriptShow = false;
}

// chapter인경우 자막 크기를 조정하는 버튼이 자막 하단에 표시됨
function chapterFontPlus(){ // 자막 크기 확대
    //font_p_font_script++;
    //document.documentElement.style.setProperty('--font_p_font_script', font_p_font_script + 'px');
    script_foreign_Font++;
    saveToFirebase();
    document.getElementById('script_foreign').style.fontSize = script_foreign_Font + "px";
}
function chapterFontMinus(){ // // 자막 크기 축소
    // font_p_font_script--;
    // document.documentElement.style.setProperty('--font_p_font_script', font_p_font_script + 'px');
    script_foreign_Font--;
    saveToFirebase();
    document.getElementById('script_foreign').style.fontSize = script_foreign_Font + "px";
}

// Chapter에서 파파고 번역버튼 누르면 별도 웹페이지 실행
function transPapago(){
    var encodedText = encodeURIComponent(studyData[currStudyDataNum].script_foreign);
    window.open("https://papago.naver.com/?sk=en&tk=ko&st=" + encodedText, "_blank");
    //window.location.href = "https://papago.naver.com/?sk=en&tk=ko&st=" + encodedText;
}
// Chapter에서 구글 번역버튼 누르면 별도 웹페이지 실행
function transGoogle(){
    var encodedText = encodeURIComponent(studyData[currStudyDataNum].script_foreign);
    window.open("https://translate.google.co.kr/?hl=en&sl=en&tl=ko&text=" + encodedText, "_blank");
    //window.location.href = "https://papago.naver.com/?sk=en&tk=ko&st=" + encodedText;
}
// 클립보드로 script_foreign 를 복사함 => 챗gpt에 써 넣기 위함. 
function copyClipboard(){
    let textScript = document.getElementById('script_foreign').innerText;
    textScript = "아래 문장을 한글로 해석해 주세요\n" + textScript;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textScript).then(() => {
          console.log('Text copied to clipboard');
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
    }
}

// 현재 그룹에서 공부하고 있는 대상을 bar에서 위치를 표시해주는 기능  
function showCurrStudyBar(number) {
    //const currentArray = currGroupMemberArr;
    // const selectedValue = 3;
    let orderInGroup = number;
    const arrayBar = document.getElementById('arrayBar');
    arrayBar.innerHTML = "";

    // 해당 number가 그룹내에서 몇번째인지 찾아서 표출해 줌
    for (let i = 0; i < currGroupMemberArr.length; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');

        if (currGroupMemberArr[i] === orderInGroup) {
            cell.classList.add('selected');
        }
        arrayBar.appendChild(cell);
    }
}


// 완료버튼 짧게 또는는 길게 누름에 따라서 다르게 처리하기 구현
// 버튼 요소 선택
const btnFinish = document.getElementById('btn_finish');

// 롱 클릭을 위한 타이머 변수
let pressTimer;

// 클릭 시작 시간을 저장할 변수
let startTime;

// 일반 클릭과 롱 클릭을 구분하기 위한 시간 (밀리초)
const longPressDuration = 500;

// 공통 함수: 롱 클릭 타이머 시작
function startPressTimer() {
    startTime = new Date().getTime();
    pressTimer = window.setTimeout(function() {
        if(currGroupMemberArr.length > 0){
            changeToYesAllInGroup(); // 그룹의 모든 no 값을 yes로 변경하기 
        }        
    }, longPressDuration);
}

// 공통 함수: 롱 클릭 타이머 초기화 및 일반 클릭 처리
async function stopPressTimer() {
    clearTimeout(pressTimer);
    const endTime = new Date().getTime();
    const pressDuration = endTime - startTime;

    // 클릭 지속 시간이 longPressDuration보다 짧으면 일반 클릭으로 간주
    if (pressDuration < longPressDuration) {
        if (currGroupMemberArr.length > 0) {
            await changeToYes();
        } else {
            showPopup("이미 모두 완료 처리되었습니다. 초기화 후에 사용하세요.");
            return;
        }
    }
}

// 마우스 이벤트 리스너 추가
btnFinish.addEventListener('mousedown', function() {
    startPressTimer();
});

btnFinish.addEventListener('mouseup', function() {
    stopPressTimer();
});

// 마우스가 버튼 밖으로 나갔을 때 타이머 초기화
btnFinish.addEventListener('mouseout', function() {
    clearTimeout(pressTimer);
});

// 터치 이벤트 리스너 추가
btnFinish.addEventListener('touchstart', function(e) {
    e.preventDefault(); // 터치 스크롤 방지
    startPressTimer();
});

btnFinish.addEventListener('touchend', function() {
    stopPressTimer();
});

btnFinish.addEventListener('touchcancel', function() {
    clearTimeout(pressTimer);
});

// "완료" 버튼 롱 클릭 시 실행될 함수
// 현재의 그룹에 대해서 모두 완료 처리를 한다. 
async function changeToYesAllInGroup() {
    // 모두 암기 완료된 상태이면 comment만 나오게 하고 종료한다. 
    let count = 0;
    if(currGroupMemberArr.length === 0){
        showPopup("암기 대상이 없습니다. 초기화 후에 사용해 주세요.");
        return;
    }
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].chapter == currChapterName && studyData[i].group == currGroupNum &&(studyData[i].finish == 'no')) {
            currStudyDataNum = i;
            loadValue(currStudyDataNum);
            await changeToYes();
            count++;
        }
    }
    showPopup(`총 ${count}개가 모두 완료 처리되었습니다.`);
}

// 암기 완료 처리 : finish 값을 no에서 yes로 변경하고, 현재 배열에서 값을 삭제함.  
async function changeToYes() {   
    // 모두 암기 완료된 상태이면 comment만 나오게 하고 종료한다. 
    if(currGroupMemberArr.length === 0){
        showPopup("암기 대상이 없습니다. 초기화 후에 사용해 주세요.");
        return;
    }
    // 대상 개개수가 1개 이상이면 완료/삭제 처리하고 다시 재실행 되도록 함. 
    if (currGroupMemberArr.length > 1) {
        // "PLAY R" 상태에서 완료 버튼 누르면 종료하고 재실행하도록 함. 
        if (btnPlayRepeat.textContent == "STOP") {
            await togglePlayStop();
            await changeStatusToYes();
            await sleepMiliSecond(500);
            await togglePlayStop();
        // "PLAY A" 상태에서 완료 버튼 누르면 종료하고 재실행하도록 함.
        }else if(btnPlayAll.textContent == "STOP"){         
            await toggleAllStop();
            await changeStatusToYes();
            await sleepMiliSecond(500);
            await toggleAllPlay();
        }else{
            await changeStatusToYes();
        }
    } else { // 마지막 1개 남은 경우 각 case별 완료 처리
        // "PLAY R" 상태에서 완료 버튼 누르면 종료함.
        if (btnPlayRepeat.textContent == "STOP") {
            await togglePlayStop();
            await changeStatusToYes();
            btnPlayRepeat.textContent = "PLAY R";
        // "PLAY A" 상태에서 완료 버튼 누르면 종료함. 
        }else if(btnPlayAll.textContent == "STOP"){         
            await toggleAllStop();
            await changeStatusToYes();
            btnPlayAll.textContent = "PLAY A";
        }else{
            await changeStatusToYes();
        }
    }   
    
    // 모두 암기 완료, 삭제가 되었을때 처리 로직
    if(countAllInChapter(currChapterName) == countDeleteInChapter(currChapterName)){ // 모두 delete가 되면
        deleteAllComment(); // 모두 삭제 처리가 되면
    } else if (countNoInChapter(currChapterName) == 0){
        finishAllComment(); // 모두 완료 처리가 되면
    }
}


// 암기 삭제 처리 : finish 값을 no에서 finsh로 변경하고, 현재 배열에서 값을 삭제함.  
async function changeToDelete() {   
    // 모두 암기 완료된 상태이면 comment만 나오게 하고 종료한다. 
    if(currGroupMemberArr.length === 0){
        showPopup("암기 대상이 없습니다. 초기화 후에 사용해 주세요.");
        return;
    }
    // "PLAY R" 상태에서 완료 버튼 누르면 종료하고 재실행하도록 함. 
    if (btnPlayRepeat.textContent == "STOP") {
        await togglePlayStop();
        await changeStatusToDelete();
        await sleepMiliSecond(500);
        await togglePlayStop();
    // "PLAY A" 상태에서 완료 버튼 누르면 종료하고 재실행하도록 함.
    }else if(btnPlayAll.textContent == "STOP"){         
        await toggleAllStop();
        await changeStatusToDelete();
        await sleepMiliSecond(600);  // 약간의 처리 간격을 주기 위함
        await toggleAllPlay();
    }else{
        await changeStatusToDelete();
    }
    
    // 모두 암기 완료, 삭제가 되었을때 처리 로직
    if(countAllInChapter(currChapterName) == countDeleteInChapter(currChapterName)){ // 모두 delete가 되면
        deleteAllComment(); // 모두 삭제 처리가 되면
    } else if (countNoInChapter(currChapterName) == 0){
        finishAllComment(); // 모두 완료 처리가 되면
    }
}

// 완료처리를 하고, 완료한 날짜를 입력함. 현재값을 다음 값으로 변경함 
async function changeStatusToYes() {
    if(currGroupMemberArr.length === 0){
        showPopup("이미 모두 암기 완료된 그룹입니다. 초기화 후에 이용해 주세요.");
        return;
    }
    let today = new Date();
    // 월(0 ~ 11)이므로 1을 더해줘야함.  slice 를 이용해서 2자리 포맷. 1월 ==> 01
    let month = ("0" + (today.getMonth() + 1)).slice(-2);
    let date = ("0" + today.getDate()).slice(-2);  // 날짜를 두자리수로 표시
    // 날짜 테스트용 랜덤 함수 발생
    //let date = ("0" + (Math.floor(Math.random() * 20) + 1)).slice(-2);  // 랜덤함수 1 ~ 3 까지 정수 추출
    let finish_date = month + '-' + date;  // 암기 완료 날짜 적용하기 위함

    let currentPos = currGroupMemberArr.indexOf(currStudyDataNum);

    // finish를 yes로 변경함
    studyData[currStudyDataNum].finish = "yes";
    studyData[currStudyDataNum].finish_date = finish_date; // 암기완료 날짜 저장
    // yesCountInChapter = yesCountInChapter + 1;  // 전체 완료값에 1을 더함. 
    updateStudyCountInfo('finish'); // 날짜별로 삭제한 개수 정보를 update 한다. 

    if (currentPos == currGroupMemberArr.length - 1) {
        currGroupMemberArr.pop();  // 마지막값 삭제
        noCountInGroup = currGroupMemberArr.length;  // 그룹의 숫자 다시 파악
        if(noCountInGroup == 0){ // 모두 암기완료한 상태이면면
            showPopup("축하합니다. 현재 그룹을 모두 암기 완료하였습니다. 초기화 후에 이용해 주세요.")
        }else{
            currStudyDataNum = currGroupMemberArr[0];  // 시작 숫자는 그룹의 처음값으로 함. 
        }
    } else {
        currGroupMemberArr.splice(currentPos, 1);  // 중간 값 삭제함. 
        noCountInGroup = currGroupMemberArr.length;  // 그룹의 숫자 다시 파악
        currStudyDataNum = currGroupMemberArr[currentPos];  // 이전 값이 있던 자리의 값을 가져와서 현재값에 할당함. 
    }
    saveToFirebase();  // 현재 값을 Firebase에 저장하기 
    loadValue(currStudyDataNum);  // 값을 변경하고 현재 값을 한번더 불러옴.
    findDateStudyState();  // 일자별 공부 현황 Load 하기 
}

// 삭제 처리를 하고, 완료한 날짜를 입력함. 현재값을 다음 값으로 변경함 
async function changeStatusToDelete() {
    if(currGroupMemberArr.length === 0){
        showPopup("이미 모두 암기 완료된 그룹입니다. 초기화 후에 이용해 주세요.");
        return;
    }
    let today = new Date();
    // 월(0 ~ 11)이므로 1을 더해줘야함.  slice 를 이용해서 2자리 포맷. 1월 ==> 01
    let month = ("0" + (today.getMonth() + 1)).slice(-2);
    let date = ("0" + today.getDate()).slice(-2);  // 날짜를 두자리수로 표시
    // 날짜 테스트용 랜덤 함수 발생
    //let date = ("0" + (Math.floor(Math.random() * 20) + 1)).slice(-2);  // 랜덤함수 1 ~ 3 까지 정수 추출
    let finish_date = month + '-' + date;  // 암기 완료 날짜 적용하기 위함

    let currentPos = currGroupMemberArr.indexOf(currStudyDataNum);

    // finish를 delete로 변경함
    studyData[currStudyDataNum].finish = "delete";
    studyData[currStudyDataNum].finish_date = finish_date; // 암기완료 날짜 저장
    // yesCountInChapter = yesCountInChapter + 1;  // 전체 완료값에 1을 더함. 
    updateStudyCountInfo('finish'); // 날짜별로 삭제한 개수 정보를 update 한다. 

    // 현재값이 배열의 마지막 값이면, pop으로 삭제하고, 처음값으로 설정한다.
    if (currentPos == currGroupMemberArr.length - 1) {
        currGroupMemberArr.pop();  // 마지막값 삭제
        noCountInGroup = currGroupMemberArr.length;  // 그룹의 숫자 다시 파악
        if(noCountInGroup == 0){ // 모두 암기완료한 상태이면
            showPopup("축하합니다. 현재 그룹을 모두 암기 완료하였습니다. 초기화 후에 이용해 주세요.")
        }else{
            currStudyDataNum = currGroupMemberArr[0];  // 시작 숫자는 그룹의 처음값으로 함. 
        }

    } else {
        currGroupMemberArr.splice(currentPos, 1);  // 중간 값 삭제함. 
        noCountInGroup = currGroupMemberArr.length;  // 그룹의 숫자 다시 파악
        currStudyDataNum = currGroupMemberArr[currentPos];  // 이전 값이 있던 자리의 값을 가져와서 현재값에 할당함. 
    }

    saveToFirebase();  // 현재 값을 Firebase에 저장하기 
    loadValue(currStudyDataNum);  // 값을 변경하고 현재 값을 한번더 불러옴.
    findDateStudyState();  // 일자별 공부 현황 Load 하기 
}


// 현재 chapter에 대해서 날짜별로 공부 완료한 일자를 하단에 보여줌. 
// 여러번 완료한 경우 각각의 날짜를 모두 중복으로 넣어서 보여줌. 
function findDateStudyState() {
    let studyDateArr = []; // finish 날짜를 중복으로 넣을 배열
    let result = {}; // finish 날짜를 중복 제거하여 넣을 오브젝트 선언
    // finish_date 날짜가 들어간 배열을 만든다. 
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == currChapterName && studyData[i].finish_date != '') {
            studyDateArr.push(studyData[i].finish_date);
        }
    }
    studyDateArr.sort(); // 날짜를 순차적인 정렬로 변경
    studyDateArr.reverse(); // sort()한 값을 뒤집으면 최신순으로 정렬됨.  
    // Map을 이용한 오브젝트 카운트 세기 :  https://hianna.tistory.com/459
    result = studyDateArr.reduce((accu, curr) => {
        accu.set(curr, (accu.get(curr) || 0) + 1);
        return accu;
    }, new Map());

}

// 현재 chapter을 모두 암기 완료를 하였을때 처리하는 함수 
function finishAllComment() {
    document.getElementById('group').innerHTML = "";
    document.getElementById('num').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "";
    document.getElementById('studyState').innerHTML = "";

    updateProgress(100);
    updateFinishDateInChapter(); // 모두 완료한 날짜를 기록하기
    showChapterStatus(); // 현재 공부하는 Chapter 현황을 제일 하단에 보여줌.
    
    let finishMessage = `"축하합니다. 당신은 ${currChapterName} Chapter에서 총 ${countAllInChapter(currChapterName)}개 중 ${countDeleteInChapter(currChapterName)}개를 삭제 완료하고,  ${countYesInChapter(currChapterName)}개의 단어(문장)을 모두 암기 했습니다."`;
    document.getElementById('script_korean').innerHTML = finishMessage;

    //totalGroupCount = 0; // 모두 완료한 경우에 0으로 설정함
    countYesInChapter(currChapterName) // 현재 챕터의 finish 횟수 다시 세기. 
    saveToFirebase();
}

// 현재 그룹의 학습을 완료했을 때 표시하는 함수
function finishGroupComment() {
    document.getElementById('group').innerHTML = "GroupNo : " + currGroupNum + "/" + totalGroupCount + " (학습 완료)";
    document.getElementById('num').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "";
    document.getElementById('studyState').innerHTML = "현재 그룹의 모든 문장을 암기했습니다.";
    document.getElementById('script_korean').innerHTML = `<span style="color:blue; font-weight:bold;">[Group ${currGroupNum} 완료]</span><br>현재 그룹의 학습이 끝났습니다. 다른 그룹으로 이동하거나 그룹을 재조정하세요.`;
    document.getElementById('script_foreign').innerHTML = "";
    document.getElementById('pronounce').innerHTML = "";
    document.getElementById('explain').innerHTML = "";
    document.getElementById('script_korean_llm').innerHTML = "";
    updateProgress(100);
    showCurrStudyBar(-1); // 바 초기화
}

// 현재 chapter을 모두 암기 삭제 완료를 하였을때 처리하는 함수 
function deleteAllComment() {
    document.getElementById('group').innerHTML = "";
    document.getElementById('num').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "";
    document.getElementById('studyState').innerHTML = "";

    updateProgress(100);
    updateFinishDateInChapter(); // 모두 완료 또는 삭제한 날짜를 기록하기
    showChapterStatus(); // 현재 공부하는 Chapter 현황을 제일 하단에 보여줌.
    
    let finishMessage = `"${currChapterName}" Chapter의 총 ${countAllInChapter(currChapterName)} 개의 단어(문장)을 모두 삭제 완료 했습니다. 초기화 후 이용해 주세요.`;
    document.getElementById('script_korean').innerHTML = finishMessage;

    //totalGroupCount = 0; // 모두 완료한 경우에 0으로 설정함
    countYesInChapter(currChapterName) // 현재 챕터의 finish 횟수 다시 세기. 
    saveToFirebase();
}

// 북을 완료한 경우에 완료한 날짜를 계속 업데이트하여 몇회 완료하였는지 체크 가능하도록 함. 
function updateFinishDateInChapter(){
    let today = new Date();
    let month = today.getMonth() + 1; // 월(0 ~ 11)이므로 1을 더해줘야함.
    let date = today.getDate(); 
    let finish_date = month + '-' + date;  // 암기 완료 날짜 적용하기 위함

    if(chapterStudyFinishDate == ""){
        chapterStudyFinishDate = finish_date;
    } else {
        chapterStudyFinishDate = chapterStudyFinishDate + "," + finish_date;
    }
    // chapter별 스토리지에 저장함. 
    saveToFirebase()
}

// Firebase에 각종 학습 데이터 및 변수 저장
function saveToFirebase() {
    if (!studyData) return;

    const user = firebase.auth().currentUser;
    
    myChapterInfo.currChapterName = currChapterName;
    myChapterInfo.currBookName = currBookName; // Book 정보 저장

    myChapterInfo.currStudyUid = (studyData && studyData[currStudyDataNum]) ? studyData[currStudyDataNum].uid : null;
    myChapterInfo.currStudyDataNum = currStudyDataNum || 0; 

    if (!myChapterInfo.lastStudyNumPerBook) myChapterInfo.lastStudyNumPerBook = {};
    const currentItem = (studyData && studyData[currStudyDataNum]) ? studyData[currStudyDataNum] : null;
    if (currentItem) {
        myChapterInfo.lastStudyNumPerBook[currentItem.book_name || "DefaultBook"] = currentItem.uid;
    }

    myChapterInfo.koreaPlay = koreaPlay;
    myChapterInfo.composeMode = composeMode;
    myChapterInfo.showScriptMode = showScriptMode;
    myChapterInfo.showScriptModeKor = (showScriptModeKor !== undefined) ? showScriptModeKor : true;
    myChapterInfo.mp3PlayMode = mp3PlayMode;
    myChapterInfo.foreignFirst = foreignFirst;
    myChapterInfo.forNoSoundLength = forNoSoundLength;

    myChapterInfo.defaultFontSize = defaultFontSize || 16;
    myChapterInfo.defaultDevideNum = defaultDevideNum;
    myChapterInfo.script_foreign_Font = script_foreign_Font || myChapterInfo.defaultFontSize; 
    myChapterInfo.defaultPlayCount = defaultPlayCount;
    myChapterInfo.studyDataVersion = studyFileName;

    if (currChapterName && myChapterList[currChapterName]) {
        myChapterList[currChapterName].yesNoCountInChapter = yesNoCountInChapter;

        myChapterList[currChapterName].finishDates = chapterStudyFinishDate;
        myChapterList[currChapterName].groupDevideNum = groupDevideNum;
        myChapterList[currChapterName].lastGroupMemberCount = lastGroupMemberCount;
        myChapterList[currChapterName].totalGroupCount = totalGroupCount;  // 실시간 함수 사용으로 미저장
    }

    if (user) {
        const db = firebase.database();
        const basePath = `users/${user.uid}/${studySaveName}`;
        
        // 성능을 위해 한 번에 업데이트
        db.ref(basePath).update({
            studyData: studyData,
            myChapterInfo: myChapterInfo,
            // myChapterList는 Book별로 별도 경로에 저장
            [`books/${currBookName || 'Default'}/myChapterList`]: myChapterList
        }).catch(err => console.error("Firebase Save Error:", err));
    }
}

// Firebase에서 불러오기 
async function loadFromFirebase() {
    const user = firebase.auth().currentUser;
    if (!user) {
        // 로그인하지 않은 경우 기본 JSON 데이터만 로드
        const data = await fetch(studyFileName);
        studyData = await data.json();
        initializeStudyData(1);
        return;
    }

    let remoteData = null;
    const snapshot = await firebase.database().ref(`users/${user.uid}/${studySaveName}`).once('value');
    remoteData = snapshot.val();

    if (!remoteData || !remoteData.myChapterInfo) {
        // DB에 저장된 정보가 없으면 초기화
        await loadJsonFromFile();
        return;
    }

    myChapterInfo = remoteData.myChapterInfo;
    
    currChapterName = myChapterInfo.currChapterName;
    currBookName = myChapterInfo.currBookName; // 저장된 북 ID 복원
    // 기본 인덱스 로드 (UID 매칭 실패 시 대비)
    let savedIndex = myChapterInfo.currStudyDataNum;
    defaultFontSize = myChapterInfo.defaultFontSize;
    defaultDevideNum = myChapterInfo.defaultDevideNum;
    script_foreign_Font = myChapterInfo.script_foreign_Font || (defaultFontSize + 4); // 저장된 값이 없으면 기본 오프셋 적용
    defaultPlayCount = myChapterInfo.defaultPlayCount;
    koreaPlay = myChapterInfo.koreaPlay;
    composeMode = myChapterInfo.composeMode;
    showScriptMode = myChapterInfo.showScriptMode;
    showScriptModeKor = myChapterInfo.showScriptModeKor;
    mp3PlayMode = myChapterInfo.mp3PlayMode;
    foreignFirst = myChapterInfo.foreignFirst;
    forNoSoundLength = myChapterInfo.forNoSoundLength;
    studyDataVersion = myChapterInfo.studyDataVersion;

    // Study Data 가져오기 (Base data fetch + progress data merge)
    const baseDataResponse = await fetch(studyFileName);
    const baseData = await baseDataResponse.json();

    const progressData = remoteData.studyData || [];

    studyData = baseData.map(baseItem => {
        const progress = progressData.find(p => p.uid === baseItem.uid);
        if (progress) {
            // 서버에 저장된 진행 상황 병합
            return { ...baseItem, ...progress };
        }
        // 진행 상황이 없는 경우, 기본값으로 초기화
        return {
            ...baseItem,
            finish: "no",
            finish_date: "",
            group: 1, // [보완] 기본 그룹 번호를 1로 설정
            test_count: 0,
            chapter_orig: baseItem.chapter_name // [수정] chapter_name 기준으로 초기화
        };
    });

    if (myChapterInfo.currStudyUid) {
        const foundIndex = studyData.findIndex(i => i.uid === myChapterInfo.currStudyUid);
        if (foundIndex !== -1) savedIndex = foundIndex;
    }

    currStudyDataNum = (studyData[savedIndex]) ? savedIndex : (findFirstStudyNoFinishDataInChapter() || 0);
    
    if (studyData[currStudyDataNum]) {
        currGroupNum = parseInt(studyData[currStudyDataNum].group) || 1;
    }
    
    // Firebase 경로에서 Chapter List 가져오기
    myChapterList = remoteData.books?.[currBookName]?.myChapterList || {};

    await checkChapter(); // 저장소 로드 후 챕터 목록 갱신
    if (myChapterList && myChapterList[currChapterName]) {
        totalGroupCount = myChapterList[currChapterName].totalGroupCount;;
        groupDevideNum = myChapterList[currChapterName].groupDevideNum;
        lastGroupMemberCount = myChapterList[currChapterName].lastGroupMemberCount;
        chapterStudyFinishDate = myChapterList[currChapterName].finishDates;
    }

    yesCountInChapter = countYesInChapter(currChapterName); 
    yesNoCountInChapter = countYesNoInChapter(currChapterName); 
    findGroupMember(currGroupNum, currStudyDataNum);  // 저장된 그룹과 번호의 정보를 가져온다.
    loadValue(currStudyDataNum); // 현재 값을 값을 로드 한다.  
    // json 파일에서 language 정보를 가져온다. 
    if (studyData.length > 0 && studyData[0].language) {
        studyLang = studyData[0].language;
    }
    findDateStudyState();  // 일자별 공부 현황 Load 하기 
    changeFontSize(defaultFontSize); // 변경된 폰트 사이즈로 폰트크기 재 설정하기 
}

// =====================================================================
// Chapter 단위 카운팅 함수들 (주로 Chapter 관리 화면에서 사용)
// =====================================================================

function countYesInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && studyData[i].finish == 'yes') {
            count++;
        }
    }
    return count;
}

function countNoInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && studyData[i].finish == 'no') {
            count++;
        }
    }
    return count;
}

function countAllInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName) {
            count++;
        }
    }
    return count;
}

function countDeleteInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && studyData[i].finish == 'delete') {
            count++;
        }
    }
    return count;
}

function countYesNoInChapter(chapterName) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && (studyData[i].finish == 'no' || studyData[i].finish == 'yes')) {
            count++;
        }
    }
    return count;
}

function countYesNoInGroup(chapterName, thisGroup) {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && studyData[i].group == thisGroup &&(studyData[i].finish == 'no' || studyData[i].finish == 'yes')) {
            count++;
        }
    }
    return count;
}

// 팝업창을 표시하는 함수, 기본 2초있다가 사라짐. 
function showPopup(message, duration = 2500) {
    const popupWindow = document.getElementById('popup-window');
    const popupMessage = document.getElementById('popup-message');
    
    popupMessage.textContent = message;
    popupWindow.style.display = 'block';
    
    setTimeout(() => {
      popupWindow.style.display = 'none';
    }, duration);
}