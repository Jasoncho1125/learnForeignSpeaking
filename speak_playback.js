// Audio 객체 설정
const btnPlayOne = document.getElementById('btnPlayOne');
const btnPlayRepeat = document.getElementById('btnPlayRepeat');
//const myAudio = document.getElementById('myAudio');
let myAudio = document.getElementById('myAudio');
let isPlaying = false;  // play 토글 버튼에 사용하기 위한 변수
let timerVar1, playOneTimeout;  

// Blob URL을 저장할 객체
let blobUrls = {};

// MP3를 안정적으로 로드하는 함수
async function loadAudio(url, retryCount = 2) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error");

        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);

        // Blob URL 저장
        blobUrls[url] = objectURL;

        return objectURL;
    } catch (error) {
        console.error("MP3 파일 로드 실패:", error);
        
        if (retryCount > 0) {
            console.log("MP3 로딩 재시도 중...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            return loadAudio(url, retryCount - 1);
        } else {
            alert("MP3 로딩에 실패했습니다. 네트워크 상태를 확인하세요.");
            throw error;
        }
    }
}

// Blob URL 해제 함수
function releaseBlobUrl(url) {
    if (blobUrls[url]) {
        URL.revokeObjectURL(blobUrls[url]);
        delete blobUrls[url];
    }
}

// 초기화 버튼에서 PLAY 눌렀을때 처리
async function playMp3B_PLAY() {
    if (btnPlayOne.textContent != "STOP") {
        playOneTimeout = setTimeout(() => playMp3B(), 500);
    } else {
        myAudio.pause();
        myAudio.currentTime = 0;
        isPlaying = false;
        btnPlayOne.textContent = "PLAY";
    }
}


// ===== 전역 변수 =====
let lastPlayCallId = 0; // 가장 최근의 재생 요청을 구분하기 위한 ID
let currentAudioOriginalUrl = null; // 현재 재생 중인 오디오의 원본 URL 저장

// ===== playMp3B 함수 개선 (canplaythrough 이벤트 활용) =====
async function playMp3B() {
    if(totalGroupCount == 0) {
        alert("이미 학습 완료한 Chapter입니다. 현재 Chapter을 초기화한 이후에 학습해 주세요.");
        return;
    }
    
    const thisCallId = ++lastPlayCallId;
    // handleCanPlayThrough를 try-catch 블록 외부에서 접근할 수 있도록 선언
    let handleCanPlayThrough;
    
    if (isPlaying) {
        myAudio.pause();
        myAudio.loop = false; // 반복 재생 해제
        myAudio.currentTime = 0;
        if (currentAudioOriginalUrl) {
            releaseBlobUrl(currentAudioOriginalUrl);
            currentAudioOriginalUrl = null;
        }
        // 이전 이벤트 핸들러 제거 (중요)
        // 다음 재생 시 새로운 canplaythrough 리스너가 추가되므로, 이전 리스너는 제거합니다.
        myAudio.onended = null; 
        isPlaying = false;
    }

    if (mp3PlayMode == false) return;

    // 학습할 데이터가 유효한지 확인 (TypeError 방지)
    if (!studyData || studyData[currStudyDataNum] === undefined) {
        return;
    }
    
    const mp3Path = "/mp3/" + studyData[currStudyDataNum].mp3_foreign;
    
    try {
        const blobUrl = await loadAudio(mp3Path);
        
        if (thisCallId !== lastPlayCallId) {
            releaseBlobUrl(mp3Path);
            return;
        }
        
        myAudio.src = blobUrl;
        myAudio.loop = false; // 단일 재생이므로 루프 해제
        currentAudioOriginalUrl = mp3Path;
        
        // canplaythrough 이벤트 핸들러 정의 (함수 형태로 분리)
        handleCanPlayThrough = () => {
            // 이 요청이 최신 요청이고, src가 일치하는지 다시 확인
            if (thisCallId === lastPlayCallId && myAudio.src === blobUrl) {
                myAudio.play();
                btnPlayOne.textContent = "STOP";
                isPlaying = true;
                
                updateStudyCountInfo('play');
                if(!isSleepMode) {
                    studyData[currStudyDataNum].test_count++;
                }
                updateTestCount();
                numplayCount = 0;
                if (showScriptMode){
                    showScriptOn();
                }else{
                    showScriptOff();
                }
                requestWakeLock();
            }
            // 이벤트 리스너 제거 (한번 사용 후 제거)
            myAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
        };

        // canplaythrough 이벤트 리스너 추가
        myAudio.addEventListener('canplaythrough', handleCanPlayThrough);
        
        // 오디오 재생 종료 시 처리
        myAudio.onended = () => {
            if (thisCallId === lastPlayCallId) {
                releaseBlobUrl(mp3Path);
                currentAudioOriginalUrl = null;
                // onended 발생 시에도 canplaythrough 리스너 제거 (안전성 위해)
                myAudio.removeEventListener('canplaythrough', handleCanPlayThrough); 
                handleSinglePlayEnd();
            }
        };

        // myAudio.load()를 명시적으로 호출하여 로딩 시작을 보장
        myAudio.load();

    } catch (error) {
        if (thisCallId === lastPlayCallId) {
            console.error("재생 오류:", error);
            btnPlayOne.textContent = "PLAY";
            isPlaying = false;
            // 에러 발생 시에도 canplaythrough 리스너 제거 (안전성 위해)
            if (handleCanPlayThrough) {
                myAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
            }
        }
    }
}

// 한국어 1회만 재생
async function playMp3A() {
    if(currGroupMemberArr.length === 0){
        showPopup("암기 대상이 없습니다. 초기화 후에 시작해 주세요.")
        return;
    }
    if(totalGroupCount == 0) {
        alert("이미 학습 완료한 Chapter입니다. 현재 Chapter을 초기화한 이후에 학습해 주세요.");
        return;
    }
    
    const mp3Path = "/mp3/" + studyData[currStudyDataNum].mp3_korean;
    
    try {
        const blobUrl = await loadAudio(mp3Path);
        
        myAudio.src = blobUrl;
        myAudio.onended = () => {
            releaseBlobUrl(mp3Path);
            handleSinglePlayEnd();
        };
        
        myAudio.play();
        btnPlayOne.textContent = "STOP";
        isPlaying = true;
    } catch (error) {
        console.error("재생 오류:", error);
    }
}

// 단일 mp3 재생 종료 핸들러
function handleSinglePlayEnd() {
    isPlaying = false;
    btnPlayOne.textContent = "PLAY";
    myAudio.removeEventListener("ended", handleSinglePlayEnd); // 자기 자신 제거
}

//////////////////////////////////////////////////////////
// "PLAY R" 버튼 클릭시 동작 => 한개 mp3를 문한 반복
function togglePlayStop() {
    if (!currGroupMemberArr || currGroupMemberArr.length === 0) {
        showPopup("암기 대상이 없습니다. 초기화 후에 시작해 주세요.");
        return;
    }

    if (totalGroupCount === 0) {
        alert("이미 학습 완료한 Chapter입니다. 현재 Chapter을 초기화한 이후에 학습해 주세요.");
        return;
    }

    // 화면이 꺼지지 않도록 NoSleep 기능 활성화
    requestWakeLock();

    // 재생할 데이터가 유효한지 확인
    if (!studyData || studyData[currStudyDataNum] === undefined) {
        return;
    }

    const mp3Path = "/mp3/" + studyData[currStudyDataNum].mp3_foreign;

    if (!isPlaying) {
        // 오디오 파일 로드 및 재생
        loadAudio(mp3Path)
            .then((blobUrl) => {
                // 기존 Audio 객체를 해제하고 새로 생성
                myAudio.pause();
                myAudio.src = blobUrl;
                myAudio.loop = true; // 반복 재생 설정

                myAudio.onended = () => {
                    if (isPlaying) {
                        myAudio.currentTime = 0; // 다시 처음부터 재생
                        myAudio.play();
                    }
                };

                myAudio.play()
                    .then(() => {
                        btnPlayRepeat.textContent = "STOP";
                        isPlaying = true;

                        if (!isSleepMode) {
                            studyData[currStudyDataNum].test_count++;
                        }
                        updateTestCount();

                        if (showScriptMode) {
                            showScriptOn();
                        } else {
                            showScriptOff();
                        }
                    })
                    .catch((error) => console.error("재생 오류:", error));
            })
            .catch((error) => {
                console.error("MP3 로드 실패:", error);
                btnPlayRepeat.textContent = "PLAY R";
                isPlaying = false;
            });
    } else {
        // 오디오 정지 및 상태 초기화
        stopAudio(mp3Path);
    }
}

// PLAY R에서 오디오 정지 및 Blob URL 해제 함수
function stopAudio(mp3Path) {
    if (myAudio) {
        myAudio.pause();
        myAudio.currentTime = 0;
        releaseBlobUrl(mp3Path); // Blob URL 해제
    }
    btnPlayRepeat.textContent = "PLAY R";
    isPlaying = false;
    showScriptOff();
}

/////////////////////////////////////////////////////////////
// "PLAY A" 선택 그룹내 전체 mp3를 무한 반복 play 하는 기능 구현

// ========================
// MP3 사전 로딩(Preloading) 기능 추가
// ========================

// 사전 로딩 대기열(Queue)
const preloadQueue = [];
let isPreloading = false;

// 다음 MP3를 미리 다운로드하는 함수
async function preloadNextMp3() {
    // 대기열이 비었거나 이미 사전로딩 중이면 아무것도 하지 않음
    if (preloadQueue.length === 0 || isPreloading) return;
    
    isPreloading = true;
    const { path, type } = preloadQueue.shift();
    
    try {
        // 실제 MP3 파일을 미리 다운로드
        await loadAudio(path);
        console.log(`사전로딩 완료: ${type} MP3 (${path})`);
    } catch (error) {
        console.error(`사전로딩 실패: ${path}`, error);
    } finally {
        isPreloading = false;
        // 다음 대기 중인 MP3도 계속 사전로딩
        preloadNextMp3();
    }
}

// 특정 아이템의 MP3를 사전로딩 대기열에 추가하는 함수
function schedulePreload(itemId) {
    const item = studyData[itemId];
    const filesToPreload = [];
    // koreaPlay 옵션에 따라 한국어 파일 사전로딩
    if (koreaPlay && item.mp3_korean) {
        filesToPreload.push({ path: `/mp3/${item.mp3_korean}`, type: 'Korean' });
    }
    // 외국어 파일 사전로딩
    if (item.mp3_foreign) {
        filesToPreload.push({ path: `/mp3/${item.mp3_foreign}`, type: 'Foreign' });
    }
    // 대기열에 추가 및 사전로딩 시작
    preloadQueue.push(...filesToPreload);
    if (!isPreloading) preloadNextMp3();
}

let changeMp3 = false;
let intervalTimer;
const btnPlayAll = document.getElementById('btnPlayAll');
const btnStopAll = document.getElementById('btn_stopAll');

// =========================
// MP3 Preload Queue 관리
// =========================
const MP3_PRELOAD_SIZE = 3;
const mp3PreloadQueue = []; // { path: string, blobUrl: string }
const mp3PreloadMap = new Map(); // path => blobUrl

/**
 * MP3 파일을 사전로딩 큐에 추가 (최대 3개)
 * 이미 큐에 있으면 재다운로드하지 않음
 * @param {string} songPath
 */
async function schedulePreload(songPath) {
    if (!songPath) return;
    // 이미 큐에 있으면 패스
    if (mp3PreloadMap.has(songPath)) {
        //console.log(`[MP3 Preload] Already in queue: ${songPath}`);
        printMp3Queue();
        return;
    }
    // 큐가 3개 이상이면 가장 오래된 것 제거
    if (mp3PreloadQueue.length >= MP3_PRELOAD_SIZE) {
        const removed = mp3PreloadQueue.shift();
        if (removed) {
            URL.revokeObjectURL(removed.blobUrl);
            mp3PreloadMap.delete(removed.path);
            //console.log(`[MP3 Preload] Removed from queue: ${removed.path}`);
        }
    }
    // 서버에서 다운로드
    try {
        const blobUrl = await loadAudio(songPath); // 기존 함수 사용
        mp3PreloadQueue.push({ path: songPath, blobUrl });
        mp3PreloadMap.set(songPath, blobUrl);
        //console.log(`[MP3 Preload] Preloaded: ${songPath}`);
    } catch (e) {
        console.warn(`[MP3 Preload] Failed to preload: ${songPath}`, e);
    }
    printMp3Queue();
}

/**
 * 현재 MP3 사전로딩 큐 상태를 콘솔에 출력
 */
function printMp3Queue() {
    console.log(`[MP3 Preload Queue] Current queue:`);
    mp3PreloadQueue.forEach((item, idx) => {
        console.log(`  ${idx + 1}: ${item.path}`);
    });
}

/**
 * 사전로딩 큐에서 해당 mp3의 blobUrl을 가져옴 (없으면 null)
 * @param {string} songPath
 * @returns {string|null}
 */
function getPreloadedBlobUrl(songPath) {
    return mp3PreloadMap.get(songPath) || null;
}

// =========================
// 전체 그룹 mp3 Play
// =========================

async function toggleAllPlay() {
    if(currGroupMemberArr.length === 0){
        showPopup("암기 대상이 없습니다. 초기화 후에 시작해 주세요.")
        return;
    }
    if(totalGroupCount == 0){
        let userChoice = confirm("초기화를 해야 학습이 가능합니다. 초기화 하시겠습니까?");
        if(userChoice){
            await checkChapter();
            yesCountInChapter = 0;
            initializeChapter(2);
            currStudyDataNum = findFirstStudyNoFinishDataInChapter();
            engCountInTotal = countYesNoInChapter(currChapterName);
            await groupReassignAll();
            currGroupNum = 1;
            totalGroupCount = myChapterList[currChapterName].totalGroupCount;
            findGroupMember(currGroupNum);
            myChapterInfo.currChapterName = currChapterName;
            saveToFirebase();
        } else {
            return;
        }
    }
    requestWakeLock();
    showScriptOff();
    myAudio.pause();
    btnPlayAll.textContent = "STOP";
    document.getElementById("show-default-button").style.display = "none";
    document.getElementById("show-playall-button").style.display = "block";
    koreaPlaySwitchShow = false;
    toggleKoreaPlaySwitchElement();
    // showTransButtonOff();
    showPlayCount(true);
    showForeignNoSoundLength(true);
    await playGroupMp3s();  // 그룹내 모든 mp3를 순차적으로 play 한다. 
    if(studyLang == "chapter" && isKorScriptShow == true){
        showKorScriptOn();
    }
    if(studyData[currStudyDataNum].image){
        let src = "/image/" + studyData[currStudyDataNum].image;
        showImage(src);
    } else {
        hideImage();
    }
}

// 해당 그룹내 전체 mp3 Play를 종료시킨다
async function toggleAllStop() {
    showScriptOff();
    myAudio.pause();
    if(isSleepMode){
        sleepMode('end');
    }

    btnPlayAll.textContent = "PLAY A";
    document.getElementById('script_a_large').innerHTML = "";
    document.getElementById('script_b_large').innerHTML = "";
    document.getElementById('pronounce_large').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "";
    document.getElementById('explain').innerHTML = "";
    myAudio.currentTime = 0;
    document.getElementById("show-default-button").style.display = "block";
    document.getElementById("show-playall-button").style.display = "none";

    clearTimeout(timerVar1);
    koreaPlaySwitchShow = true;
    toggleKoreaPlaySwitchElement();
    showPlayCount(false);
    showForeignNoSoundLength(false);
    loadValue(currStudyDataNum);
    releaseWakeLock();
}

// ========================
// playGroupMp3s 함수 내 사전로딩 적용
// ========================

const playGroupMp3s = async () => {
    let currentSongPath;
    if (!defaultPlayCount) defaultPlayCount = 1;
    let playCount = defaultPlayCount;
    let indexOfGroup = currGroupMemberArr.indexOf(currStudyDataNum);

    // 최초 3개 사전로딩
    for (let i = 1; i <= MP3_PRELOAD_SIZE; i++) {
        const preloadIdx = (indexOfGroup + i) % currGroupMemberArr.length;
        const preloadItem = currGroupMemberArr[preloadIdx];
        const preloadPath = "/mp3/" + studyData[preloadItem].mp3_foreign;
        schedulePreload(preloadPath);
    }

    while (true) {
        if (btnPlayAll.textContent == "PLAY A") {
            clearTimeout(timerVar1);
            stopAudio(currentSongPath);
            break;
        }
        showCurrStudyBar(currStudyDataNum);

        // 다음 3개 미리 사전로딩
        for (let i = 1; i <= MP3_PRELOAD_SIZE; i++) {
            const preloadIdx = (indexOfGroup + i) % currGroupMemberArr.length;
            const preloadItem = currGroupMemberArr[preloadIdx];
            const preloadPath = "/mp3/" + studyData[preloadItem].mp3_foreign;
            schedulePreload(preloadPath);
        }

        // ======== 이하 기존 로직 그대로 유지 ========
        if (foreignFirst == false) {
            // 한글 먼저 재생
            if (koreaPlay == true) {
                currentSongPath = "/mp3/" + studyData[currStudyDataNum].mp3_korean;
                let isKoreanMp3Exist = true;
                if (studyData[currStudyDataNum].mp3_korean === undefined) {
                    isKoreanMp3Exist = false;
                    alert("한글 파일이 없습니다. 설정에서 Korea Play를 Off하세요.");
                }
                if (isKoreanMp3Exist == true) {
                    showPlayGroupDiscriptionOff();
                    showPlayGroupDiscriptionKor();
                    updateTestCount();
                    await playMp3(currentSongPath);
                    await sleepMiliSecond(myAudio.duration * 1000 * forNoSoundLength);
                }
            }
            for (let j = 0; j < playCount; j++) {
                if (playCount != defaultPlayCount) {
                    playCount = defaultPlayCount;
                }
                document.getElementById('explain').innerHTML = "";
                document.getElementById('script_a_llm').innerHTML = "";
                currentSongPath = "/mp3/" + studyData[currStudyDataNum].mp3_foreign;
                showPlayGroupDiscription();
                if (!isSleepMode) {
                    studyData[currStudyDataNum].test_count++;
                }
                updateTestCount();
                updateStudyCountInfo('play');
                await playMp3(currentSongPath);
                await sleepMiliSecond(myAudio.duration * 1000 * forNoSoundLength);
                saveToFirebase();
            }
        } else {
            // 외국어 먼저 재생
            for (let j = 0; j < playCount; j++) {
                if (playCount != defaultPlayCount) {
                    playCount = defaultPlayCount;
                }
                document.getElementById('explain').innerHTML = "";
                document.getElementById('script_a_llm').innerHTML = "";
                currentSongPath = "/mp3/" + studyData[currStudyDataNum].mp3_foreign;
                showPlayGroupDiscriptionOff();
                showPlayGroupDiscriptionFor();

                if (!isSleepMode) {
                    studyData[currStudyDataNum].test_count++;
                }
                updateTestCount();
                updateStudyCountInfo('play');
                await playMp3(currentSongPath);
                await sleepMiliSecond(myAudio.duration * 1000 * forNoSoundLength);
                saveToFirebase();
            }
            if (koreaPlay == true) {
                currentSongPath = "/mp3/" + studyData[currStudyDataNum].mp3_korean;
                let isKoreanMp3Exist = true;
                if (studyData[currStudyDataNum].mp3_korean === undefined) {
                    isKoreanMp3Exist = false;
                    alert("한글 파일이 없습니다. 설정에서 Korea Play를 Off하세요.");
                }
                if (isKoreanMp3Exist == true) {
                    showPlayGroupDiscription();
                    updateTestCount();
                    await playMp3(currentSongPath);
                    await sleepMiliSecond(myAudio.duration * 1000 * forNoSoundLength);
                }
            }
        }

        // 다음 mp3로 순서 변경
        if (indexOfGroup == currGroupMemberArr.length - 1) {
            currStudyDataNum = currGroupMemberArr[0];
            indexOfGroup = 0;
        } else {
            indexOfGroup++;
            currStudyDataNum = currGroupMemberArr[indexOfGroup];
        }
    }
};

// 일정 시간 동안 프로그램 실행을 중지 시키는 함수 => mp3 play 이후 따라하는 시간 주기
const sleepMiliSecond = (timeToDelay) => new Promise((resolve, reject) => {
    timerVar1 = setTimeout(() => {
        resolve("finished");
    }, timeToDelay);
});

/**
 * 지정된 MP3 파일을 재생하고 재생이 완료될 때까지 기다립니다.
 *
 * @param {string} songPath 재생할 MP3 파일의 경로.
 * @returns {Promise<void>} MP3 재생이 완료되면 resolve되는 Promise.
 */
async function playMp3(songPath){
    let mp3Length;
    myAudio.pause();

    // 사전로딩 큐에 있으면 blobUrl 사용, 없으면 loadAudio로 다운로드
    let blobUrl = getPreloadedBlobUrl(songPath);
    if (!blobUrl) {
        blobUrl = await loadAudio(songPath);
        // 다운로드한 blobUrl은 큐에 넣지 않음 (즉시 재생용)
    }
    myAudio.src = blobUrl;
    myAudio.currentTime = 0;
    try {
        await myAudio.play();
        mp3Length = myAudio.duration;
        if (mp3Length < 2) mp3Length = 2;
        await sleepMiliSecond(mp3Length * 1000);
    } finally {
        // 사전로딩 큐에 없는 경우만 해제
        if (!mp3PreloadMap.has(songPath)) {
            releaseBlobUrl(songPath);
        }
    }
};


// 그룹 play에서 한국어만 보여라. 
// showScriptModeKor -> 설정에서 한국어 보이기
function showPlayGroupDiscriptionKor(){
    if(showScriptModeKor == true){
        document.getElementById('script_a_large').innerHTML = studyData[currStudyDataNum].script_korean;
    }else{
        document.getElementById('script_a_large').innerHTML = "";
    }
    
}

// 그룹 play에서 외국어어만 보여라. 
function showPlayGroupDiscriptionFor(){
    document.getElementById('script_b_large').innerHTML = studyData[currStudyDataNum].script_foreign;
}

// 한국어 영어 다 보여라. 
function showPlayGroupDiscription(){
    if(showScriptModeKor == true){
        document.getElementById('script_a_large').innerHTML = studyData[currStudyDataNum].script_korean;
    }else{
        document.getElementById('script_a_large').innerHTML = "";
    }
    document.getElementById('script_b_large').innerHTML = studyData[currStudyDataNum].script_foreign;
    // 발음 정보가 있으면 추가함. 
    if (studyData[currStudyDataNum].pronounce) {
        document.getElementById('pronounce_large').innerHTML = studyData[currStudyDataNum].pronounce;
    }
    // 설명이 있으면 설명 추가함. 
    if (studyData[currStudyDataNum].explain) {
        document.getElementById('explain').innerHTML = studyData[currStudyDataNum].explain;
    }
    document.getElementById('studyState').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "mp3 : " + studyData[currStudyDataNum].mp3_foreign;
    document.getElementById('num').innerHTML = "";
}

// 한국어 영어 다 지워라.
function showPlayGroupDiscriptionOff(){
    document.getElementById('script_a_large').innerHTML = "";
    document.getElementById('script_b_large').innerHTML = "";
    document.getElementById('pronounce_large').innerHTML = "";
    document.getElementById('explain').innerHTML = "";
    document.getElementById('studyState').innerHTML = "";
    document.getElementById('mp3b').innerHTML = "mp3 : " + studyData[currStudyDataNum].mp3_foreign;
    document.getElementById('num').innerHTML = "";
    document.getElementById('script_a_llm').innerHTML = "";
}

// 외국어 mp3를 play하는 기능 구현
async function playNextMp3B() {
    myAudio.pause();
    showCurrStudyBar(currStudyDataNum);
    const mp3Path = "/mp3/" + studyData[currStudyDataNum].mp3_foreign;
    const blobUrl = await loadAudio(mp3Path, 3);
    myAudio.src = blobUrl;
    showPlayGroupDiscription();
    myAudio.play();

    // 0.1초마다 오디오 play 상황을 체크해서 아래 함수를 실행한다. 
    // 오디오가 90% 이상 play 되어야 다음 값으로 넘어가도록 함. 
    // 이걸 하지 않으면 완료 처리시 다음곡이 완료 처리 되는 현상 발생 
    intervalTimer = setInterval(updateAudioProgress, 100);
    //currStudyDataNum = imsiStudyNumArr;
    //console.log(currStudyDataNum);

    // requestScreenOn();  // 화면 켜짐 유지 요청하기 
}

// 오디오 재생 진행 상황 업데이트 함수
// 전체의 95% 이상 진행되어야 다음 값으로 이동하게 설정함
let imsiStudyNumArr;
function updateAudioProgress() {
    const currentTime = myAudio.currentTime * 1000; // 현재 재생 시간 (초 단위)
    //const duration = myAudio.duration * 1000; // 오디오 총 길이 (초 단위)
    const duration = getAudioDuration(myAudio); // 오디오 총 길이 (초 단위)
    //console.log("값비교 " + (currentTime + forNoSoundLength) + " : " + (duration + forNoSoundLength) * 0.9);
    //console.log("no sound" + forNoSoundLength);
    // 기존 play되는 오디오가 90% 재생 지점에 도달하면 현재곡의 값을 다음곡으로 변경함
    if (currentTime >= (duration * 0.9)) {
        clearInterval(intervalTimer); // 인터벌 실행 함수를 중지 시킨다. 
        if (playCount != 1) {  // playCount 가 1보다 크면 숫자를 줄여 가면서 중복 play 하도록 함
            playCount--;
        } else {
            let i = currGroupMemberArr.indexOf(currStudyDataNum);
            // 현재값이 배열의 마지막 값이면, 첫번째 값으로 설정함.
            if(i == currGroupMemberArr.length - 1){
                currStudyDataNum = currGroupMemberArr[0];
            }else{
                currStudyDataNum = currGroupMemberArr[i+1];
            }
            changeMp3 = true; //한국어 play 하도록 함
            playCount = defaultPlayCount;
        }
    }
  }
// 오디오 재생 시간 계산 함수
function getAudioDuration(audioElement) {
    return audioElement.duration * 1000; // 초 단위로 변환
}

// Play A에서 외국어를 먼저 play할지 한국어를 먼저 play 할지 정하는 옵션
function showForeignFirst(value) {
    if (value == false) {
        document.getElementById('foreignfirst').innerHTML = "";
    } else {
        const additionalCountlItems = `<div id="additionalCountlItems">
            <label class="p_font" for="slider">Play Count : </label>
            <span class="p_font" id="valueCountDisplay">${defaultPlayCount}</span>
            <input type="range" id="slider_count" min="1" max="5" step="1" value="${defaultPlayCount}" oninput="changePlayCount(this.value)">
        </div>`;
        document.getElementById('foreignfirst').innerHTML = additionalCountlItems;
    }
}

function showPlayCount(value) {
    if (value == false) {
        document.getElementById('playcount').innerHTML = "";
    } else {
        const additionalCountlItems = `<div id="additionalCountlItems">
            <label class="p_font" for="slider">Play Count : </label>
            <span class="p_font" id="valueCountDisplay">${defaultPlayCount}</span>
            <input type="range" id="slider_count" min="1" max="5" step="1" value="${defaultPlayCount}" oninput="changePlayCount(this.value)">
        </div>`;
        document.getElementById('playcount').innerHTML = additionalCountlItems;
    }
}

function changePlayCount(value) {
    defaultPlayCount = parseInt(value);
    // 폰트 설정 화면이 열려 있을때에만 값을 표시 하도록 구현함. 
    if (document.getElementById('valueCountDisplay')) {
        document.getElementById('valueCountDisplay').textContent = value;
    }
    saveToFirebase(); // 변경된 playCount값을 저장하기 
}

function showForeignNoSoundLength(value) {
    if (value == false) {
        document.getElementById('mp3nosound').innerHTML = "";
    } else {
        if(forNoSoundLength === ""){ // 만약 값이 null 이면 
            forNoSoundLength = 1.2;
        }
        const additionalMp3Items = `<div id="additionalMp3Items">
            <label class="p_font" for="slider">Mp3 Pause Ratio : </label>
            <span class="p_font" id="valueMp3Display">${forNoSoundLength}</span>
            <input type="range" id="slider_count" min="0.0" max="2.0" step="0.1" value="${forNoSoundLength}" oninput="changeForeignNoSoundLength(this.value)">
        </div>`;
        document.getElementById('mp3nosound').innerHTML = additionalMp3Items;
    }
}

function changeForeignNoSoundLength(value) {
    forNoSoundLength = parseFloat(value);
    // 폰트 설정 화면이 열려 있을때에만 값을 표시 하도록 구현함. 
    if (document.getElementById('valueMp3Display')) {
        document.getElementById('valueMp3Display').textContent = value;
    }
    saveToFirebase(); // 변경된 값을 저장함. 
}


// 웹화면이 잠기지 않게 해주는 로직
let wakeLock = null;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            if (!wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock acquired');
            }
        } catch (err) {
            console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('Screen Wake Lock released');
        } catch (err) {
            console.error(`Wake Lock release error: ${err.name}, ${err.message}`);
        }
    }
}

// 앱이 다시 활성화될 때 잠금 재요청 (브라우저는 탭이 가려지면 잠금을 자동 해제함)
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

document.addEventListener('click', function enableWakeLock() {
    requestWakeLock();
    document.removeEventListener('click', enableWakeLock, false);
}, false);
