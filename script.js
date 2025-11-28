// Global state
let currentCategory = '';
let currentDeck = [];
let currentCardIndex = 0;

// Swipe state
let startX = 0;
let currentX = 0;
let isDragging = false;
const SWIPE_THRESHOLD = 100;

function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.menu-container');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });

    // Show the requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    } else if (screenId === 'test-mode') {
        alert('進入測試模式！(功能開發中)');
        document.getElementById('main-menu').classList.remove('hidden');
    }
}

function selectCategory(category) {
    currentCategory = category;
    let categoryName = '';
    let deckData = [];

    // Load data from gameData object (loaded from data.js)
    if (typeof gameData !== 'undefined') {
        deckData = gameData[category] || [];
    } else {
        alert('錯誤：無法載入資料檔案 (data.js)');
        return;
    }

    switch (category) {
        case 'regulations':
            categoryName = '法規';
            break;
        case 'assessment':
            categoryName = '急救評估';
            break;
        case 'methods':
            categoryName = '急救方法';
            break;
    }

    document.getElementById('category-title').innerText = categoryName;

    // Initialize deck
    if (deckData.length > 0) {
        // Create a copy of the deck to shuffle
        currentDeck = [...deckData];
        shuffleDeck(currentDeck);
        currentCardIndex = 0;
        showScreen('card-display');
        displayCard();
    } else {
        alert('此類別目前沒有資料！');
    }
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function displayCard() {
    const cardContainer = document.getElementById('flashcard');
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');

    // Reset animation classes
    cardContainer.className = 'card-container slide-in';
    cardContainer.style.transform = '';

    if (currentDeck.length === 0) return;

    // Check if we need to reshuffle (if we reached the end)
    if (currentCardIndex >= currentDeck.length) {
        // Reshuffle and start over to ensure non-repeating sequence until all shown
        shuffleDeck(currentDeck);
        currentCardIndex = 0;
        // Ensure the new first card isn't the same as the last one we just showed (if possible)
        if (currentDeck.length > 1 && currentDeck[0].id === currentDeck[currentDeck.length - 1].id) {
            // Swap first with second
            [currentDeck[0], currentDeck[1]] = [currentDeck[1], currentDeck[0]];
        }
    }

    const card = currentDeck[currentCardIndex];
    questionText.innerText = card.question;
    answerText.innerText = card.answer;
}

function nextCard(direction) {
    const cardContainer = document.getElementById('flashcard');

    // Add exit animation
    if (direction === 'left') {
        cardContainer.classList.add('slide-out-left');
    } else {
        cardContainer.classList.add('slide-out-right');
    }

    // Wait for animation to finish then show next card
    setTimeout(() => {
        currentCardIndex++;
        displayCard();
    }, 300);
}

// Swipe Event Listeners
const cardElement = document.getElementById('flashcard');

if (cardElement) {
    // Touch Events
    cardElement.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        cardElement.style.transition = 'none'; // Disable transition for direct following
    });

    cardElement.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const deltaX = currentX - startX;
        const rotation = deltaX * 0.1; // Slight rotation
        cardElement.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });

    cardElement.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        cardElement.style.transition = 'transform 0.3s ease-out'; // Re-enable transition

        const deltaX = currentX - startX;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
                nextCard('right');
            } else {
                nextCard('left');
            }
        } else {
            // Reset position
            cardElement.style.transform = '';
        }
    });

    // Mouse Events (for desktop testing)
    cardElement.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        cardElement.style.transition = 'none';
        cardElement.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX;
        const deltaX = currentX - startX;
        const rotation = deltaX * 0.1;
        cardElement.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        cardElement.style.cursor = 'grab';
        cardElement.style.transition = 'transform 0.3s ease-out';

        const deltaX = currentX - startX;
        // Only trigger if we actually moved
        if (currentX !== 0 && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
                nextCard('right');
            } else {
                nextCard('left');
            }
        } else {
            cardElement.style.transform = '';
        }
        currentX = 0; // Reset
    });
}
