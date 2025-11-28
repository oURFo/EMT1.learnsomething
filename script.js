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
        alert("資料載入失敗，請檢查 data.js");
        return;
    }

    // Add swipe listeners
    const cardContainer = document.getElementById('flashcard');
    cardContainer.addEventListener('mousedown', handleTouchStart);
    cardContainer.addEventListener('touchstart', handleTouchStart);

    document.addEventListener('mousemove', handleTouchMove);
    document.addEventListener('touchmove', handleTouchMove);

    document.addEventListener('mouseup', handleTouchEnd);
    document.addEventListener('touchend', handleTouchEnd);
});

// Screen Navigation
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.menu-container').forEach(el => {
        el.classList.add('hidden');
    });

    // Show target screen
    document.getElementById(screenId).classList.remove('hidden');

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
        alert("此類別暫無資料！");
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
        alert("此類別題目不足，無法開始測驗！");
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
        distractors.push("無其他選項");
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
        list.innerHTML = '<p style="text-align:center; color:#27ae60;">太棒了！全對！🎉</p>';
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
