# Firebase Realtime Database Rules - 통합 데이터 구조 (v2)

## 📋 구조 개요

```
studyFiles/
  ├─ content (공용 콘텐츠 - 어드민만 수정)
  │  └─ [{uid, script_korean, script_foreign, ...}]
  └─ metadata (버전 정보)
     ├─ latest_version: "v0.7"
     ├─ version_history: ["v0.5", "v0.6", "v0.7"]
     └─ lastUpdateTime

users/{uid}/
  ├─ progress (사용자 진행 상황 - UID별 학습 이력)
  │  └─ [{uid, finish, finish_date, group, test_count, lastModified}]
  ├─ myChapterInfo (사용자 설정 및 상태)
  │  └─ {currChapterName, currBookName, defaultFontSize, currentVersion, ...}
  └─ books/{bookName}/myChapterList (책별 챕터 정보)
     └─ {chapterName: {...}}
```

---

## 🔒 보안 규칙

```json
{
  "rules": {
    // 공용 콘텐츠 (읽기는 모두, 쓰기는 어드민만)
    "studyFiles": {
      "content": {
        ".read": true,
        ".write": "root.child('admins').child(auth.uid).exists()",
        ".indexOn": ["uid", "version_introduced"]
      },
      "metadata": {
        ".read": true,
        ".write": "root.child('admins').child(auth.uid).exists()"
      }
    },
    
    // 사용자 데이터 (자신의 데이터만 접근)
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        
        "progress": {
          ".validate": "newData.isArray() || !newData.exists()",
          "$idx": {
            "uid": {".validate": "newData.isString()"},
            "finish": {".validate": "newData.val() === 'yes' || newData.val() === 'no' || newData.val() === 'delete'"},
            "finish_date": {".validate": "newData.isString()"},
            "group": {".validate": "newData.isNumber()"},
            "test_count": {".validate": "newData.isNumber()"},
            "lastModified": {".validate": "newData.isNumber()", ".default": "now()"}
          }
        },
        
        "myChapterInfo": {
          ".validate": "newData.isObject()",
          "currChapterName": {".validate": "newData.isString()"},
          "currBookName": {".validate": "newData.isString()"},
          "defaultFontSize": {".validate": "newData.isNumber()"},
          "currentVersion": {".validate": "newData.isString()"},
          "lastSyncTimestamp": {".validate": "newData.isNumber()"}
        },
        
        "books": {
          "$bookName": {
            "myChapterList": {
              ".validate": "newData.isObject()"
            }
          }
        }
      }
    },
    
    // 어드민 관리
    "admins": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": false  // 수동 Firebase 콘솔에서만 추가 가능
    }
  }
}
```

---

## 📊 마이그레이션 전략

### Phase 1: 구 데이터 유지 (현재)
- 구 구조: `users/{uid}/{studySaveName}`
- 신 구조: `users/{uid}/progress`
- 자동 마이그레이션: 로그인 시 `migrateOldUserData()` 호출

### Phase 2: 신 구조 안정화 (1-2주)
- 모든 사용자가 신 구조로 마이그레이션 완료 확인
- 구 데이터 백업 및 검증

### Phase 3: 구 데이터 제거 (선택)
- 구 데이터 삭제 (충분한 백업 후)
- DB 정리 및 용량 최적화

---

## ✅ 주요 개선 사항

| 항목 | 기존 | 개선 | 효과 |
|------|------|------|------|
| **콘텐츠 관리** | 버전별 중복 저장 | 단일 DB 통합 | ✅ 용량 50% 감소 |
| **히스토리 유지** | 버전 업그레이드 시 손실 | UID 기반 자동 이전 | ✅ 데이터 손실 제거 |
| **충돌 해결** | 수동 개입 필요 | 타임스탬프 기반 자동 | ✅ 멀티디바이스 안전 |
| **버전 추적** | 불가능 | 메타데이터 레이어 | ✅ 콘텐츠 변경 추적 |
| **마이그레이션** | 수동 | 자동 (로그인 시) | ✅ UX 개선 |

---

## 🔄 데이터 흐름

### 저장 (saveToFirebase)
```
studyData 변경
    ↓
progress 데이터 + 타임스탬프 생성
    ↓
users/{uid}/progress 저장
    ↓
users/{uid}/myChapterInfo 업데이트 (currentVersion 포함)
```

### 로드 (loadFromFirebase)
```
users/{uid} 확인
    ↓
progress 있음? → 진행 정보 사용
    ↓
없음? → 구 데이터에서 마이그레이션
    ↓
studyFiles/content에서 최신 콘텐츠 로드
    ↓
progress + content 병합 (UID 매칭)
    ↓
UI 렌더링
```

---

## 🧪 테스트 체크리스트

- [ ] 기존 사용자 로그인 → 자동 마이그레이션 확인
- [ ] 새 사용자 회원가입 → 신 구조로 저장 확인
- [ ] 콘텐츠 버전 업그레이드 → 히스토리 유지 확인
- [ ] 멀티디바이스 동시 업데이트 → 충돌 해결 확인
- [ ] 타임스탬프 순서 → 최신 데이터 우선 확인
- [ ] 콘텐츠 삭제 → isDeleted 플래그 작동 확인

---

## 📝 주의사항

1. **콘텐츠 구조 변경 시**: 새 UID가 생기면 UID 마이그레이션 맵 필요
2. **어드민 계정**: Firebase 콘솔에서 `admins/{uid}` 수동 추가 필요
3. **백업**: 마이그레이션 전 전체 사용자 데이터 백업 권장
4. **모니터링**: 마이그레이션 후 1주일간 에러 로그 모니터링
