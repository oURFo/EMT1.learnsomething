// Global state
let currentDeck = [];
let currentIndex = 0;
let currentCategory = '';

// Test Mode State
let testQuestions = [];
let currentTestIndex = 0;
let testScore = 0;
let testTimer = 0;
let testTimerInterval = null;
let wrongAnswers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if gameData is loaded
    if (typeof gameData === 'undefined') {
        console.error("Game data not loaded!");
        alert("資料載入錯誤，請檢查 data.js");
        return;
    }

    // Add swipe listeners
    const cardContainer = document.getElementById('flashcard');
    if (cardContainer) {
        cardContainer.addEventListener('mousedown', handleTouchStart);
        cardContainer.addEventListener('touchstart', handleTouchStart);

        document.addEventListener('mousemove', handleTouchMove);
        document.addEventListener('touchmove', handleTouchMove);

        document.addEventListener('mouseup', handleTouchEnd);
        document.addEventListener('touchend', handleTouchEnd);
    }
});

// Screen Navigation
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.menu-container').forEach(el => {
        el.classList.add('hidden');
    });

    // Show target screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
    }

    // Reset states if returning to main menu
    if (screenId === 'main-menu') {
        currentDeck = [];
        currentIndex = 0;
        stopTestTimer();
    }
}

// Learning Mode Logic
function selectCategory(category) {
    currentCategory = category;

    // Load data from gameData object
    if (gameData[category]) {
        // Clone the array to avoid modifying the original data
        currentDeck = [...gameData[category]];
        shuffleDeck(currentDeck);
        currentIndex = 0;

        // Update UI
        const titleMap = {
            'regulations': '法規',
            'assessment': '急救評估',
            'methods': '急救方法'
        };
        document.getElementById('category-title').innerText = titleMap[category];

        showScreen('card-display');
        showCard();
    } else {
        alert("此類別尚無資料！");
    }
}

function shuffleDeck(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showCard() {
    if (currentDeck.length === 0) return;

    const card = currentDeck[currentIndex];
    const cardContainer = document.getElementById('flashcard');

    // Reset animation classes
    cardContainer.classList.remove('slide-in', 'slide-out-left', 'slide-out-right');
    void cardContainer.offsetWidth; // Trigger reflow
    cardContainer.classList.add('slide-in');

    document.getElementById('question-text').innerText = card.question;
    document.getElementById('answer-text').innerText = card.answer;
}

function nextCard() {
    const cardContainer = document.getElementById('flashcard');
    cardContainer.classList.add('slide-out-left');

    setTimeout(() => {
        currentIndex++;
        if (currentIndex >= currentDeck.length) {
            // Reshuffle if end of deck
            shuffleDeck(currentDeck);
            currentIndex = 0;
        }
        showCard();
    }, 300);
}

function prevCard() {
    const cardContainer = document.getElementById('flashcard');
    cardContainer.classList.add('slide-out-right');

    setTimeout(() => {
        currentIndex--;
        if (currentIndex < 0) {
            currentIndex = currentDeck.length - 1;
        }
        showCard();
    }, 300);
}

// Swipe Logic
let startX = 0;
let currentX = 0;
let isDragging = false;

function handleTouchStart(e) {
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isDragging) return;
    currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    const diff = startX - currentX;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            nextCard(); // Swipe Left -> Next
        } else {
            prevCard(); // Swipe Right -> Prev
        }
    }
}

// ==========================================
// Test Mode Logic
// ==========================================

function startTest(category) {
    if (!gameData[category] || gameData[category].length < 10) {
        alert("此類別題目不足 10 題，無法進行測驗！");
        return;
    }

    currentCategory = category;
    // Select 10 random questions
    const pool = [...gameData[category]];
    shuffleDeck(pool);
    testQuestions = pool.slice(0, 10);

    currentTestIndex = 0;
    testScore = 0;
    wrongAnswers = [];
    testTimer = 0;

    showScreen('test-interface');
    startTestTimer();
    showTestQuestion();
}

function startTestTimer() {
    stopTestTimer();
    const timerEl = document.getElementById('test-timer');
    timerEl.innerText = "00:00";

    testTimerInterval = setInterval(() => {
        testTimer++;
        const mins = Math.floor(testTimer / 60).toString().padStart(2, '0');
        const secs = (testTimer % 60).toString().padStart(2, '0');
        timerEl.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTestTimer() {
    if (testTimerInterval) {
        clearInterval(testTimerInterval);
        testTimerInterval = null;
    }
}

function showTestQuestion() {
    const q = testQuestions[currentTestIndex];
    document.getElementById('test-progress').innerText = `${currentTestIndex + 1} / 10`;
    document.getElementById('test-question-text').innerText = q.question;

    // Generate Options
    const optionsContainer = document.getElementById('test-options');
    optionsContainer.innerHTML = ''; // Clear previous

    let options = [];
    // Check if custom distractors exist
    if (q.distractors && Array.isArray(q.distractors) && q.distractors.length > 0) {
        // Use custom distractors (take first 3 if more are provided)
        const customDistractors = q.distractors.slice(0, 3);
        options = [q.answer, ...customDistractors];
    } else {
        // Fallback: Get 3 random distractors from the pool
        const distractors = getDistractors(currentCategory, q.answer);
        options = [q.answer, ...distractors];
    }

    shuffleDeck(options); // Shuffle options

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => submitAnswer(btn, opt, q.answer);
        optionsContainer.appendChild(btn);
    });
}

function getDistractors(category, correctAnswer) {
    const pool = gameData[category];
    const distractors = [];
    const maxAttempts = 50; // Avoid infinite loop
    let attempts = 0;

    while (distractors.length < 3 && attempts < maxAttempts) {
        const randomQ = pool[Math.floor(Math.random() * pool.length)];
        const answer = randomQ.answer;

        if (answer !== correctAnswer && !distractors.includes(answer)) {
            distractors.push(answer);
        }
        attempts++;
    }

    // Fallback if not enough unique answers (unlikely with >50 qs)
    while (distractors.length < 3) {
        distractors.push("以上皆非");
    }

    return distractors;
}

function submitAnswer(btnElement, selected, correct) {
    // Disable all buttons
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.onclick = null);

    if (selected === correct) {
        btnElement.classList.add('correct');
        testScore++;
    } else {
        btnElement.classList.add('wrong');
        // Highlight correct one
        buttons.forEach(b => {
            if (b.innerText === correct) b.classList.add('correct');
        });

        // Record wrong answer
        wrongAnswers.push({
            question: testQuestions[currentTestIndex].question,
            correctAnswer: correct
        });
    }

    // Wait then next
    setTimeout(() => {
        currentTestIndex++;
        if (currentTestIndex < 10) {
            showTestQuestion();
        } else {
            endTest();
        }
    }, 1500); // 1.5s delay to see result
}

function endTest() {
    stopTestTimer();
    showScreen('test-results');

    // Update Score
    const percentage = Math.round((testScore / 10) * 100);
    document.getElementById('final-score').innerText = `${percentage}%`;

    // Update Time
    const mins = Math.floor(testTimer / 60).toString().padStart(2, '0');
    const secs = (testTimer % 60).toString().padStart(2, '0');
    document.getElementById('final-time').innerText = `${mins}:${secs}`;

    // Update Review List
    const list = document.getElementById('review-list');
    list.innerHTML = '';

    if (wrongAnswers.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#27ae60;">太棒了！全對！</p>';
    } else {
        wrongAnswers.forEach(item => {
            const div = document.createElement('div');
            div.className = 'review-item';
            div.innerHTML = `
                <p class="review-q">Q: ${item.question}</p>
                <p class="review-a">A: ${item.correctAnswer}</p>
            `;
            list.appendChild(div);
        });
    }
}

// Knowledge Card Data
const knowledgeData = {
    'avpu': {
        title: '意識評估 (AVPU)',
        content: `
            <h3>AVPU 評估法</h3>
            <div class='knowledge-item'>
                <strong>A (Alert) - 清醒</strong>
                <p>病患清醒，對人、時、地清楚。</p>
            </div>
            <div class='knowledge-item'>
                <strong>V (Verbal) - 對聲音有反應</strong>
                <p>病患對呼叫聲有反應（如張眼、說話）。</p>
            </div>
            <div class='knowledge-item'>
                <strong>P (Pain) - 對疼痛有反應</strong>
                <p>病患僅對疼痛刺激（如捏壓指甲床）有反應。</p>
            </div>
            <div class='knowledge-item'>
                <strong>U (Unresponsive) - 無反應</strong>
                <p>病患對聲音及疼痛刺激均無反應。</p>
            </div>
        `
    },
    'gcs': {
        title: '昏迷指數 (GCS)',
        content: `
            <h3>GCS 昏迷指數</h3>
            <div class='knowledge-item'>
                <strong>E (Eye Opening) 睜眼反應</strong>
                <p>4：自發性睜眼<br>3：聽到聲音睜眼<br>2：對疼痛睜眼<br>1：無反應</p>
            </div>
            <div class='knowledge-item'>
                <strong>V (Verbal Response) 語言反應</strong>
                <p>5：言語清晰，人時地清楚<br>4：言語混淆，答非所問<br>3：單字，言語不恰當<br>2：發出無意義聲音<br>1：無反應</p>
            </div>
            <div class='knowledge-item'>
                <strong>M (Motor Response) 運動反應</strong>
                <p>6：聽從指令動作<br>5：對疼痛定位（撥開）<br>4：對疼痛閃避<br>3：去皮質屈曲（異常彎曲）<br>2：去大腦伸展（異常伸直）<br>1：無反應</p>
            </div>
        `
    },
    'professional': {
        title: '急救專業展示',
        content: `
            <h3>急救器材與專業展示</h3>
            <div class='knowledge-item'>
                <p>作為一名專業的 EMT，除了具備豐富的急救知識與技術外，對於急救器材的熟悉度與擺放管理也是展現專業的重要一環。</p>
                <p>整齊、有序的器材擺放，不僅能讓救護人員在緊急時刻迅速取得所需裝備，更能提升團隊的救援效率與安全性。</p>
            </div>
            
            <h3>創傷器材擺放</h3>
            <div class='knowledge-item' style="text-align: center;">
                <img src="game_data/創傷器材位置.jpg" alt="創傷器材擺放" style="width: 100%; max-width: 600px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <p style="margin-top: 10px; color: #666; font-size: 0.9em;">創傷急救器材標準擺放示意圖</p>
            </div>

            <h3>非創傷器材擺放</h3>
            <div class='knowledge-item' style="text-align: center;">
                <img src="game_data/非創器材位置.jpg" alt="非創傷器材擺放" style="width: 100%; max-width: 600px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <p style="margin-top: 10px; color: #666; font-size: 0.9em;">非創傷急救器材標準擺放示意圖</p>
            </div>
        `
    },
    'handover': {
        title: '交班步驟 (ISBAR & IMIST)',
        content: `
            <h3>ISBAR 交班模式</h3>
            <div class='knowledge-item'>
                <strong>I (Introduction) - 自我介紹</strong>
                <p>確認交班對象，表明自己身分。</p>
            </div>
            <div class='knowledge-item'>
                <strong>S (Situation) - 情境</strong>
                <p>發生了什麼事？病患的主訴或主要問題。</p>
            </div>
            <div class='knowledge-item'>
                <strong>B (Background) - 背景</strong>
                <p>病患的過去病史、過敏史、發生機轉等背景資訊。</p>
            </div>
            <div class='knowledge-item'>
                <strong>A (Assessment) - 評估</strong>
                <p>生命徵象、身體評估發現、傷勢等。</p>
            </div>
            <div class='knowledge-item'>
                <strong>R (Recommendation) - 建議/處置</strong>
                <p>已執行的處置、建議後續處置或特殊需求。</p>
            </div>

            <h3>IMIST 創傷交班模式</h3>
            <div class='knowledge-item'>
                <strong>I (Identification) - 身分</strong>
                <p>病患姓名、性別、年齡。</p>
            </div>
            <div class='knowledge-item'>
                <strong>M (Mechanism) - 機轉</strong>
                <p>受傷機轉或主訴 (Medical Complaint)。</p>
            </div>
            <div class='knowledge-item'>
                <strong>I (Injuries) - 傷勢</strong>
                <p>發現的傷勢或檢查結果 (Information)。</p>
            </div>
            <div class='knowledge-item'>
                <strong>S (Signs) - 徵象</strong>
                <p>生命徵象 (GCS, BP, HR, RR, SpO2)。</p>
            </div>
            <div class='knowledge-item'>
                <strong>T (Treatment) - 處置</strong>
                <p>已給予的急救處置。</p>
            </div>
        `
    }
};

function showKnowledgeDetail(topic) {
    const data = knowledgeData[topic];
    if (data) {
        document.getElementById('knowledge-title').innerText = data.title;
        document.getElementById('knowledge-content').innerHTML = data.content;
        showScreen('knowledge-detail');
    } else {
        alert('內容建置中！');
    }
}
