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
        target.scrollTop = 0;
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

    // Scroll to top
    document.getElementById('card-display').scrollTop = 0;
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

    // Scroll to top
    document.getElementById('test-interface').scrollTop = 0;

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
    },
    'trauma_process': {
        title: '創傷處置流程 (X-意識-ABCDE)',
        content: `
            <h3>X (Exsanguinating hemorrhage) - 大量出血控制</h3>
            <div class='knowledge-item'>
                <p><strong>優先處理危及生命的四肢或軀幹大量出血。</strong></p>
                <p>處置：直接加壓止血、使用止血帶 (Tourniquet)。若發現噴射狀或大量湧出的出血，應立即控制，甚至優先於呼吸道處置。</p>
            </div>

            <h3>意識 (Consciousness) - 快速評估</h3>
            <div class='knowledge-item'>
                <p><strong>使用 AVPU 評估病患意識狀態：</strong></p>
                <ul>
                    <li><strong>A (Alert)</strong>: 清醒。</li>
                    <li><strong>V (Verbal)</strong>: 對聲音有反應。</li>
                    <li><strong>P (Pain)</strong>: 對疼痛有反應。</li>
                    <li><strong>U (Unresponsive)</strong>: 無反應。</li>
                </ul>
                <p>若意識不清，需立即考慮呼吸道維持與頸椎保護。</p>
            </div>

            <h3>A (Airway) - 呼吸道評估</h3>
            <div class='knowledge-item'>
                <p><strong>以看、聽方式評估呼吸道是否阻塞。</strong></p>
                <p><strong>處置：</strong></p>
                <ul>
                    <li>壓額抬下巴 (無頸椎疑慮) 或 推下顎法 (懷疑頸椎損傷)。</li>
                    <li>清除口中異物、抽吸分泌物。</li>
                    <li>使用口咽 (OPA) 或 鼻咽 (NPA) 呼吸道輔助。</li>
                </ul>
            </div>

            <h3>B (Breathing) - 呼吸評估</h3>
            <div class='knowledge-item'>
                <p><strong>以看、聽方式評估呼吸品質、深、淺、快、慢及是否有明顯異常呼吸音，評估不超過10秒。</strong></p>
                <p><strong>處置：</strong></p>
                <ul>
		    <li>給予血氧機檢查血氧數值。</li>
                    <li>給予氧氣 (鼻導管或非再吸入面罩)。</li>
                    <li>檢查並處置致命性胸部創傷 (如張力性氣胸、開放性氣胸、連枷胸)。</li>
                    <li>若呼吸衰竭或過慢，給予 BVM 輔助呼吸。</li>
                </ul>
            </div>

            <h3>C (Circulation) - 循環評估</h3>
            <div class='knowledge-item'>
                <p><strong>評估整體循環是否正常。</strong></p>
                <p><strong>評估項目：</strong></p>
                <ul>
                    <li>評估橈動脈是否有且對稱，評估不超過10秒，若否則檢查頸動脈。</li>
                    <li>膚色是否正常。</li>
                    <li>肢體皮膚是否濕冷。</li>
                    <li>微血管充填時間 (CRT)是否>2秒。</li>
                    <li>檢查骨盆是否固定。</li>
                </ul>
                <p><strong>處置：</strong>尋找並控制其他出血點，評估休克徵象。</p>
            </div>

            <h3>D (Disability) - 神經失能評估</h3>
            <div class='knowledge-item'>
                <p><strong>快速神經學檢查。</strong></p>
                <ul>
                    <li><strong>GCS 昏迷指數</strong>: 評估 E (睜眼)、V (語言)、M (運動)。</li>
                    <li><strong>瞳孔</strong>: 大小、對光反應。</li>
                    <li><strong>四肢功能</strong>: 感覺與運動功能 (MP)。</li>
                </ul>
            </div>

            <h3>E (Exposure/Environment) - 暴露與環境控制</h3>
            <div class='knowledge-item'>
                <p><strong>暴露傷患身體以檢查潛在傷口，並預防低體溫。</strong></p>
                <ul>
                    <li>快速檢查頭、頸、胸、腹、骨盆、肢體是否有致命性傷口。</li>
                    <li>頸靜脈是否怒張或塌陷、氣管是否偏移、是否有皮下氣腫、後頸是否壓痛。</li>
                    <li>剪開衣物檢查 (注意隱私)。</li>
                    <li>給予保暖 (毛毯、調節車內溫度)。</li>
                </ul>
            </div>
        `
    },
    'nontrauma_process': {
        title: '非創傷處置流程 (意識-ABC)',
        content: `
            <h3>意識 (Consciousness) - 快速評估</h3>
            <div class='knowledge-item'>
                <p><strong>使用 AVPU 評估病患意識狀態：</strong></p>
                <ul>
                    <li><strong>A (Alert)</strong>: 清醒。</li>
                    <li><strong>V (Verbal)</strong>: 對聲音有反應。</li>
                    <li><strong>P (Pain)</strong>: 對疼痛有反應。</li>
                    <li><strong>U (Unresponsive)</strong>: 無反應。</li>
                </ul>
                <p>若意識不清，需立即考慮呼吸道維持。</p>
            </div>

            <h3>A (Airway) - 評估呼吸道</h3>
            <div class='knowledge-item'>
                <p><strong>確認呼吸道是否暢通。</strong></p>
                <p><strong>評估：</strong></p>
                <ul>
                    <li>病患能否說話？有無呼吸雜音（如鼾音、喘鳴音）？</li>
                </ul>
                <p><strong>處置：</strong></p>
                <ul>
                    <li>壓額抬下巴法開放呼吸道。</li>
                    <li>清除口中異物、抽吸分泌物。</li>
                    <li>使用口咽 (OPA) 或 鼻咽 (NPA) 呼吸道輔助。</li>
                </ul>
            </div>

            <h3>B (Breathing) - 評估呼吸</h3>
            <div class='knowledge-item'>
                <p><strong>以看、聽方式評估呼吸品質、深、淺、快、慢及是否有明顯異常呼吸音，評估不超過10秒。</strong></p>
                <p><strong>評估項目：</strong></p>
                <ul>
                    <li>呼吸速率 (過快/過慢)。</li>
                    <li>呼吸深度 (深/淺)。</li>
                    <li>血氧濃度 (SpO2)。</li>
                </ul>
                <p><strong>處置：</strong></p>
                <ul>
                    <li>給予氧氣 (鼻導管或非再吸入面罩)。</li>
                    <li>若呼吸衰竭，給予 BVM 輔助呼吸。</li>
                </ul>
            </div>

            <h3>C (Circulation) - 評估循環</h3>
            <div class='knowledge-item'>
                <p><strong>評估循環狀態。</strong></p>
                <p><strong>評估項目：</strong></p>
                <ul>
                    <li>評估橈動脈是否有且對稱，評估不超過10秒，若否則檢查頸動脈。</li>
                    <li>膚色是否正常。</li>
                    <li>肢體皮膚是否濕冷。</li>
                    <li>微血管充填時間 (CRT)是否>2秒。</li>
                </ul>
                <p><strong>處置：</strong></p>
                <ul>
                    <li>若有休克徵象，給予保暖、抬高下肢 (若無禁忌症)。</li>
                    <li>若無脈搏，立即開始 CPR。</li>
                </ul>
            </div>
        `
    },
    'critical_cases': {
        title: '危急個案判斷 (ALS/Major Trauma)',
        content: `
            <h3>ALS 判斷標準 (危急個案)</h3>
            <div class='knowledge-item'>
                <p><strong>符合下列任一項即為危急個案 (ALS)：</strong></p>
                <ul>
                    <li><strong>意識不清</strong>: GCS < 13 分。</li>
                    <li><strong>呼吸異常</strong>: 呼吸次數 < 10 或 > 29 次/分。</li>
                    <li><strong>休克徵象</strong>: 收縮壓 (SBP) < 90 mmHg。</li>
                    <li><strong>脈搏異常</strong>: 脈搏 < 50 或 > 140 次/分。</li>
                    <li><strong>體溫異常</strong>: 體溫 > 41°C 或 < 32°C。</li>
                    <li><strong>血氧偏低</strong>: SpO2 < 90%。</li>
                    <li><strong>持續抽搐</strong>: 癲癇持續狀態。</li>
                    <li><strong>胸痛</strong>: 懷疑心肌梗塞 (AMI)。</li>
                    <li><strong>腦中風</strong>: 懷疑急性腦中風 (CVA)。</li>
                </ul>
            </div>

            <h3>重大創傷 (Major Trauma) 判斷標準</h3>
            <div class='knowledge-item'>
                <p><strong>符合下列任一項機轉或傷勢：</strong></p>
                <ul>
                    <li><strong>高處墜落</strong>: > 6 公尺 (約 2 層樓高)。</li>
                    <li><strong>車禍噴飛</strong>: 傷患被拋出車外。</li>
                    <li><strong>同車死亡</strong>: 同車乘客死亡。</li>
                    <li><strong>車體變形</strong>: 嚴重車體變形或凹陷 > 50 公分。</li>
                    <li><strong>脫困時間</strong>: 脫困時間 > 20 分鐘。</li>
                    <li><strong>行人/自行車</strong>: 被汽車撞擊且拋摔 > 3 公尺。</li>
                    <li><strong>穿刺傷</strong>: 頭、頸、胸、腹、鼠蹊部穿刺傷。</li>
                    <li><strong>燒燙傷</strong>: 二度以上燒燙傷面積 > 18% 或顏面、呼吸道燒燙傷。</li>
                    <li><strong>骨折</strong>: 兩處以上長骨骨折或骨盆骨折。</li>
                    <li><strong>癱瘓</strong>: 肢體癱瘓。</li>
                    <li><strong>截肢</strong>: 手腕或腳踝以上截肢。</li>
                </ul>
            </div>

            <h3>其他特殊危急狀況</h3>
            <div class='knowledge-item'>
                <ul>
                    <li><strong>OHCA</strong>: 到院前心肺功能停止。</li>
                    <li><strong>低血糖</strong>: 血糖 < 60 mg/dL 且意識不清。</li>
                    <li><strong>一氧化碳中毒</strong>: 懷疑 CO 中毒且意識不清。</li>
                    <li><strong>過敏性休克</strong>: 嚴重過敏反應導致休克。</li>
                    <li><strong>產科急症</strong>: 急產、胎盤脫出、臍帶脫垂。</li>
                </ul>
            </div>
        `
    },
    'chain_of_survival': {
        title: '生命之鍊 (Chain of Survival)',
        content: `
            <h3>成人生命之鍊 (Adult OHCA)</h3>
            <div class='knowledge-item'>
                <ol>
                    <li><strong>儘早求救 (Activation)</strong>: 立即撥打 119。</li>
                    <li><strong>高品質 CPR (High-Quality CPR)</strong>: 儘早開始壓胸。</li>
                    <li><strong>AED 電擊 (Defibrillation)</strong>: 儘早使用 AED。</li>
                    <li><strong>高級心臟救命術 (Advanced Resuscitation)</strong>: 救護人員或醫院執行。</li>
                    <li><strong>復甦後照護 (Post-Cardiac Arrest Care)</strong>: 醫院端照護。</li>
                    <li><strong>復原 (Recovery)</strong>: 出院後的復健與追蹤。</li>
                </ol>
            </div>

            <h3>兒童生命之鍊 (Pediatric OHCA)</h3>
            <div class='knowledge-item'>
                <ol>
                    <li><strong>預防 (Prevention)</strong>: 預防事故與傷害發生。</li>
                    <li><strong>儘早求救 (Activation)</strong>: 立即撥打 119。</li>
                    <li><strong>高品質 CPR (High-Quality CPR)</strong>: 儘早開始壓胸。</li>
                    <li><strong>高級心臟救命術 (Advanced Resuscitation)</strong>: 救護人員或醫院執行。</li>
                    <li><strong>復甦後照護 (Post-Cardiac Arrest Care)</strong>: 醫院端照護。</li>
                    <li><strong>復原 (Recovery)</strong>: 出院後的復健與追蹤。</li>
                </ol>
            </div>
        `
    },
    'airway_maintenance': {
        title: '維持呼吸道 (Airway Maintenance)',
        content: `
            <h3>口咽呼吸道 (OPA)</h3>
            <div class='knowledge-item'>
                <p><strong>適應症 (Indications)：</strong></p>
                <ul>
                    <li>意識不清 (無嘔吐反射)或OHCA 之傷病患。</li>
                    <li>呼吸道阻塞，需維持呼吸道暢通。</li>
                    <li>GCS三分以下。</li>
                </ul>
                <p><strong>禁忌症 (Contraindications)：</strong></p>
                <ul>
                    <li>意識清楚或有嘔吐反射。</li>
                    <li>口腔內有異物阻塞。</li>
                </ul>
                <p><strong>操作流程：</strong></p>
                <ol>
                    <li><strong>測量</strong>: 嘴角至耳垂，選擇適合的口咽呼吸道。</li>
                    <li><strong>置入</strong>: 凹面朝上置入，至硬顎處旋轉 180 度；或使用壓舌板輔助直接置入。</li>
                    <li><strong>確認</strong>: 確認呼吸道暢通，無嘔吐反射。</li>
                </ol>
            </div>

            <h3>鼻咽呼吸道 (NPA)</h3>
            <div class='knowledge-item'>
                <p><strong>適應症 (Indications)：</strong></p>
                <ul>
                    <li>意識不清但有嘔吐反射 (無法使用 OPA)。</li>
                    <li>牙關緊閉或口腔創傷。</li>
                </ul>
                <p><strong>禁忌症 (Contraindications)：</strong></p>
                <ul>
                    <li>懷疑顱底骨折 (熊貓眼、耳後瘀斑)。</li>
                    <li>顏面嚴重創傷。</li>
                    <li>鼻或耳有清澈液或血液流出。</li>
                </ul>
                <p><strong>操作流程：</strong></p>
                <ol>
                    <li><strong>測量</strong>: 鼻尖至耳垂。</li>
                    <li><strong>潤滑</strong>: 使用水溶性潤滑劑。</li>
                    <li><strong>置入</strong>: 上推鼻尖，選擇較大鼻孔，凹面朝向下，垂直臉部緩慢推入。若遇阻力，勿強行推入，可旋轉或換另一側鼻孔。</li>
                </ol>
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

// ==========================================
// GCS Assessment Logic
// ==========================================

let gcsQuestions = [];
let currentGCSIndex = 0;

function startGCSAssessment() {
    if (!gameData.gcsQuestions || gameData.gcsQuestions.length === 0) {
        alert("GCS 題目載入失敗！");
        return;
    }

    gcsQuestions = [...gameData.gcsQuestions];
    // Shuffle GCS questions
    shuffleDeck(gcsQuestions);
    currentGCSIndex = 0;

    showScreen('gcs-assessment');
    loadGCSQuestion();
}

function loadGCSQuestion() {
    const q = gcsQuestions[currentGCSIndex];
    if (!q) return;

    // Reset UI
    document.getElementById('gcs-question-title').innerText = q.title;
    document.getElementById('gcs-scenario-text').innerHTML = q.scenario;

    // Scroll to top
    document.getElementById('gcs-assessment').scrollTop = 0;

    // Reset Selects
    document.getElementById('gcs-e-select').value = "0";
    document.getElementById('gcs-v-select').value = "0";
    document.getElementById('gcs-m-select').value = "0";

    // Reset Result
    const resultBox = document.getElementById('gcs-result');
    resultBox.classList.add('hidden');
    resultBox.classList.remove('correct-box', 'wrong-box');

    // Enable Submit Button
    document.getElementById('gcs-submit-btn').disabled = false;
    document.getElementById('gcs-submit-btn').innerText = "提交答案";
}

function checkGCSAnswer() {
    const eVal = parseInt(document.getElementById('gcs-e-select').value);
    const vVal = parseInt(document.getElementById('gcs-v-select').value);
    const mVal = parseInt(document.getElementById('gcs-m-select').value);

    if (eVal === 0 || vVal === 0 || mVal === 0) {
        alert("請完成所有項目的評估！");
        return;
    }

    const q = gcsQuestions[currentGCSIndex];
    const isCorrect = (eVal === q.answer.e && vVal === q.answer.v && mVal === q.answer.m);

    showGCSResult(isCorrect, q);
}

function showGCSResult(isCorrect, q) {
    const resultBox = document.getElementById('gcs-result');
    const title = document.getElementById('gcs-result-title');
    const text = document.getElementById('gcs-result-text');
    const submitBtn = document.getElementById('gcs-submit-btn');

    resultBox.classList.remove('hidden');
    submitBtn.disabled = true;

    if (isCorrect) {
        resultBox.className = 'result-box correct-box';
        title.innerText = "答對了！";
        text.innerText = `太棒了！判斷完全正確。\n答案：${q.explanation}`;
    } else {
        resultBox.className = 'result-box wrong-box';
        title.innerText = "答錯了！";
        text.innerHTML = `正確答案是：<strong>${q.explanation}</strong><br>
                          您的回答：E${document.getElementById('gcs-e-select').value} 
                          V${document.getElementById('gcs-v-select').value} 
                          M${document.getElementById('gcs-m-select').value}`;
    }
}

function nextGCSQuestion() {
    currentGCSIndex++;
    if (currentGCSIndex >= gcsQuestions.length) {
        alert("恭喜！您已完成所有 GCS 練習題！");
        showScreen('main-menu');
    } else {
        loadGCSQuestion();
    }
}
