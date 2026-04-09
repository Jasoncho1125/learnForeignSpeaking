# 버전 업그레이드 시 학습 정보 손실 문제 진단 및 해결

## 🔴 발생한 문제

**증상:**
- studyFileName v0.9 → v1.0 업그레이드
- 사용자 과거 학습 정보가 로드되지 않음
- 학습 진행률 초기화됨

**근본 원인:**
UID 불일치 문제로 인해 기존 진행 정보(progress)와 새 콘텐츠(baseData)의 매칭 실패

---

## 🔍 문제 분석

### 1. 콘텐츠 구조 변경
```
v0.9: item_1, item_2, item_3, ...
  ↓ (버전 업그레이드)
v1.0: item_1_new, item_2_new, item_3_new, ...
  ↓
UID 변경 → 진행 정보와 매칭 불가
```

### 2. 데이터 흐름에서의 문제점
```
loadFromFirebase()
  ↓
baseData = loadStudyContent()  // v1.0 콘텐츠 (새 UID)
progressData = remoteData.progress  // v0.9 진행 정보 (구 UID)
  ↓
studyData = baseData.map(baseItem => {
    const progress = progressData.find(p => p.uid === baseItem.uid);  // ← UID 불일치!
    // 매칭 실패 → 진행 정보 손실
});
```

---

## ✅ 구현된 해결책

### 1. 자동 UID 매칭 함수 추가

**함수:** `matchProgressToNewContent(progressData, baseData, oldVersion, newVersion)`

**3단계 복구 전략:**

#### 1단계: 직접 UID 매칭
```javascript
// 새 콘텐츠에서 같은 UID 찾기
const directMatches = progressData.filter(p => 
    baseData.find(b => b.uid === p.uid)
);
```
- 성공률: **높음** (UID가 유지된 항목)
- 예: `item_1` → `item_1` (동일 UID)

#### 2단계: Script 기반 매칭
```javascript
// 같은 chapter + 같은 script_korean으로 매칭
const matchedItem = baseData.find(b => 
    b.chapter_name === oldChapter &&
    b.script_korean === oldScript
);
```
- 성공률: **중간** (콘텐츠 내용은 유지되고 UID만 변경)
- 예: chapter=Unit1, script="Hello" → 새 UID 찾기

#### 3단계: 위치 기반 매칭
```javascript
// 같은 chapter 내 상대적 위치로 매칭
const oldIndex = oldChapterItems.indexOf(oldP);
const matchedItem = chapterItems[oldIndex];
```
- 성공률: **낮음** (구조 변경된 경우만 가능)
- 예: Unit1의 3번째 항목 → 새 콘텐츠 Unit1의 3번째 항목

### 2. UID 마이그레이션 맵

**위치:** `speak_config.js` - `UID_MIGRATION_MAP`

**사용 시나리오:** 콘텐츠 구조가 크게 변경되어 자동 매칭 실패 시

**사용법:**
```javascript
const UID_MIGRATION_MAP = {
    "0.9": {
        "old_uid_1": "new_uid_1",
        "old_uid_2": "new_uid_2",
        "old_uid_3": "new_uid_3"
    }
};
```

**적용 순서:**
1. 마이그레이션 맵 확인 (수동 매핑)
2. 자동 UID 매칭 시도 (script_korean 기반)
3. 위치 기반 매칭 (fallback)

### 3. 콘솔 로그 추가

**디버깅 정보:**
```
[Version Check] Old: v0.9 → New: v1.0
[Version Migration] UID mismatch detected: v0.9 → v1.0
  - Found: 50/100
  - Lost: 50 items - attempting recovery...
[Version Migration] Direct UID match successful: 50 items
[Version Migration] Final result: 75/100 items recovered
  ⚠️ Warning: 25 items could not be recovered
  - Check if content structure changed significantly
```

---

## 🛠️ 적용 단계

### Step 1: 자동 복구 시도
앱을 업데이트하면 자동으로:
1. 기존 진행 정보(progress) 인식
2. 새 콘텐츠(v1.0) UID와 비교
3. 가능한 한 많이 자동 매칭

**예상 결과:**
- 콘텐츠 변경 없음 → 100% 복구
- 항목 추가/삭제만 있음 → 90%+ 복구
- 콘텐츠 구조 변경 → 50-70% 복구

### Step 2: 콘솔로 복구 상황 확인
개발자 도구 → Console 탭에서 로그 확인

```
[Version Migration] Final result: 85/100 items recovered
```

### Step 3: 필요 시 수동 UID 매핑

**v0.9와 v1.0의 UID 대응 관계 파악:**

1. v0.9 JSON 파일의 UID 확인
2. v1.0 JSON 파일의 새 UID 확인
3. 대응 관계 작성

```javascript
// speak_config.js
const UID_MIGRATION_MAP = {
    "0.9": {
        "v09_unit1_item1": "v10_unit1_item1",
        "v09_unit1_item2": "v10_unit1_item2",
        "v09_unit2_item1": "v10_unit2_item1"
    }
};
```

4. 앱 재시작 → 자동 마이그레이션 실행

---

## 📊 복구 로직 플로우

```
사용자 로그인
  ↓
loadFromFirebase() 호출
  ↓
previousVersion = "studySpeakingData-v0.9.json"
newVersion = "studySpeakingData-v1.0.json"
  ↓
버전 비교: v0.9 ≠ v1.0
  ↓
┌─────────────────────────────────────┐
│ UID 마이그레이션 프로세스 시작      │
└─────────────────────────────────────┘
  ↓
1️⃣ UID_MIGRATION_MAP 확인
   ├─ 있음 → 수동 매핑 적용
   └─ 없음 → 2단계로
  ↓
2️⃣ matchProgressToNewContent() 실행
   ├─ 직접 UID 매칭
   ├─ script_korean 기반 매칭
   └─ 위치 기반 매칭
  ↓
복구된 progress 데이터로 studyData 생성
  ↓
UI 렌더링 (학습 정보 복원)
```

---

## 🧪 테스트 시나리오

### 시나리오 1: UID 유지 (최상의 경우)
```
v0.9:
  - uid: "item_001", script: "Hello"
  - uid: "item_002", script: "Good"

v1.0:
  - uid: "item_001", script: "Hello"  (동일)
  - uid: "item_002", script: "Good"   (동일)

결과: ✅ 100% 복구 (직접 매칭)
```

### 시나리오 2: UID 변경, 콘텐츠 유지
```
v0.9:
  - uid: "item_001", script: "Hello"

v1.0:
  - uid: "v10_001", script: "Hello"  (UID 변경, 내용 동일)

결과: ✅ 95%+ 복구 (script_korean 기반 매칭)
```

### 시나리오 3: 콘텐츠 재구성 (최악의 경우)
```
v0.9:
  - uid: "item_001", chapter: "Unit1", position: 1
  - uid: "item_002", chapter: "Unit1", position: 2

v1.0:
  - uid: "v10_001", chapter: "Unit1", position: 1
  - uid: "v10_002", chapter: "Unit1", position: 2
  - uid: "v10_003", chapter: "Unit1", position: 3  (새 항목 추가)

결과: ⚠️ 위치 기반 매칭 → 복구 + 수동 매핑 필요
```

---

## 📋 문제 해결 체크리스트

### 자동 복구
- [x] `matchProgressToNewContent()` 구현
- [x] 직접 UID 매칭
- [x] script_korean 기반 매칭
- [x] 위치 기반 매칭
- [x] 콘솔 로그 추가

### 수동 복구
- [x] UID_MIGRATION_MAP 추가 (speak_config.js)
- [x] 마이그레이션 맵 우선 적용 로직

### 디버깅
- [x] 복구 상황 콘솔 출력
- [x] 손실된 항목 수 표시
- [x] 경고 메시지 출력

---

## 🚀 사용자를 위한 가이드

### 1. 앱 업데이트
- 최신 버전 다운로드 (v1.0 지원)
- 기존 학습 데이터 자동 복구 (로그인 시)

### 2. 복구 확인
개발자 도구 열기 (F12)
```
Console 탭 확인
[Version Migration] Final result: 95/100 items recovered
```

### 3. 문제 시 연락
- 복구율이 낮으면 (< 50%)
- 콘솔 로그 스크린샷 첨부
- 관리자 문의

---

## 🔧 향후 예방 조치

### v2.0 이상 버전 업그레이드 시
1. **UID 안정성 검토**
   - 가능하면 UID 유지
   - 변경 필요 시 사전 매핑 준비

2. **마이그레이션 맵 작성**
   - 버전 변경 전 UID 대응표 작성
   - UID_MIGRATION_MAP에 추가

3. **충분한 테스트**
   - 기존 사용자 복구 테스트
   - 여러 버전 시나리오 검증

4. **롤백 계획 수립**
   - 복구 실패 시 대비
   - 구 버전 데이터 백업

---

## 📞 문제 보고

**복구되지 않은 항목이 있는 경우:**

1. 콘솔 로그 저장
   ```
   Ctrl+Shift+J (Windows) → Console
   우측 클릭 → "Save as..."
   ```

2. 문제 상황 설명
   - 몇 개 항목이 복구되지 않았는지
   - 어느 Chapter 항목인지
   - 예상 학습 정보 (finish, test_count 등)

3. 관리자에 전달 → 수동 복구 또는 UID 매핑 업데이트

---

## 📝 참고사항

- UID 기반 진행 정보 관리 → 버전 변경 시에도 안전
- 자동 복구 3단계 → 대부분의 경우 해결
- UID_MIGRATION_MAP → 예비 수단
- 콘솔 로그 → 진단 및 디버깅 도움말
