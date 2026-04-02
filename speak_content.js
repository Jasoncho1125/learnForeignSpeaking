// chapter을 전반적으로 컨트롤 하는 기능 모음.
// 최초 로딩시 chapter 정보를 확인하여 처리하는 로직 
// chapter 정보가 없으면(기존데이터) 강제로 "Chapter1" 으로 할당한다. 
// chapterList 전역 변수에 현재 chapter의 chapter들을 조사하여 넣는다. 
async function checkChapter() {
    if (!studyData) return; // studyData가 로드되지 않았으면 함수 종료

    // 현재 학습 중인 Book 이름을 확인합니다.
    const currentBook = (studyData && studyData[currStudyDataNum]) ? studyData[currStudyDataNum].book_name : "";

    // studyData의 chapter 정보를 읽어와서 chapterList에 넣는다. 
    let chapterArrayTemp = [];  // chapter을 찾아서 넣을 임시 배열(중복)
    for (let i = 0; i < studyData.length; i++) {
        // [수정] 현재 선택된 Book에 해당하는 Chapter만 수집하도록 필터링을 추가합니다.
        if (currentBook && studyData[i].book_name !== currentBook) continue;

        // 데이터에 챕터 정보가 없거나 비어있는 경우 "Chapter1"으로 할당하여 유효한 목록을 유지합니다.
        if (!studyData[i].chapter_name || studyData[i].chapter_name === "") {
            studyData[i].chapter_name = "Chapter1";
        }
        chapterArrayTemp.push(studyData[i].chapter_name); // chapter_name 수집
    }
    // set을 이용하여 중복 제거한 배열 생성 
    const set = new Set(chapterArrayTemp);
    // [추가] 챕터 목록을 숫자순/알파벳순으로 정렬하여 day01, day02 순서가 어긋나지 않게 합니다.
    chapterList = [...set].sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
}

// 초기화시에 chapter의 각종 정보를 저장하는 object 생성
// 전체 chapter 개수 만큼 기본 정보 저장 틀 생성함. 
function myChapterListInfoMake() {
    // [수정] 기존 정보를 유지하면서 현재 Book에 해당하는 Chapter 정보만 필터링하여 재구성합니다.
    // 이를 통해 다른 Book의 챕터 정보가 현재 Book의 저장소 영역에 섞이는 것을 방지합니다.
    const filteredMetadata = {};
    for (let i = 0; i < chapterList.length; i++) {
        const chapName = chapterList[i];
        if (myChapterList && myChapterList[chapName]) {
            // 기존 데이터가 있으면 유지
            filteredMetadata[chapName] = myChapterList[chapName];
        } else {
            // 없으면 기본 구조 생성
            filteredMetadata[chapName] = {
                'chapterName': chapName,
                'lastStudyNumInChapter': 0,
                'yesNoCountInChapter': 0,
                'totalGroupCount': 0,
                'currGroupNum': 0,
                'groupDevideNum': 5000, 
                'finishDates' : "",
                'lastGroupMemberCount': 0
            };
        }
    }
    myChapterList = filteredMetadata;
}

function myChapterInfoMake(){
    myChapterInfo = {
        'currChapterName' : "",
        'currStudyDataNum' : "",  // 지금 공부하고 있는 자료 num 저장 
        'koreaPlay' : koreaPlay,
        'composeMode' : composeMode,
        'showScriptMode' : showScriptMode,
        'showScriptModeKor' : showScriptModeKor, // [Fix] 속성 누락 추가
        'mp3PlayMode' : mp3PlayMode,
        'foreignFirst' : foreignFirst,
        'forNoSoundLength' : forNoSoundLength,
        'defaultFontSize' : defaultFontSize,
        'defaultDevideNum' : defaultDevideNum,
        'script_foreign_Font' : script_foreign_Font, // Use the global variable for initialization
        'defaultPlayCount' : defaultPlayCount,
        'studyDataVersion' : studyDataVersion,
        'studyCountInDay': {  // 날짜별 mp3 play한 회수 저장
            '2020-01-01': 0,   // 예시적으로 예제 파일 생성
        },
        'studyFinishCountInDay': {  // 날짜별 완료처리한 회수 저장
            '2020-01-01': 0,   // 예시적으로 예제 파일 생성
        }
    }
}

// Book을 선택하는 기능 추가
async function changeBook() {
    saveToFirebase();
    let selectedBookName = await selectBook(); // selectBook returns book_name
    
    if (selectedBookName !== 'cancel') {
        // 북 이름 변경 시 Firebase에서 데이터를 다시 불러와야 하므로 loadLocalStorage를 호출합니다.
        currBookName = selectedBookName;
        
        // [수정] UID 히스토리를 확인하여 정확한 인덱스 찾기
        let lastUid = (myChapterInfo.lastStudyNumPerBook) ? myChapterInfo.lastStudyNumPerBook[selectedBookName] : undefined;
        let foundIndex = -1;

        if (lastUid) {
            foundIndex = studyData.findIndex(i => i.uid === lastUid);
        }

        if (foundIndex !== -1) {
            // UID 매칭 성공 시 해당 위치로 이동
            currStudyDataNum = foundIndex;
            currChapterName = studyData[foundIndex].chapter_name;
        } else {
            // 히스토리가 없으면 해당 Book의 첫 번째 데이터 찾기
            currStudyDataNum = studyData.findIndex(i => i.book_name === selectedBookName);
            if (currStudyDataNum === -1) currStudyDataNum = 0;
            currChapterName = studyData[currStudyDataNum].chapter_name;
        }
        
        // 그룹 정보 재설정 및 화면 갱신
        await checkChapter();
        myChapterListInfoMake(); 

        // [수정] 불필요한 groupReassign 제거 및 기존 studyData의 group 정보 동기화
        let maxGroup = 1;
        studyData.forEach(item => {
            if (item.book_name === selectedBookName && item.chapter_name === currChapterName) {
                let g = parseInt(item.group) || 1;
                if (g > maxGroup) maxGroup = g;
            }
        });
        totalGroupCount = maxGroup;
        lastGroupMemberCount = findLastGroupMemberCount();

        if (myChapterList[currChapterName]) {
            myChapterList[currChapterName].totalGroupCount = totalGroupCount;
            myChapterList[currChapterName].lastGroupMemberCount = lastGroupMemberCount;
        }

        // [수정] 복원된 인덱스(currStudyDataNum)가 속한 그룹 번호를 찾아 위치를 고정함
        let targetGroup = parseInt(studyData[currStudyDataNum].group) || 1;
        findGroupMember(targetGroup, currStudyDataNum);

        // [추가] 날짜 및 상태 정보 동기화
        chapterStudyFinishDate = myChapterList[currChapterName]?.finishDates || "";

        loadValue(currStudyDataNum);
        saveToFirebase();
        showPopup(`해당 북으로 이동했습니다.`);
    }
}

// Book 선택 모달 팝업
async function selectBook() {
    return new Promise((resolve) => {
        // 중복 없는 Book 리스트 추출
        let bookList = [];
        studyData.forEach(item => {
            if (item.book_name && !bookList.find(b => b.name === item.book_name)) {
                bookList.push({ display: item.book, name: item.book_name });
            }
        });

        let radioButtonsHtml = bookList.map((bookObj) => {
            return `
                <label style="display: block; margin-bottom: 10px; cursor: pointer;">
                    <input type="radio" name="bookSelect" value="${bookObj.name}"> ${bookObj.display}
                </label>
            `;
        }).join('');

        const modalHtml = `
            <div id="selectBookModalOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
                <div style="background: white; padding: 20px; border-radius: 8px; width: 80%; max-width: 300px; max-height: 70vh; overflow-y: auto;">
                    <p style="font-weight: bold; margin-bottom: 15px;">공부할 Book을 선택하세요</p>
                    ${radioButtonsHtml}
                    <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                        <button id="bookConfirm" class="button2ea btn_color6">확인</button>
                        <button id="bookCancel" class="button2ea btn_color3">취소</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('selectBookModalOverlay');
        document.getElementById('bookConfirm').onclick = () => {
            const selected = modal.querySelector('input[name="bookSelect"]:checked');
            modal.remove();
            resolve(selected ? selected.value : 'cancel');
        };
        document.getElementById('bookCancel').onclick = () => {
            modal.remove();
            resolve('cancel');
        };
    });
}

// chapter이 여러개 있을때 이중에 하나를 선택하는 기능을 팝업/라디오 버튼으로 구현
async function changeChapter() {
    let chapterImsi;

    saveToFirebase(); // 변경하기 전에 기존 정보를 저장한다. 
    // 팝업에서 현재 북에서 하나를 선택한 값을 가져옴 
    chapterImsi = await selectChapter();
    // 북선택에서 취소를 누르거나 현재북과 동일하지 않으면 ==> 다른 북을 선택했으면 아래 진행
    if (chapterImsi != 'cancel') { // && chapterImsi != currChapterName

        var deleteCount = countDeleteInChapter(currChapterName); // chapter-level
        if(countYesNoInChapter(currChapterName) === deleteCount){ // chapter-level
            deleteAllComment();  // 모두 암기 삭제된 경우 처리 
        }else {
            // 현재 챕터 정보가 유효할 때만 마지막 학습 위치를 저장 (Error 방지)
            if (currChapterName && myChapterList[currChapterName]) {
                myChapterList[currChapterName].lastStudyNumInChapter = currStudyDataNum;
            }

        currChapterName = chapterImsi;

        // [Fix] 선택한 챕터 정보가 myChapterList에 없는 경우 초기화하여 TypeError 방지
        if (!myChapterList[currChapterName]) {
            myChapterList[currChapterName] = {
                'chapterName': currChapterName,
                'lastStudyNumInChapter': 0,
                'yesNoCountInChapter': 0,
                'totalGroupCount': 0,
                'finishDates': "",
                'groupDevideNum': 10
            };
        }

        // [Fix] 챕터 이동 즉시 기존 완료 날짜 히스토리를 전역 변수에 로드하여 데이터 덮어쓰기 방지
        chapterStudyFinishDate = myChapterList[currChapterName].finishDates || "";

        // 현재 변경된 chapter의 저장된 공부대상 정보를 받아온다. 
        currStudyDataNum = myChapterList[currChapterName].lastStudyNumInChapter; 
        totalGroupCount = myChapterList[currChapterName].totalGroupCount;  // 현재 Chapter의 그룹 수

        // 만약 currStudyDataNum가 undefined이면 대상 북을 초기화 한다.
        if (totalGroupCount == 0 || currStudyDataNum === undefined) { 
            await checkChapter(); // 인자 제거
            yesCountInChapter = 0; // 전체 암기 완료 개수를 0으로 설정함. 
            initializeChapter(currChapterName, 2); // [Fix] 챕터명 누락 수정
            currStudyDataNum = findFirstStudyNoFinishDataInChapter(currChapterName);
            yesNoCountInChapter = countYesNoInChapter(currChapterName); // [Fix] 변수명 통일
            await groupReassign();  // 초기화시에 그룹 재조정 실시
            currGroupNum = 1; // 초기화시 현재 그룹넘버는 1로 설정 
            totalGroupCount = myChapterList[currChapterName].totalGroupCount;  // 현재 Chapter의 그룹 수 세기
            findGroupMember(currGroupNum); // 현재 Chapter의 해당 그룹 멤버를 찾아옴. 
            myChapterInfo.currChapterName = currChapterName;
            saveToFirebase();
        } else { // chapter 초기화가 필요 없으면 현재 정보를 가져온다. 
            myChapterInfo.currChapterName = currChapterName;
            myChapterInfo.currStudyDataNum = myChapterList[currChapterName].lastStudyNumInChapter;
            currStudyDataNum = myChapterInfo.currStudyDataNum;
            totalGroupCount = myChapterList[currChapterName].totalGroupCount;  // 현재 Chapter의 그룹
            findGroupMember(currGroupNum); // 현재 Chapter의 해당 그룹 멤버를 찾아옴. 수 세기
            lastGroupMemberCount = findLastGroupMemberCount();
        }

        loadValue(currStudyDataNum);
        // chapter 완료 메시지가 있는 경우에 이를 초기화 해준다. 
        document.getElementById('finishComment').innerHTML = "";
        }
        
    }
}

// 새로운 Chapter의 group 정보가 없으면 해당 Chapter을 초기화한다. 
function checkNewChapter() {
    let firstStudyDataInChapterArr;
    // 기존에 할당된 그룹값이 없으면 초기화를 한다. 
    firstStudyDataInChapterArr = findFirstStudyDataInChapter(currChapterName);
    if (!studyData[firstStudyDataInChapterArr].group) {
        loadJsonFromFile();
    }
}

// currChapterName에 해당하는 첫번째 studyData값을 찾는다.
function findFirstStudyDataInChapter(chapterName) {
    let firstData = 0;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName) {
            firstData = i;
            break;
        }
    }
    return firstData;
}

// currChapterName에 해당하는 첫번째 공부할 studyData값을 찾는다.
function findFirstStudyNoFinishDataInChapter(chapterName) {
    let firstNoFinishData;
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == chapterName && studyData[i].finish == "no") {
            firstNoFinishData = i;
            break;
        }
    }
    return firstNoFinishData;
}

// Function to count the number of dates in finishDates
// myChapterList에서 학습 완료한 횟수를 알려주는 함수 
function countFinishDates(chapter) {
    if (myChapterList[chapter] && myChapterList[chapter].finishDates) {
        let dates = myChapterList[chapter].finishDates;
        if (dates.trim() === "") {
            return 0;
        }
        return dates.split(',').length;
    }
    return 0;
}

// 팝업창에서 공부하려는 Chapter을 선택하게 함.
async function selectChapter() {
    return new Promise((resolve) => {
        // 현재 선택된 Book의 챕터들만 필터링하여 보여주도록 개선
        const currentBookName = studyData[currStudyDataNum].book_name;
        let filteredChapters = new Set();
        studyData.forEach(item => {
            if(item.book_name === currentBookName) filteredChapters.add(item.chapter_name);
        });
        const displayChapters = [...filteredChapters];

        let radioButtonsHtml = displayChapters.map((chapter) => {
            const finishCount = countFinishDates(chapter);
            let labelColor = '';

            if (finishCount === 1) {
                labelColor = 'Darkcyan'; // 짙은 청록색
            } else if (finishCount === 2) {
                labelColor = 'blue'; // 파란색
            } else if (finishCount >= 3) {
                labelColor = 'red'; // 붉은색
            }

            // 초기 선택을 위한 로직 추가 가능 (예: currChapterName과 일치하는 경우 checked)
            let isChecked = (chapter === window.currChapterName) ? "checked" : "";

            return `
                <label style="color: ${labelColor}; display: block; margin-bottom: 10px;">
                    <input type="radio" name="chapter" value="${chapter}" ${isChecked}>
                    ${chapter}(전체완료 : ${finishCount}회, 암기대상 : ${countNoInChapter(chapter)}개)
                </label>
            `;
        }).join('');

        const modalHtml = `
            <div id="selectChapterModalOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-height: 80vh; overflow-y: auto;">
                    <p>공부하려는 Chapter을 선택하세요</p>
                    ${radioButtonsHtml}
                    <br><br>
                    <div class="button-container" style="display: flex; justify-content: center; gap: 10px;">
                        <button id="selectChapterConfirm" class="button4ea btn_color2">확인</button>
                        <button id="selectChapterCancel" class="button4ea btn_color2">취소</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('selectChapterModalOverlay');
        const confirmButton = document.getElementById('selectChapterConfirm');
        const cancelButton = document.getElementById('selectChapterCancel');
        const radioButtons = modal.querySelectorAll('input[name="chapter"]');

        confirmButton.addEventListener('click', () => {
            let selectedChapter = "cancel";
            radioButtons.forEach(radio => {
                if (radio.checked) {
                    selectedChapter = radio.value;
                }
            });
            modal.remove();
            resolve(selectedChapter);
        });

        cancelButton.addEventListener('click', () => {
            modal.remove();
            resolve("cancel");
        });

        // 라디오 버튼이 17개마다 확인/취소 버튼이 반복되던 로직은 모달에서는 불필요하여 제거됨.
        // 모달은 스크롤 가능하므로 모든 옵션을 한 번에 보여주는 것이 일반적입니다.
    });
}


// 팝업창에서 공부하려는 Chapter을 선택하게 함.
async function selectChapter2() {
    return new Promise(function (resolve, reject) {
        var childWindow2 = window.open("", "Select a Chapter", "width=device-width,height=300");

        // <label> 을 쓴 이유는 숫자를 터치해도 선택이 되도록 구현함.
        // label이 긴 경우에 17개마다 "선택", "취소" 버튼이 반복되서 나오도록 함.
        var content = `
            <!DOCTYPE html>
            <html lang="kr">
            <head>
                <meta charset="UTF-8">
                <title>CHAPTER 선택하기</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="Style.css" rel="stylesheet">
            </head>

            <body> 
                <p>공부하려는 Chapter을 선택하세요</p>       
                ${chapterList.map((chapter, index) => {
                    const finishCount = countFinishDates(chapter);
                    let labelColor = '';
                    
                    if (finishCount === 1) {
                        labelColor = 'Darkcyan'; // 짙은 청록색
                    } else if (finishCount === 2) {
                        labelColor = 'blue'; // 파란색
                    } else if (finishCount >= 3) {
                        labelColor = 'red'; // 붉은색
                    }

                    return `
                        <label style="color: ${labelColor};">
                            <input style="margin-bottom: 10px" type="radio" name="chapter" value="${chapter}" onclick="confirmSelection('${chapter}')">
                            ${chapter}(전체완료 : ${finishCount}회, 암기대상 : ${countYesNoInChapter(chapter)}개)
                        </label><br>
                    `;
                }).join('')}
            </body>

            <script>
                function confirmSelection(chapter) {
                    if (confirm(chapter + '를 선택하시겠습니까?')) {
                        window.opener.finishSelection(chapter);
                    }
                }
            </script>
            </html>
            `;
        childWindow2.document.write(content);

        // "선택" 버튼 클릭시 
        document.getElementById('finishComment').innerHTML = "";

        window.finishSelection = function (chapter) {
            childWindow2.close();
            resolve(chapter);
        };

        // "취소" 버튼 클릭시 
        childWindow2.getValueCancel2 = function () {
            childWindow2.close();
            resolve("cancel"); // 취소하면 "cancel" 리턴함.
        };

    });

}

// 모든 Chapter의 전체 공부 현황 정보를 제일 하단에 표시해 줌
function showChapterStatus() {
    if (!studyData || studyData[currStudyDataNum] === undefined) return;

    const currentBook = studyData[currStudyDataNum].book;
    let bookTotal = 0;
    let bookDelete = 0;
    let bookFinish = 0;
    let studyStateText = "";

    // 전체 chapter의 완료 개수 찾기
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book === currentBook) {
            bookTotal++;
            if (studyData[i].finish === 'yes') {
                bookFinish++;
            } else if (studyData[i].finish === 'delete') {
                bookDelete++;
            }
        }
    }

    const bookLeft = bookTotal - bookDelete - bookFinish;

    studyStateText += `[${currentBook} 현황] Tot/Del/Fin/Lef : ${bookTotal}/${bookDelete}/${bookFinish}/${bookLeft}<br>`;

    // 오늘 날짜 가져오기
    const today = new Date();
    const todayFormatted = (today.getMonth() + 1) + '-' + today.getDate(); // "M-D" 형식으로

    if (!myChapterList) myChapterList = {};

    for (let i = 0; i < chapterList.length; i++) {
        const chapName = chapterList[i];
        // finishDates에 따라 색상 설정
        if (!myChapterList[chapName]) {
            myChapterList[chapName] = { finishDates: "" };
        }

        let showFinishDates = myChapterList[chapName].finishDates;
        let color = 'black'; // 기본 색상

        if (showFinishDates !== "") {
            let finishDates = showFinishDates.split(','); // 쉼표로 구분된 날짜 배열
            let finishDatesCount = finishDates.length; // 날짜 개수 확인

            if (finishDatesCount === 1 || finishDatesCount === 2) {
                color = 'DarkCyan';  // 짙은 청록색
            } else if (finishDatesCount === 3 || finishDatesCount === 4) {
                color = 'blue';  // 블루
            } else if (finishDatesCount >= 5) {
                color = 'red';  // 레드
            }

            // 날짜 포맷 변경 및 오늘 날짜 강조
            showFinishDates = finishDates.map(date => {
                let formattedDate = date.trim(); // 날짜 앞뒤 공백 제거
                if (formattedDate === todayFormatted) {
                    return `<span style="background-color: black; color: white; ">${formattedDate}</span>`;
                }
                return `<span>${formattedDate}</span>`;
            }).join(',');

            showFinishDates = "[" + showFinishDates + "]";
        }

        // 각 항목을 색상으로 출력
        studyStateText += `<span><span style="color:black">• ${chapterList[i]} : ${countAllInChapter(chapterList[i])}/${countDeleteInChapter(chapterList[i])}/${countYesInChapter(chapterList[i])}/${countNoInChapter(chapterList[i])}</span> <span style="color:${color}">${showFinishDates}</span></span><br>`;

        totalCount = 0;
        studyFinishCount = 0;
        deleteCount = 0;
    }
    // 텍스트가 겹쳐보이는 문제를 방지하기 위해 요소를 교체하는 방식으로 텍스트 업데이트
    const studyChapterElement = document.getElementById('study_chapter');
    studyChapterElement.innerHTML = "";  // 이전 내용을 비움
    studyChapterElement.innerHTML = studyStateText;  // 새로운 내용을 추가
}

// Chapter이 여러개인 경우 study 정보를 유지하면서 1개의 북으로 만든다. 
async function changeToOneChapter(){
    if(chapterList.length > 1){  // Chapter 개수가 2개 이상일때만 합치기가 가능함. 
        for (let i = 0; i < studyData.length; i++) {
            // [Fix] 현재 북(Book)에 해당하는 데이터만 통합하도록 필터링 강화
            if (studyData[i].book_name === currBookName) {
                studyData[i].chapter_orig = studyData[i].chapter_name; 
                studyData[i].chapter_name = "ChapterOne" 
            }
        }
    
        currChapterName = "ChapterOne" 
        document.getElementById('study_title').innerHTML = studyTitle + '<span class="mychaptercolor">' + currChapterName + '</span>';
        await checkChapter(); // chapter 정보를 조사하여 currChapterName, chapterList를 채운다. 
        myChapterListInfoMake(); // chapter List의 각종 저장 정보를 위한 object를 만든다. 
        myChapterInfoMake(); // chapter의 기본 정보 저장을 위한 object를 만든다. 
        initializeChapter(3); // 해당북의 test_count, finish, finish_date 값을 초기화함.
        currStudyDataNum = findFirstNumInChapter(currChapterName);  // 현재 Chapter의 첫번째 암기 대상번호를 받아온다. 
        // myStudyChapterInfo.currChapterName.currStudyDataNum =  currStudyDataNum;
        yesCountInChapter = 0; // 전체 암기 완료 개수를 0으로 설정함. 
        yesNoCountInChapter = countYesNoInChapter(currChapterName); // chapter-level
        await groupReassign();  // 초기화시에 그룹 재조정 실시
        currGroupNum = 1; // 초기화시 현재 그룹넘버는 1로 설정 
        totalGroupCount = myChapterList[currChapterName].totalGroupCount;;  // 현재 Chapter의 그룹 수 세기
        findGroupMember(currGroupNum); // 현재 Chapter의 해당 그룹 멤버를 찾아옴. 
        loadValue(currStudyDataNum); // 처음 값을 불러와서 화면에 표시하기  
        saveToFirebase(); // 현재 값을 Firebase에 저장함 
        updateProgress(0); // Initialize the progress bar
        document.getElementById('study_date').innerHTML = ""; // 초기 로딩시 date 값 삭제
        document.getElementById('finishComment').innerHTML = ""; // 초기 로딩시 과거 정보 삭제
    } else{
        showPopup("Chapter 개수가 2개 이상이어야 처리 가능합니다. 현재는 Chapter이 1개입니다.", 3000);
    }
    
}

// 원래의 Chapter 정보로 돌아간다. 
async function changeToOriginalChapter(){
    for (let i = 0; i < studyData.length; i++) { 
        // [Fix] 현재 북(Book)에 대해서만 원래 챕터로 복구
        if(studyData[i].book_name === currBookName && studyData[i].chapter_orig) {
            studyData[i].chapter_name = studyData[i].chapter_orig; 
        }
    }
    await checkChapter(); // chapter 정보를 조사하여 currChapterName, chapterList를 채운다. 
    myChapterListInfoMake(); // chapter List의 각종 저장 정보를 위한 object를 만든다. 
    myChapterInfoMake(); // chapter의 기본 정보 저장을 위한 object를 만든다. 
    initializeChapter(3); // 해당북의 test_count, finish, finish_date 값을 초기화함.
    // 다시 current 암기대상 찾기
    for (let i = 0; i < studyData.length; i++) {
        // [Fix] 현재 북 기준으로 미암기 대상 찾기
        if(studyData[i].book_name === currBookName && studyData[i].finish == "no"){
            currStudyDataNum = i;
            currChapterName = studyData[i].chapter_name;
            break; // 최초에 미암기가 나오면 current로 하고 for문 탈출 한다. 
        } 
    }
    myChapterInfo.currChapterName = currChapterName;
    currStudyDataNum = findFirstNumInChapter(currChapterName);  // 현재 Chapter의 첫번째 암기 대상번호를 받아온다. 
    // myStudyChapterInfo.currChapterName.currStudyDataNum =  currStudyDataNum;
    document.getElementById('study_title').innerHTML = studyTitle + '<span class="mychaptercolor">' + currChapterName + '</span>';
    yesCountInChapter = 0; // 전체 암기 완료 개수를 0으로 설정함. 
    yesNoCountInChapter = countYesNoInChapter(currChapterName); // chapter-level
    await groupReassign();  // 초기화시에 그룹 재조정 실시
    currGroupNum = 1; // 초기화시 현재 그룹넘버는 1로 설정 
    totalGroupCount = myChapterList[currChapterName].totalGroupCount;;  // 현재 Chapter의 그룹 수 세기
    findGroupMember(currGroupNum); // 현재 Chapter의 해당 그룹 멤버를 찾아옴. 
    loadValue(currStudyDataNum); // 처음 값을 불러와서 화면에 표시하기  
    saveToFirebase(); // 현재 값을 Firebase에 저장함 
    updateProgress(0); // Initialize the progress bar
    document.getElementById('study_date').innerHTML = ""; // 초기 로딩시 date 값 삭제
    document.getElementById('finishComment').innerHTML = ""; // 초기 로딩시 과거 정보 삭제

}

// 현재 Chapter의 Chapter List를 가져온다. 
function getChapterListOfChapter() {
    // chapterList는 이미 checkChapter()에 의해 모든 고유하고 정렬된 챕터로 채워져 있습니다.
    return chapterList;
}



// 그룹 재조정하기 : 그룹당 몇개 단위로 나누어서 공부할 것인지 재조정
async function groupReassign(forcePopup = false) {
    let targetDevideNum;
    
    // 1. 현재 챕터의 기존 그룹 설정(history) 확인
    let historyDevideNum = (myChapterList && myChapterList[currChapterName]) 
                           ? myChapterList[currChapterName].groupDevideNum : 0;

    if (forcePopup) {
        // 사용자가 버튼을 눌렀을 때는 팝업을 띄워 직접 선택하게 함
        targetDevideNum = await getGroupReassignValue();
    } else {
        // 자동 이동 시: 히스토리가 있으면 그대로 사용, 없으면 전체(5000)를 1그룹으로 설정
        targetDevideNum = (historyDevideNum > 0) ? historyDevideNum : 5000;
    }
    
    if (targetDevideNum !== "cancel") {
        await performGroupReassign(targetDevideNum);
    }
}

async function performGroupReassign(devideNum) {
    if(btnPlayRepeat.textContent == "STOP"){  // PLAY R 모드이면 
        togglePlayStop();  // PLAY R 모드를 중지 시킨 후에 처리
    }
    //loadLocalStorage();
    // 그룹 사이즈를 비동기 처리를 하여 값을 가져온 이후에 진행하도록 구현한다. 
    let getDevideNum;
    if(devideNum){
        getDevideNum = parseInt(devideNum);
    }else{
        getDevideNum = await getGroupReassignValue();
    }
    
    // 취소 버튼을 누르면 그룹 재조정을 수행하지 않고 종료함. 
    if (getDevideNum != "cancel") {
        groupDevideNum = getDevideNum;
        let currentGroup = 1;
        let currentGroupCount = 0;
        lastGroupMemberCount = 0;  // 마지막 그룹의 카운트를 0으로 설정
        // 현재 챕터의 모든 데이터 그룹 값을 초기화
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName) {
                studyData[i].group = "";
            }
        }
        // 현재 챕터의 미완료 항목에 대해서만 그룹을 재할당
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && studyData[i].finish == 'no') {
                studyData[i].group = currentGroup;
                currentGroupCount = currentGroupCount + 1;
                if (currentGroupCount >= groupDevideNum) {
                    currentGroup = currentGroup + 1;
                    currentGroupCount = 0;
                }
            }
        }
        // 전체 그룹의 수를 조사하여 전역 변수에 할당함. 
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && studyData[i].finish == 'no') {
                totalGroupCount = studyData[i].group;
            }
        }
        // 북 정보 업데이트 한다. 
        if (myChapterList && myChapterList[currChapterName]) {
            myChapterList[currChapterName].totalGroupCount = totalGroupCount;
        }
        lastGroupMemberCount = findLastGroupMemberCount();
        if(totalGroupCount == 1){
            groupDevideNum = lastGroupMemberCount;
        }
        findGroupMember(1);  // group 초기화시에는 첫번째 그룹의 정보를 가져온다. 
        saveToFirebase();  // 지금까지 변경된 chapter 정보를 저장한다. 
        loadValue(currStudyDataNum);  // 첫 그룹 첫번째 값을 로드 한다. 
    }
}

// 그룹을 하나로 합치기 
async function groupReassignAll() {
    //loadLocalStorage();
    // 그룹 사이즈를 비동기 처리를 하여 값을 가져온 이후에 진행하도록 구현한다. 
    let getDevideNum = 5000;
    // 취소 버튼을 누르면 그룹 재조정을 수행하지 않고 종료함. 
    if (getDevideNum != "cancel") {
        groupDevideNum = getDevideNum;
        let currentGroup = 1;
        let currentGroupCount = 0;
        lastGroupMemberCount = 0;  // 마지막 그룹의 카운트를 0으로 설정
        // 해당 chapter의 모든 데이터의 그룹 값을 null 로 변경함 : "" 
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName) {
                // if(studyData[i].finish == 'yes'){  // yes는 모두 no로 변경함. 
                //     studyData[i].finish = 'no';
                // }
                studyData[i].group = "";
            }
        }
        // 모든 항목을 검사하여, 암기 완료가 no 이면서, 지정된 그룹 숫자에 맞게 재조정함. 
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && studyData[i].finish == 'no') {
                studyData[i].group = currentGroup;
                currentGroupCount = currentGroupCount + 1;
                if (currentGroupCount >= groupDevideNum) {
                    currentGroup = currentGroup + 1;
                    currentGroupCount = 0;
                }
            }
        }
        // 전체 그룹의 수를 조사하여 전역 변수에 할당함. 
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && studyData[i].finish == 'no') {
                totalGroupCount = studyData[i].group;
            }
        }
        // 북 정보 업데이트 한다. 
        if (myChapterList && myChapterList[currChapterName]) {
            myChapterList[currChapterName].totalGroupCount = totalGroupCount;
        }
        lastGroupMemberCount = findLastGroupMemberCount();
        if(totalGroupCount == 1){
            groupDevideNum = lastGroupMemberCount;
        }
        findGroupMember(1);  // group 초기화시에는 첫번째 그룹의 정보를 가져온다. 
        saveToFirebase();  // 지금까지 변경된 chapter 정보를 저장한다. 
        loadValue(currStudyDataNum);  // 첫 그룹 첫번째 값을 로드 한다. 
    }
}

// "그룹조정" 버튼을 누르면 새로운 창에서 그룹을 다시 설정할 값을 받아온다.
// 비동기 처리를 한다.
async function getGroupReassignValue() {
    // Chapter 선택시 모두 암기 완료 상태이면 암기제외 초기화를 먼저 수행한다.
    if(countNoInChapter(currChapterName) === 0){
        initializeChapter(2);
    }
    return new Promise((resolve) => {
        var englishCount = countYesNoInChapter(currChapterName);
        var finishCount = countYesInChapter(currChapterName);
        var currChapterInfo = `현재 Chapter(${currChapterName})의 미완료 개수 : ${countNoInChapter(currChapterName)}`;

        // 라디오 버튼에 대한 옵션 값들 저장한다.
        const options = [
            { value: "06", label: "6" },
            { value: "08", label: "8" },
            { value: "10", label: "10" },
            { value: "12", label: "12" },
            { value: "15", label: "15" },
            { value: "20", label: "20" },
            { value: "30", label: "30" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
            { value: "5000", label: "All" }
        ];

        // 라디오 버튼 HTML 생성
        let radioButtonsHtml = options.map(option => {
            // defaultDevideNum 값과 일치하는 옵션에 checked 속성을 추가
            // defaultDevideNum은 코드 외부에서 정의되어야 함
            let isChecked = (parseInt(option.value) === defaultDevideNum) ? "checked" : "";
            return `<label style="margin-bottom: 12px; display: block;"><input type="radio" name="value" value="${option.value}" ${isChecked}> ${option.label} </label>`;
        }).join('');

        const modalHtml = `
            <div id="groupReassignModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <p>그룹 재조정할 값을 선택하세요</p>
                    <p>${currChapterInfo}</p>
                    ${radioButtonsHtml}
                    <br><br>
                    <div class="button-container" style="display: flex; justify-content: center; gap: 10px;">
                        <button id="groupReassignConfirm" class="button4ea btn_color2">확인</button>
                        <button id="groupReassignCancel" class="button4ea btn_color2">취소</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('groupReassignModal');
        const confirmButton = document.getElementById('groupReassignConfirm');
        const cancelButton = document.getElementById('groupReassignCancel');
        const radioButtons = modal.querySelectorAll('input[name="value"]');

        confirmButton.addEventListener('click', () => {
            let selectedValue = "cancel";
            radioButtons.forEach(radio => {
                if (radio.checked) {
                    selectedValue = radio.value;
                }
            });
            let groupDevideNum1 = parseInt(selectedValue);
            // defaultDevideNum 및 saveToFirebase()는 코드 외부에서 정의되어야 함
            defaultDevideNum = groupDevideNum1;
            saveToFirebase(); 
            modal.remove();
            resolve(groupDevideNum1);
        });

        cancelButton.addEventListener('click', () => {
            modal.remove();
            resolve("cancel");
        });
    });
}


// "그룹조정" 버튼을 누르면 새로운 창에서 그룹을 다시 설정할 값을 받아온다. 
// 비동기 처리를 한다. 
async function getGroupReassignValue2() {
    // Chapter 선택시 모두 암기 완료 상태이면 암기제외 초기화를 먼저 수행한다. 
    if(countNoInChapter(currChapterName, currChapterName) === 0){
        initializeChapter(2);
    }
    return new Promise(function (resolve, reject) {
        var englishCount = countYesNoInChapter(currChapterName, currChapterName);
        var finishCount = countYesInChapter(currChapterName, currChapterName);
        var currChapterInfo = `현재 Chapter(${currChapterName})의 미완료 개수 : ${countNoInChapter(currChapterName, currChapterName)}`;

        // 라디오 버튼에 대한 옵션 값들 저장한다. 
        const options = [
            { value: "06", label: "6" },
            { value: "08", label: "8" },
            { value: "10", label: "10" },
            { value: "12", label: "12" },
            { value: "15", label: "15" },
            { value: "20", label: "20" },
            { value: "30", label: "30" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
            { value: "5000", label: "All" }
        ];

        // 라디오 버튼 HTML 생성
        let radioButtonsHtml = options.map(option => {
            // defaultDevideNum 값과 일치하는 옵션에 checked 속성을 추가
            let isChecked = (parseInt(option.value) === defaultDevideNum) ? "checked" : "";
            return `<label><input style="margin-bottom: 12px" type="radio" name="value" value="${option.value}" ${isChecked}> ${option.label} </label><br>`;
        }).join('');

        var content = `
            <!DOCTYPE html>
            <html lang="kr">
            <head>
                <meta charset="UTF-8">
                <title>그룹 재설정하기</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="Style.css" rel="stylesheet">
            </head>
            <body>
                <p>그룹 재조정할 값을 선택하세요</p>
                <p>${currChapterInfo}</p>
                ${radioButtonsHtml}
                <br><br>
                <button class="button4ea btn_color2" onclick="getValueAndClose()">확인</button>
                <button class="button4ea btn_color2" onclick="getValueCancel()">취소</button>
            </body>
            </html>
            `;

        var childWindow = window.open("", "Group Devide Number", "width=device-width,height=300");
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
            let groupDevideNum1 = parseInt(selectedValueInChild);
            defaultDevideNum = groupDevideNum1;  // 변경된 DevideNum 을 받아와서 저장한다. 
            saveToFirebase();
            childWindow.close();
            resolve(groupDevideNum1);
        };

        childWindow.getValueCancel = function () {
            childWindow.close();
            resolve("cancel"); // 취소하면 "cancel" 리턴함. 
        };
    });
}

// 모든 Chapter의 전체 공부 현황 정보를 제일 하단에 표시해 줌
function showChapterStatus() {
    if (!studyData || studyData[currStudyDataNum] === undefined) return;

    const currentBookID = studyData[currStudyDataNum].book_name;
    const currentBookDisplay = studyData[currStudyDataNum].book;
    let bookTotal = 0;
    let bookDelete = 0;
    let bookFinish = 0;
    let studyStateText = "";

    // 전체 chapter의 완료 개수 찾기 (현재 Book 기준)
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currentBookID) {
            bookTotal++;
            if (studyData[i].finish === 'yes') bookFinish++;
            else if (studyData[i].finish === 'delete') bookDelete++;
        }
    }

    const bookLeft = bookTotal - bookDelete - bookFinish;
    studyStateText += `[${currentBookDisplay} 현황] Tot/Del/Fin/Lef : ${bookTotal}/${bookDelete}/${bookFinish}/${bookLeft}<br>`;

    const today = new Date();
    const todayFormatted = (today.getMonth() + 1) + '-' + today.getDate();

    if (!myChapterList) myChapterList = {};

    for (let i = 0; i < chapterList.length; i++) {
        const chapName = chapterList[i];
        if (!myChapterList[chapName]) myChapterList[chapName] = { finishDates: "" };

        let showFinishDates = myChapterList[chapName].finishDates;
        let color = 'black';

        if (showFinishDates !== "") {
            let finishDates = showFinishDates.split(',');
            if (finishDates.length === 1 || finishDates.length === 2) color = 'DarkCyan';
            else if (finishDates.length === 3 || finishDates.length === 4) color = 'blue';
            else if (finishDates.length >= 5) color = 'red';

            showFinishDates = finishDates.map(date => {
                let formattedDate = date.trim();
                return formattedDate === todayFormatted 
                    ? `<span style="background-color: black; color: white;">${formattedDate}</span>` 
                    : `<span>${formattedDate}</span>`;
            }).join(',');
            showFinishDates = "[" + showFinishDates + "]";
        }

        // 현재 학습 중인 챕터인 경우 이름을 굵게(Bold) 표시하여 강조
        let displayChapterName = chapName;
        if (displayChapterName === currChapterName) {
            displayChapterName = `<b>${displayChapterName}</b>`;
        }

        studyStateText += `<span><span style="color:black">• ${displayChapterName} : ${countAllInChapter(chapName)}/${countDeleteInChapter(chapName)}/${countYesInChapter(chapName)}/${countNoInChapter(chapName)}</span> <span style="color:${color}">${showFinishDates}</span></span><br>`;
    }
    
    const studyChapterElement = document.getElementById('study_chapter');
    if (studyChapterElement) studyChapterElement.innerHTML = studyStateText;
}


// 해당 Chapter에서 새로운 그룹의 맴버들을 찾고, 그룹의 첫번째 맴버를 currStudyDataNum에 할당함. 
// 만약 모두 암기 완료한 상태이면 currStudyDataNum에 99999 를 할당함. 
function findGroupMember(thisGroupNum, thisCurNum) {
    // 시작시에 그룹 멤버 초기화
    currGroupMemberArr = [];
    // yesNoCountInChapter = countYesNoInChapter(currChapterName); // 전체 암기 대상수
    currGroupNum = thisGroupNum;  // 현지그룹넙버값에 전달 받은 그룹 넙버값 할당.
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name == currChapterName && parseInt(studyData[i].group) == thisGroupNum) {
            if (studyData[i].finish == 'no') {  // 미암기 인것만 그룹 목록에 넣기
                currGroupMemberArr.push(i);
            }
        }
    }
    // 현재 번호 값이 넘어오면 할당하고, 없으면 그룹의 첫번째를 지정함
    if (thisCurNum != undefined) {
        currStudyDataNum = thisCurNum;
    } else {
        currStudyDataNum = currGroupMemberArr[0]; // 그룹의 첫번째 값을 currStudyDataNum에 할당
    }
    noCountInGroup = currGroupMemberArr.length;
    // if(currGroupMemberArr.length == 0){
    //     currStudyDataNum = 99999;  // 그룹에 암기 대상이 0개 이면 현재 스터디 값을 99999로 할당한다. 
    // }
}

// 마지막 그룹의 멤버 숫자가 몇개인지 확인하는 함수 
function findLastGroupMemberCount() {
    let count = 0;
    for (let i = 0; i < studyData.length; i++) {
        // group 넘버가 전체 그룹 넘버와 일치한 개수를 최종 그룹멤버수 변수에 할당
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && (parseInt(studyData[i].group) == totalGroupCount)) {
            count++;
        }
    }
    return count;
}

// 완료했을 경우 그룹 첫번째값 찾기
// function findFirstOneInChapter(){
//     for (let i = 0; i < studyData.length; i++) {
//         // group 넘버가 전체 그룹 넘버와 일치한 개수를 최종 그룹멤버수 변수에 할당
//         if (studyData[i].chapter == currChapterName) {
//             return i;
//         }
//     }
// }

// PLAY A 에서 현재 학습 Chapter의 그룹 데이터를 모두 합치는 기능 구현
async function groupMemberToAll(){
    await toggleAllStop()
    await sleepMiliSecond(500);
    await groupReassign(500);  // 모든 그룹을 하나로 합친다. 
    await toggleAllPlay();
}

// 전달된 group에 대해서 암기제외는 유지하고 초기화하기 (yes => no로 변경)
function initializeGroup(thisGroupNum, thisCurNum){
        // 시작시에 그룹 멤버 초기화
        currGroupMemberArr = [];
        // yesNoCountInChapter = countYesNoInChapter(currChapterName); // 전체 암기 대상수
        currGroupNum = thisGroupNum;  // 현지그룹넙버값에 전달 받은 그룹 넙버값 할당.
        for (let i = 0; i < studyData.length; i++) {
            if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName && studyData[i].group == currGroupNum) {
                if (studyData[i].finish == 'no') {  // no 이면 그룹 목록에 넣기
                    currGroupMemberArr.push(i);
                } else if(studyData[i].finish == 'yes'){  // yes이면 no로 변경하여 그룹 목록에 넣기
                    studyData[i].finish = 'no';
                    currGroupMemberArr.push(i);
                }
            }
        }
        // 현재 번호 값이 넘어오면 할당하고, 없으면 그룹의 첫번째를 지정함
        if (thisCurNum != undefined) {
            currStudyDataNum = thisCurNum;
        } else {
            currStudyDataNum = currGroupMemberArr[0]; // 그룹의 첫번째 값을 currStudyDataNum에 할당
        }
        noCountInGroup = currGroupMemberArr.length;

        // 현재 그룹 찾아서 다시 로드 하기 
        findGroupMember(currGroupNum);
        // 그룹의 현재 값을 불러오기
        loadValue(currStudyDataNum);
        saveToFirebase();
        showScriptOff();
        if(composeMode){
        showKorScriptOnAndPlay(); // 한글 자막이 보이도록 한다. 
    }
}

// 모든 group에 대해서 암기제외는 유지하고 초기화하기 (yes => no로 변경)
function initializeAllGroup(){
    // chapter 개수가 1개일때에만 진행하도록 함. 
    if(chapterList.length > 1){
        showPopup("Chapter이 1개인 경우에만 적용 가능합니다.", 3000);
        return;
    }
    
    // 시작시에 그룹 멤버 초기화
    currGroupMemberArr = [];
    // yesNoCountInChapter = countYesNoInChapter(currChapterName); // 전체 암기 대상수
    // currGroupNum = thisGroupNum;  // 현지그룹넙버값에 전달 받은 그룹 넙버값 할당.
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name === currChapterName) {
            if (studyData[i].finish == 'no') {  // no 이면 그룹 목록에 넣기
                currGroupMemberArr.push(i);
            } else if(studyData[i].finish == 'yes'){  // yes이면 no로 변경하여 그룹 목록에 넣기
                studyData[i].finish = 'no';
                currGroupMemberArr.push(i);
            }
        }
    }
    // 현재 번호 값이 넘어오면 할당하고, 없으면 그룹의 첫번째를 지정함
    // if (thisCurNum != undefined) {
    //     currStudyDataNum = thisCurNum;
    // } else {
    //     currStudyDataNum = currGroupMemberArr[0]; // 그룹의 첫번째 값을 currStudyDataNum에 할당
    // }
    // noCountInGroup = currGroupMemberArr.length;

    // 현재 그룹 찾아서 다시 로드 하기 
    findGroupMember(currGroupNum);
    // 그룹의 현재 값을 불러오기
    loadValue(currStudyDataNum);
    saveToFirebase();
    showScriptOff();
    if(composeMode){
    showKorScriptOnAndPlay(); // 한글 자막이 보이도록 한다. 
}
}
