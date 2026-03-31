/**
 * speak_auth.js
 * Firebase Authentication 처리 및 UI 업데이트
 */

// 로그인 상태 변화 감시
firebase.auth().onAuthStateChanged((user) => {
    const authUi = document.getElementById('auth-ui');
    if (!authUi) return;

    if (user) {
        // 로그인 된 상태
        const displayName = user.displayName || user.email.split('@')[0];
        authUi.innerHTML = `
            <div class="auth-user-info">
                <span class="user-name">${displayName}님</span>
                <i class="fa-solid fa-right-from-bracket logout-icon" onclick="handleLogout()" title="로그아웃"></i>
            </div>
        `;
    } else {
        // 로그아웃 된 상태
        authUi.innerHTML = `
            <button onclick="location.href='login.html'" class="button2ea btn_color6" style="width: auto; padding: 5px 15px; font-size: 0.8em;">로그인</button>
        `;
    }
    // 로그인 여부와 관계없이 loadFromFirebase를 호출하여 데이터 로딩 시도 (비로그인 시에는 기본 JSON 로드)
    loadFromFirebase();
});

// 회원가입 처리
async function handleSignUp() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    const errorMsg = document.getElementById('error-message');

    if (!name) {
        errorMsg.textContent = "이름을 입력해주세요.";
        return;
    }

    if (password !== confirmPassword) {
        errorMsg.textContent = "비밀번호가 일치하지 않습니다.";
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        // 사용자 프로필에 이름 업데이트
        await userCredential.user.updateProfile({ displayName: name });
        alert("회원가입이 완료되었습니다!");
        location.href = 'index.html';
    } catch (error) {
        errorMsg.textContent = error.message;
    }
}

// 로그인 처리
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('error-message');

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        location.href = 'index.html';
    } catch (error) {
        errorMsg.textContent = "로그인 실패: 이메일 또는 비밀번호를 확인하세요.";
    }
}

// 로그아웃 처리
function handleLogout() {
    firebase.auth().signOut().then(() => {
        alert("로그아웃 되었습니다.");
        location.reload();
    });
}
