// 암기 대상을 다음 그룹으로 이동 하기 
async function nextGroup(){
    if(btnPlayRepeat.textContent == "STOP"){  // PLAY R 모드이면 
        togglePlayStop();  // PLAY R 모드를 중지 시킨 후에 처리
    }
    if (isPlaying) {
        myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
        myAudioReplay.pause(); 
        isPlaying = false;
    }

    if (totalGroupCount <= 1) {
        showPopup("현재 챕터에는 그룹이 1개입니다.");
        return;
    }

    if(currGroupNum < totalGroupCount){
        currGroupNum = currGroupNum + 1;
    }else{
        currGroupNum = 1;  // 마지막 그룹이면 첫번째 그룹으로 이동동
    }
    // 현재의 그룹 정보 알아 오기
    findGroupMember(currGroupNum);
    if(currGroupMemberArr.length === 0){ // 현재 그룹이 모두 암기 완료된 상태이면면
        showPopup("현재 그룹은 모두 완료 처리 되었습니다. 초기화 후 진행해 주세요");
        // 그룹의 현재 값을 불러오기
        loadValue(currStudyDataNum);
        saveToFirebase();
        return;
    }else{
        // 그룹의 현재 값을 불러오기
        loadValue(currStudyDataNum);
        saveToFirebase();
        showScriptOff();
        if(composeMode){
            showKorScriptOnAndPlay(); // 한글 자막이 보이도록 한다. 
        }
    }

}

// PLAY A에서 다음 그룹 이동하기 
async function nextGroup2(){
    await toggleAllStop()
    await sleepMiliSecond(500);
    await nextGroup();
    await toggleAllPlay();
}

// 암기 대상을 이전 그룹으로 이동하기 
function prebGroup(){
    if(btnPlayRepeat.textContent == "STOP"){  // PLAY R 모드이면 
        togglePlayStop();  // PLAY R 모드를 중지 시킨 후에 처리
    }
    if (isPlaying) {
        myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
        myAudioReplay.pause(); 
        isPlaying = false;
    }

    if (totalGroupCount <= 1) {
        showPopup("현재 챕터에는 그룹이 1개입니다.");
        return;
    }

    if(currGroupNum > 1){
        currGroupNum = currGroupNum - 1;
    }else{
        currGroupNum = totalGroupCount;
    }
    // 현재의 그룹 정보 알아 오기
    findGroupMember(currGroupNum);
    if(currGroupMemberArr.length === 0){ // 현재 그룹이 모두 암기 완료된 상태이면면
        showPopup("현재 그룹은 모두 완료 처리 되었습니다. 초기화 후 진행해 주세요");
        // 그룹의 현재 값을 불러오기
        loadValue(currStudyDataNum);
        saveToFirebase();
        return;
    }else{
        // 그룹의 현재 값을 불러오기
        loadValue(currStudyDataNum);
        saveToFirebase();
        showScriptOff();
        if(composeMode){
            showKorScriptOnAndPlay(); // 한글 자막이 보이도록 한다. 
        }
    }
}

//다음 버튼 클릭시 암기 완료된 것은 건너 뛰도록 함. 
// "PLAY R" 모드인 경우에는 중지 후 다시 PLAY 시킴
function nextValue(){
    if(currGroupMemberArr.length === 0){
        showPopup("이미 모두 암기 완료된 그룹입니다. 초기화 후에 이용해 주세요.");
        return;
    }
    if(btnPlayRepeat.textContent == "STOP"){  // "PLAY R" 모드인 경우에
        togglePlayStop();  // PLAY R 모드를 중지 시킨 후에 처리 
        if (isPlaying) {
            myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
            isPlaying = false;
        }
        // 그룹 값이 1개이면 처리 안함
        if(currGroupMemberArr.length != 1){
            // 그룹 값이 2개 이상이면 다음값으로 이동
            if(currGroupMemberArr.length != 0){
                let i = currGroupMemberArr.indexOf(currStudyDataNum);
                // 현재값이 배열의 마지막 값이면, 첫번째 값으로 설정함. 
                if(i == currGroupMemberArr.length - 1){
                    currStudyDataNum = currGroupMemberArr[0];
                }else{
                    currStudyDataNum = currGroupMemberArr[i+1];
                }
                loadValue(currStudyDataNum);
                // "PLAY R" 상태에서 다음 버튼 누르면 종료하고 재실행하도록 함. 
                if(btnPlayRepeat.textContent == "STOP"){
                    togglePlayStop();
                    togglePlayStop();
                }
                
            }else{
                // 그룹내 전체를 암기완료하면 아래 표시함. 
                document.getElementById('studyState').innerHTML = "축하! 축하! 모두 암기 완료"
            }
            // 현재 상태를 Firebase에 저장함 : 나중에 불러올때 여기부터 시작하도록 함. 
            saveToFirebase();
            findDateStudyState();  // 일자별 공부 현황 Load 하기 
            if (showScriptMode){ // 자막 보이기 모드이면 자막을 보여라. 
                showScriptOn();
            }else{
                showScriptOff();
            }

            if (showScriptModeKor){ // 한국어 자막 보이기 모드이면 한국어 자막을 보여라. 
                showKorScriptOn();
            }else{
                showKorScriptOff();
            }
            
            if(studyLang == "song"){  // 노래모드 이면 
                showScriptOn();  // script를 보이지 않게 함. 
            }
            
        }
        
    
    }else{
        if (isPlaying) {
            myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
            isPlaying = false;
        }
        // 그룹 값이 1개이면 처리 안함
        if(currGroupMemberArr.length != 1){
            if(currGroupMemberArr.length != 0){
                let i = currGroupMemberArr.indexOf(currStudyDataNum);
                // 현재값이 배열의 마지막 값이면, 첫번째 값으로 설정함. 
                if(i == currGroupMemberArr.length - 1){
                    currStudyDataNum = currGroupMemberArr[0];
                }else{
                    currStudyDataNum = currGroupMemberArr[i+1];
                }
                loadValue(currStudyDataNum);
                
                // "PLAY R" 상태에서 다음 버튼 누르면 종료하고 재실행하도록 함. 
                if(btnPlayRepeat.textContent == "STOP"){
                    togglePlayStop();
                    togglePlayStop();
                }
                
            }else{
                // 그룹내 전체를 암기완료하면 아래 표시함. 
                document.getElementById('studyState').innerHTML = "축하! 축하! 모두 암기 완료"
            }
            // 현재 상태를 Firebase에 저장함 : 나중에 불러올때 여기부터 시작하도록 함. 
            saveToFirebase();
            findDateStudyState();  // 일자별 공부 현황 Load 하기 
            if (showScriptMode){ // 자막 보이기 모드이면 자막을 보여라. 
                showScriptOn();
            }else{
                showScriptOff();
            }
            if (showScriptModeKor){ // 한국어 자막 보이기 모드이면 한국어 자막을 보여라. 
                showKorScriptOn();
            }else{
                showKorScriptOff();
            }
            if(studyLang == "song"){  // 노래모드 이면 
                showScriptOn();  // script를 보이지 않게 함. 
            }
            
        }
    }
    if(studyLang == "chapter" && isKorScriptShow == true){  // chapter 모드 이면 
        showKorScriptToggle();  // 한글 script를 보이지 않게 함. 
    }

    if(studyLang == "korea"){  // 한국어 모드이면 
        showKorScriptToggle();  // 한국어 보이게 함. 
    }
    // AI번역기 내용 지우기
    document.getElementById('script_korean_llm').innerHTML = "";
        
}

// 이전 버튼 클릭시 암기 완료된 것은 건너 뛰도록 함.
function prebValue(){
    if(currGroupMemberArr.length === 0){
        showPopup("이미 모두 암기 완료된 그룹입니다. 초기화 후에 이용해 주세요.");
        return;
    }
    if(btnPlayRepeat.textContent == "STOP"){  // "PLAY R" 모드인 경우에
        togglePlayStop();  // PLAY R 모드를 중지 시킨 후에 처리 
        if (isPlaying) {
            myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
            isPlaying = false;
        }
        
        // 그룹 값이 1개이면 처리 안함
        if(currGroupMemberArr.length != 1){
            if(currGroupMemberArr.length != 0){
                let i = currGroupMemberArr.indexOf(currStudyDataNum);
                // 현재 값이 첫번째 값이면, 배열의 마지막 값으로 설정함. 
                if(i == 0){
                    currStudyDataNum = currGroupMemberArr[currGroupMemberArr.length -1];
                }else{
                    currStudyDataNum = currGroupMemberArr[i-1];
                }
                loadValue(currStudyDataNum);
                // "PLAY R" 상태에서 이전 버튼 누르면 종료하고 재실행하도록 함. 
                if(btnPlayRepeat.textContent == "STOP"){
                    togglePlayStop();
                    togglePlayStop();
                }
            }else{
                // 그룹내 전체를 암기완료하면 아래 표시함. 
                document.getElementById('studyState').innerHTML = "축하! 축하! 모두 암기 완료"
            }
            // 현재 상태를 Firebase에 저장함 : 나중에 불러올때 여기부터 시작하도록 함. 
            saveToFirebase();
            findDateStudyState();  // 일자별 공부 현황 Load 하기 
            if (showScriptMode){ // 자막 보이기 모드이면 자막을 보여라. 
                showScriptOn();
            }else{
                showScriptOff();
            }
            if (showScriptModeKor){ // 한국어 자막 보이기 모드이면 한국어 자막을 보여라. 
                showKorScriptOn();
            }else{
                showKorScriptOff();
            }
            if(studyLang == "song"){  // 노래모드 이면 
                showScriptOn();  // script를 보이지 않게 함. 
            }
        }
        togglePlayStop();  // PLAY R 모드를 다시 동작시킴 
    }else{
        if (isPlaying) {
            myAudio.pause();  // 기존에 플레이되고 있는게 있으면 중지 시킨다.
            isPlaying = false;
        }
        
        // 그룹 값이 1개이면 처리 안함
        if(currGroupMemberArr.length != 1){
            if(currGroupMemberArr.length != 0){
                let i = currGroupMemberArr.indexOf(currStudyDataNum);
                // 현재 값이 첫번째 값이면, 배열의 마지막 값으로 설정함. 
                if(i == 0){
                    currStudyDataNum = currGroupMemberArr[currGroupMemberArr.length -1];
                }else{
                    currStudyDataNum = currGroupMemberArr[i-1];
                }
                loadValue(currStudyDataNum);
                // "PLAY R" 상태에서 이전 버튼 누르면 종료하고 재실행하도록 함. 
                if(btnPlayRepeat.textContent == "STOP"){
                    togglePlayStop();
                    togglePlayStop();
                }
            }else{
                // 그룹내 전체를 암기완료하면 아래 표시함. 
                document.getElementById('studyState').innerHTML = "축하! 축하! 모두 암기 완료"
            }
            // 현재 상태를 Firebase에 저장함 : 나중에 불러올때 여기부터 시작하도록 함. 
            saveToFirebase();
            findDateStudyState();  // 일자별 공부 현황 Load 하기 
            if (showScriptMode){ // 자막 보이기 모드이면 자막을 보여라. 
                showScriptOn();
            }else{
                showScriptOff();
            }
            if (showScriptModeKor){ // 한국어 자막 보이기 모드이면 한국어 자막을 보여라. 
                showKorScriptOn();
            }else{
                showKorScriptOff();
            }
            if(studyLang == "song"){  // 노래모드 이면 
                showScriptOn();  // script를 보이지 않게 함. 
            }
        }
    }
    if(studyLang == "chapter" && isKorScriptShow == true){  // chapter 모드 이면 
        showKorScriptToggle();  // 한글 script를 보이지 않게 함. 
    }
    if(studyLang == "korea"){  // 한국어 모드이면 
        showKorScriptToggle();  // 한국어 보이게 함. 
    }
    // AI번역기 내용 지우기
    document.getElementById('script_korean_llm').innerHTML = "";
}

// Helper function to find the first unfinished item in a chapter
function findFirstUnfinishedInChapter(chapterName) {
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name === chapterName && studyData[i].finish === 'no') {
            return i;
        }
    }
    return -1; // Not found
}

// Helper function to find the very first item in a chapter
function findFirstItemInChapter(chapterName) {
    for (let i = 0; i < studyData.length; i++) {
        if (studyData[i].book_name === currBookName && studyData[i].chapter_name === chapterName) {
            return i;
        }
    }
    return -1; // Not found
}

// 이전 챕터로 이동
async function prevChapter(option) {
    // 전역 chapterList를 사용합니다. 이 리스트는 checkChapter()에 의해 채워집니다.
    if (chapterList.length <= 1) {
        showPopup("현재 Chapter에 Chapter가 하나뿐입니다.");
        return;
    }

    // studyData[currStudyDataNum] 접근 대신 전역 변수 currChapterName 사용 (TypeError 방지)
    const currentChapterIndex = chapterList.indexOf(currChapterName);

    let prevChapterIndex = currentChapterIndex - 1;
    if (prevChapterIndex < 0) {
        prevChapterIndex = chapterList.length - 1;
    }
    const prevChapterName = chapterList[prevChapterIndex];

    if (option === "doubleTouch") {
        initializeChapter(prevChapterName, 3); // 암기제외 포함 초기화
        showPopup(`'${prevChapterName}' Chapter를 초기화했습니다.`);
    }

    // 중요: 챕터 이름을 먼저 변경해야 이후 로직이 정상 동작함
    currChapterName = prevChapterName;
    // [오류 수정] 이전 챕터의 완료 날짜 정보가 새 챕터로 복사되는 것을 방지하기 위해 데이터를 동기화합니다.
    chapterStudyFinishDate = myChapterList[currChapterName]?.finishDates || "";

    let studyNum = findFirstUnfinishedInChapter(prevChapterName);
    if (studyNum === -1) {
        // 학습할 내용이 없는 경우 초기화 팝업 안내
        showConfirmationModal(
            `'${prevChapterName}' 챕터의 모든 항목이 완료되었습니다. 초기화 후 다시 학습하시겠습니까?`,
            async () => {
                initializeChapter(prevChapterName, 2); // 암기제외 유지하고 초기화
                await groupReassign();
                loadValue(currStudyDataNum);
                saveToFirebase();
            }
        );
        return;
    }
    
    if (studyNum !== -1) {
        currStudyDataNum = studyNum;

        // [수정] 무거운 groupReassign() 대신 기존 studyData의 group 정보를 활용하여 상태 동기화
        let maxGroup = 1;
        studyData.forEach(item => {
            if (item.book_name === currBookName && item.chapter_name === currChapterName) {
                let g = parseInt(item.group) || 1;
                if (g > maxGroup) maxGroup = g;
            }
        });
        totalGroupCount = maxGroup;

        // 저장된 그룹 번호를 찾아 그룹 멤버 배열(currGroupMemberArr) 갱신
        let targetGroup = parseInt(studyData[currStudyDataNum].group) || 1;
        findGroupMember(targetGroup, currStudyDataNum);

        loadValue(currStudyDataNum);
        saveToFirebase();
    } else {
        showPopup(`'${prevChapterName}' Chapter에 학습할 내용이 없습니다.`);
    }
}

// 다음 챕터로 이동
async function nextChapter(option) {
    // 전역 chapterList를 사용합니다. 이 리스트는 checkChapter()에 의해 채워집니다.
    if (chapterList.length <= 1) {
        showPopup("현재 Chapter에 Chapter가 하나뿐입니다.");
        return;
    }

    // TypeError 방지를 위해 currChapterName 사용
    const currentChapterIndex = chapterList.indexOf(currChapterName);

    const nextChapterIndex = (currentChapterIndex + 1) % chapterList.length;
    const nextChapterName = chapterList[nextChapterIndex];

    if (option === "doubleTouch") {
        initializeChapter(nextChapterName, 3); // 암기제외 포함 초기화
        showPopup(`'${nextChapterName}' Chapter를 초기화했습니다.`);
    }

    // 중요: 챕터 이름을 먼저 변경
    currChapterName = nextChapterName;
    // [오류 수정] 이전 챕터의 완료 날짜 정보가 새 챕터로 복사되는 것을 방지하기 위해 데이터를 동기화합니다.
    chapterStudyFinishDate = myChapterList[currChapterName]?.finishDates || "";

    let studyNum = findFirstUnfinishedInChapter(nextChapterName);
    if (studyNum === -1) {
        // 학습할 내용이 없는 경우 초기화 팝업 안내
        showConfirmationModal(
            `'${nextChapterName}' 챕터의 모든 항목이 완료되었습니다. 초기화 후 다시 학습하시겠습니까?`,
            async () => {
                initializeChapter(nextChapterName, 2); // 암기제외 유지하고 초기화
                await groupReassign();
                loadValue(currStudyDataNum);
                saveToFirebase();
            }
        );
        return;
    }
    
    if (studyNum !== -1) {
        currStudyDataNum = studyNum;

        // [수정] 기존 studyData 정보를 기반으로 변수 동기화
        let maxGroup = 1;
        studyData.forEach(item => {
            if (item.book_name === currBookName && item.chapter_name === currChapterName) {
                let g = parseInt(item.group) || 1;
                if (g > maxGroup) maxGroup = g;
            }
        });
        totalGroupCount = maxGroup;

        let targetGroup = parseInt(studyData[currStudyDataNum].group) || 1;
        findGroupMember(targetGroup, currStudyDataNum);

        loadValue(currStudyDataNum);
        saveToFirebase();
    } else {
        showPopup(`'${nextChapterName}' Chapter에 학습할 내용이 없습니다.`);
    }
}


// Number, mp3 영역을 탭하면 외국어 play, 더블탭하면 암기완료 처리 및 다음곡 재생
// 좌우스와이프하면 왼쪽, 오른쪽에 따라 다음, 이전 곡으로 이동 및 외국어 play
// 아래 스와이프 : 스크립트 보이기, 위 스와이프 : 스크립트 감추기

document.addEventListener('DOMContentLoaded', function () {
    let numClicks = 0;
    let lastTapTime = 0;

    let touchArea = document.getElementById('myForeignTouch');
    let touchScriptArea = document.getElementById('myScriptTouch');
    let btn_prevChapter = document.getElementById('btn_prevChapter');
    let btn_prevChapter2 = document.getElementById('btn_prevChapter2');
    let btn_nextChapter = document.getElementById('btn_nextChapter');
    let btn_nextChapter2 = document.getElementById('btn_nextChapter2');

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // touchScriptArea 전용 터치 시작/끝 좌표 변수 추가
    let touchScriptStartX = 0;
    let touchScriptStartY = 0;
    let touchScriptEndX = 0;
    let touchScriptEndY = 0;

    let swipeThreshold = 30;
    let timeOut;

    // 터치 이동 시 기본 스크롤 동작 막기
    touchArea.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });

    touchArea.addEventListener('click', function () {
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;
        lastTapTime = currentTime;

        if (tapInterval < 500 && tapInterval > 0) {
            numClicks = 2;
        } else {
            numClicks = 1;
            setTimeout(function () {
                if (numClicks === 1) {
                    if (btnPlayRepeat.textContent == "STOP") {
                        // 1곡 반복중에는 아무것도 안함.
                    } else {
                        if(btnPlayOne.textContent != "STOP"){
                            timeOut = setTimeout("playMp3B()", 500);
                        } else {
                            myAudio.pause();
                            myAudio.currentTime = 0;
                            isPlaying = false;
                            btnPlayOne.textContent = "PLAY";
                        }
                    }
                }
                numClicks = 0;
            }, 500);
        }

        switch (numClicks) {
            case 2:
                if (btnPlayRepeat.textContent == "STOP") {
                } else if (btnPlayOne.textContent == "STOP") {
                    myAudio.pause();
                    myAudio.currentTime = 0;
                    isPlaying = false;
                    btnPlayOne.textContent = "PLAY";
                    changeToYes();
                } else {
                    changeToYes();
                    timeOut = setTimeout("playMp3B()", 500);
                }
                numClicks = 0;
                break;
        }
    });

    touchArea.addEventListener('touchstart', function (event) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });

    touchArea.addEventListener('touchend', function (event) {
        touchEndX = event.changedTouches[0].clientX;
        touchEndY = event.changedTouches[0].clientY;

        let swipeDistanceX = touchEndX - touchStartX;
        let swipeDistanceY = touchEndY - touchStartY;

        // 좌우 스와이프 인식
        if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY) && Math.abs(swipeDistanceX) > swipeThreshold) {
            if (swipeDistanceX > 0) {
                prebValue();
                if (composeMode) {
                    showKorScriptOnAndPlay();
                } else if (!isPlaying) {
                    playMp3B();
                }
                if(studyLang == "korea"){
                    showKorScriptToggle();
                }
            } else {
                nextValue();
                if (composeMode) {
                    showKorScriptOnAndPlay();
                } else if (!isPlaying) {
                    playMp3B();
                }
                if(studyLang == "korea"){
                    showKorScriptToggle();
                }
            }
        }
        // 상하 스와이프 인식
        else if (Math.abs(swipeDistanceY) > swipeThreshold) {
            if (swipeDistanceY > 0) {
                showScriptOn();
            } else {
                showScriptOff();
            }
        }

    }, { passive: true });

    touchScriptArea.addEventListener('touchstart', function (event) {
        touchScriptStartX = event.touches[0].clientX;
        touchScriptStartY = event.touches[0].clientY;
    }, { passive: true });

    touchScriptArea.addEventListener('touchend', function (event) {
        touchScriptEndX = event.changedTouches[0].clientX;
        touchScriptEndY = event.changedTouches[0].clientY;

        // 여기를 수정합니다: touchScriptArea 전용 변수 사용
        let swipeDistanceX = touchScriptEndX - touchScriptStartX;
        let swipeDistanceY = touchScriptEndY - touchScriptStartY;

        // 좌우 스와이프 인식
        if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY) && Math.abs(swipeDistanceX) > swipeThreshold) {
            if (swipeDistanceX > 0) {
                prebValue();
                if (composeMode) {
                    showKorScriptOnAndPlay();
                } else if (!isPlaying) {
                    playMp3B();
                }
                if(studyLang == "korea"){
                    showKorScriptToggle();
                }
            } else {
                nextValue();
                if (composeMode) {
                    showKorScriptOnAndPlay();
                } else if (!isPlaying) {
                    playMp3B();
                }
                if(studyLang == "korea"){
                    showKorScriptToggle();
                }
            }
        }

    }, { passive: true });

    // 이전 챕터 클릭시 처리
    btn_prevChapter.addEventListener('click', function () {
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;
        lastTapTime = currentTime;

        if (tapInterval < 500 && tapInterval > 0) {
            numClicks = 2;
            clearTimeout(timeOut);
        } else {
            numClicks = 1;
            setTimeout(function () {
                if (numClicks === 1) {
                    prevChapter();
                }
                numClicks = 0;
            }, 500);
        }

        switch (numClicks) {
            case 2:
                prevChapter("doubleTouch");
                numClicks = 0;
                break;
        }
    });

    // PLAY A에서 이전 챕터 클릭시 동작
    btn_prevChapter2.addEventListener('click', function () {
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;
        lastTapTime = currentTime;

        if (tapInterval < 500 && tapInterval > 0) {
            numClicks = 2;
            clearTimeout(timeOut);
        } else {
            numClicks = 1;
            setTimeout(function () {
                if (numClicks === 1) {
                    prevChapter();
                }
                numClicks = 0;
            }, 500);
        }

        switch (numClicks) {
            case 2:
                prevChapter("doubleTouch");
                numClicks = 0;
                break;
        }
    });

    // 다음 챕터 클릭시 동작
    btn_nextChapter.addEventListener('click', function () {
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;
        lastTapTime = currentTime;

        if (tapInterval < 500 && tapInterval > 0) {
            numClicks = 2;
            clearTimeout(timeOut);
        } else {
            numClicks = 1;
            setTimeout(function () {
                if (numClicks === 1) {
                    nextChapter();
                }
                numClicks = 0;
            }, 500);
        }

        switch (numClicks) {
            case 2:
                nextChapter("doubleTouch");
                numClicks = 0;
                break;
        }
    });

    // PLAY A에서 다음 챕터 클릭시 동작
    btn_nextChapter2.addEventListener('click', function () {
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - lastTapTime;
        lastTapTime = currentTime;

        if (tapInterval < 500 && tapInterval > 0) {
            numClicks = 2;
            clearTimeout(timeOut);
        } else {
            numClicks = 1;
            setTimeout(function () {
                if (numClicks === 1) {
                    nextChapter();
                }
                numClicks = 0;
            }, 500);
        }

        switch (numClicks) {
            case 2:
                nextChapter("doubleTouch");
                numClicks = 0;
                break;
        }
    });

});
