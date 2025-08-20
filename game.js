let currentTopic = null;
let currentMode = null;
let currentWords = [];
let currentWordIndex = 0;
let score = 0;
let streak = 0;
let totalWords = 10;
let correctAnswers = 0;
let recognition = null;
let currentGameMode = null;
let currentPracticeMode = 'write';
let gameStarted = false;
let speechSynthesis = window.speechSynthesis;
let isListening = false;
let speechTimeout = null;
let wordStartTime = null;
let perfectAnswers = 0;
let comboMultiplier = 1;
let audioContext = null;
let soundEffectsEnabled = true;

// Kannustavat virhepalautteet
function getEncouragingFeedback() {
    const messages = [
        '💡 Hyvä yritys!',
        '🌟 Lähellä oli!',
        '🎯 Melkein osui!', 
        '💪 Ei haittaa!',
        '🔥 Kokeile uudelleen!',
        '⭐ Oppiminen jatkuu!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getMotivationalTip() {
    const tips = [
        'Virheistä oppii parhaiten!',
        'Jokainen yritys vie eteenpäin!',
        'Muista tämä ensi kerralla!',
        'Opit pian!',
        'Harjoitus tekee mestarin!',
        'Hyvin meni, jatka vain!'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

const screens = {
    menu: document.getElementById('menu-screen'),
    mode: document.getElementById('mode-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if (screenName === 'mode') {
        updateModeScreen();
    } else if (screenName === 'menu') {
        updateTopicTiers();
    }
}

function updateModeScreen() {
    // Näytä nykyinen aihe
    const topicNames = {
        animals: 'Eläimet',
        colors: 'Värit', 
        numbers: 'Numerot',
        food: 'Ruoka',
        family: 'Perhe',
        school: 'Koulu',
        body: 'Keho',
        clothes: 'Vaatteet'
    };
    const topicName = topicNames[currentTopic] || currentTopic;
    document.getElementById('current-topic-name').textContent = topicName;
    document.getElementById('current-topic-name-title').textContent = topicName;
    
    updateTopicProgressDisplay();
    updateGameModeUnlocks();
}

function updateGameBreadcrumb() {
    const topicNames = {
        animals: 'Eläimet',
        colors: 'Värit', 
        numbers: 'Numerot',
        food: 'Ruoka',
        family: 'Perhe',
        school: 'Koulu',
        body: 'Keho',
        clothes: 'Vaatteet'
    };
    
    const modeNames = {
        learn: 'Oppiminen',
        choice: 'Monivalinta', 
        practice: 'Kirjoitus',
        listen: 'Kuuntelu'
    };
    
    const topicName = topicNames[currentTopic] || currentTopic;
    const modeName = modeNames[currentGameMode] || currentGameMode;
    
    // Update game screen breadcrumb
    if (document.getElementById('game-topic-name')) {
        document.getElementById('game-topic-name').textContent = topicName;
    }
    if (document.getElementById('game-mode-name')) {
        document.getElementById('game-mode-name').textContent = modeName;
    }
    
    // Update results screen breadcrumb  
    if (document.getElementById('results-topic-name')) {
        document.getElementById('results-topic-name').textContent = topicName;
    }
}

function updateTopicProgressDisplay() {
    const progress = progressTracker.getTopicProgress(currentTopic);
    document.getElementById('topic-progress').textContent = progress;
    
    const progressBar = document.getElementById('progress-fill');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    
    // Päivitä mastery-tilastot
    const stats = progressTracker.getMasteryStats(currentTopic);
    if (stats) {
        document.getElementById('mastered-count').textContent = stats.mastered;
        document.getElementById('expert-count').textContent = stats.expert;
        document.getElementById('strong-count').textContent = stats.strong;
        document.getElementById('good-count').textContent = stats.good;
        document.getElementById('learning-count').textContent = stats.learning;
        document.getElementById('rookie-count').textContent = stats.rookie;
    }
}

function updateGameModeUnlocks() {
    const topicStats = progressTracker.getMasteryStats(currentTopic);
    if (!topicStats) return;
    
    const learnProgress = getGameModeProgress(currentTopic, 'learn');
    const practiceProgress = getGameModeProgress(currentTopic, 'practice');
    const choiceProgress = getGameModeProgress(currentTopic, 'choice');
    
    // Oppiminen - aina saatavilla
    document.getElementById('learn-progress').style.width = learnProgress + '%';
    document.getElementById('learn-progress-text').textContent = learnProgress + '%';
    
    // Monivalinta - 30% oppimisesta (helpoin)
    const choiceCard = document.getElementById('choice-card');
    const choiceBtn = choiceCard.querySelector('button');
    const choiceReq = document.getElementById('choice-requirement');
    const choiceIndicator = choiceCard.querySelector('.progress-indicator');
    
    if (learnProgress >= 30) {
        choiceCard.classList.add('available');
        choiceCard.classList.remove('locked');
        choiceBtn.disabled = false;
        choiceReq.style.display = 'none';
        choiceIndicator.classList.remove('hidden');
        document.getElementById('choice-progress').style.width = choiceProgress + '%';
        document.getElementById('choice-progress-text').textContent = choiceProgress + '%';
    } else {
        choiceCard.classList.remove('available');
        choiceCard.classList.add('locked');
        choiceBtn.disabled = true;
        choiceReq.style.display = 'block';
        choiceReq.textContent = `🔒 Avautuu kun oppiminen 30% valmis (nyt ${learnProgress}%)`;
        choiceIndicator.classList.add('hidden');
    }
    
    // Kirjoitusharjoitus - 50% monivalinnasta
    const practiceCard = document.getElementById('practice-card');
    const practiceBtn = practiceCard.querySelector('button');
    const practiceReq = document.getElementById('practice-requirement');
    const practiceIndicator = practiceCard.querySelector('.progress-indicator');
    
    if (choiceProgress >= 50) {
        practiceCard.classList.add('available');
        practiceCard.classList.remove('locked');
        practiceBtn.disabled = false;
        practiceReq.style.display = 'none';
        practiceIndicator.classList.remove('hidden');
        document.getElementById('practice-progress').style.width = practiceProgress + '%';
        document.getElementById('practice-progress-text').textContent = practiceProgress + '%';
    } else {
        practiceCard.classList.remove('available');
        practiceCard.classList.add('locked');
        practiceBtn.disabled = true;
        practiceReq.style.display = 'block';
        practiceReq.textContent = `🔒 Avautuu kun monivalinta 50% valmis (nyt ${choiceProgress}%)`;
        practiceIndicator.classList.add('hidden');
    }
    
    // Kuunteluharjoitus - 70% kirjoitusharjoituksesta (vaikein)
    const listenCard = document.getElementById('listen-card');
    const listenBtn = listenCard.querySelector('button');
    const listenReq = document.getElementById('listen-requirement');
    const listenIndicator = listenCard.querySelector('.progress-indicator');
    const listenProgress = getGameModeProgress(currentTopic, 'listen');
    
    if (practiceProgress >= 70) {
        listenCard.classList.add('available');
        listenCard.classList.remove('locked');
        listenBtn.disabled = false;
        listenReq.style.display = 'none';
        listenIndicator.classList.remove('hidden');
        document.getElementById('listen-progress').style.width = listenProgress + '%';
        document.getElementById('listen-progress-text').textContent = listenProgress + '%';
    } else {
        listenCard.classList.remove('available');
        listenCard.classList.add('locked');
        listenBtn.disabled = true;
        listenReq.style.display = 'block';
        listenReq.textContent = `🔒 Avautuu kun kirjoitusharjoitus 70% valmis (nyt ${practiceProgress}%)`;
        listenIndicator.classList.add('hidden');
    }
}

function getGameModeProgress(topic, mode) {
    const topicData = progressTracker.progress.topics[topic];
    if (!topicData) return 0;
    
    const words = Object.values(topicData.words);
    const totalWords = words.length;
    
    // Laske kuinka monta sanaa on "hallittu" tässä pelimoodissa
    let completedWords = 0;
    
    words.forEach(wordProgress => {
        // Eri kriteerit eri pelimoodeille
        switch(mode) {
            case 'learn':
                // Oppiminen: sana on nähty ainakin kerran
                if (wordProgress.attempts > 0) completedWords++;
                break;
            case 'practice':
                // Harjoittelu: vähintään 70% oikeellisuus ja 2+ yritystä
                if (wordProgress.attempts >= 2 && (wordProgress.correct / wordProgress.attempts) >= 0.7) {
                    completedWords++;
                }
                break;
            case 'choice':
                // Monivalinta: vähintään 80% oikeellisuus ja 3+ yritystä
                if (wordProgress.attempts >= 3 && (wordProgress.correct / wordProgress.attempts) >= 0.8) {
                    completedWords++;
                }
                break;
            case 'listen':
                // Kuuntelu: vähintään 90% oikeellisuus ja 5+ yritystä  
                if (wordProgress.attempts >= 5 && (wordProgress.correct / wordProgress.attempts) >= 0.9) {
                    completedWords++;
                }
                break;
        }
    });
    
    return totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0;
}

function updateTopicTiers() {
    const basicTopics = ['animals', 'colors', 'numbers'];
    const intermediateTopics = ['food', 'family'];
    const advancedTopics = ['school', 'body', 'clothes'];
    
    // Päivitä jokaisen aiheen progresspalkit
    const allTopics = [...basicTopics, ...intermediateTopics, ...advancedTopics];
    allTopics.forEach(topic => {
        const progress = progressTracker.getTopicProgress(topic);
        const progressFill = document.getElementById(`progress-${topic}`);
        const progressText = document.getElementById(`progress-text-${topic}`);
        
        if (progressFill && progressText) {
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
    });
    
    // Laske perusteiden edistyminen
    const basicProgress = basicTopics.reduce((sum, topic) => {
        return sum + progressTracker.getTopicProgress(topic);
    }, 0) / basicTopics.length;
    
    // Laske keskitason edistyminen
    const intermediateProgress = intermediateTopics.reduce((sum, topic) => {
        return sum + progressTracker.getTopicProgress(topic);
    }, 0) / intermediateTopics.length;
    
    // Lukitse/avaa tasot
    const intermediateTier = document.getElementById('intermediate-tier');
    const advancedTier = document.getElementById('advanced-tier');
    
    // Keskitaso
    if (basicProgress >= 50) {
        intermediateTier.classList.remove('locked');
        intermediateTopics.forEach(topic => {
            const btn = document.querySelector(`[data-topic="${topic}"]`);
            if (btn) btn.disabled = false;
        });
    } else {
        intermediateTier.classList.add('locked');
        intermediateTopics.forEach(topic => {
            const btn = document.querySelector(`[data-topic="${topic}"]`);
            if (btn) btn.disabled = true;
        });
    }
    
    // Edistynyt taso
    if (intermediateProgress >= 70) {
        advancedTier.classList.remove('locked');
        advancedTopics.forEach(topic => {
            const btn = document.querySelector(`[data-topic="${topic}"]`);
            if (btn) btn.disabled = false;
        });
    } else {
        advancedTier.classList.add('locked');
        advancedTopics.forEach(topic => {
            const btn = document.querySelector(`[data-topic="${topic}"]`);
            if (btn) btn.disabled = true;
        });
    }
}

document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.target.disabled) {
            return; // Älä anna klikata lukittuja aiheita
        }
        currentTopic = e.target.dataset.topic;
        showScreen('mode');
    });
});

// Äänitehosteiden alustus
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        // Web Audio API ei ole tuettu
        soundEffectsEnabled = false;
    }
}

// Luo synteettisiä ääniä
function playSound(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioContext || !soundEffectsEnabled) return;
    
    try {
        // Resume AudioContext jos se on suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Äänitehoste epäonnistui
    }
}

// Pelaa onnistumisääni
function playSuccessSound() {
    if (!soundEffectsEnabled) return;
    
    // Melodinen onnistumisääni (C-E-G chord arpeggio)
    setTimeout(() => playSound(523.25, 0.15), 0);    // C5
    setTimeout(() => playSound(659.25, 0.15), 100);  // E5
    setTimeout(() => playSound(783.99, 0.3), 200);   // G5
}

// Pelaa epäonnistumisääni
function playErrorSound() {
    if (!soundEffectsEnabled) return;
    
    // Laskeva sävel
    playSound(330, 0.1, 'sawtooth');
    setTimeout(() => playSound(220, 0.2, 'sawtooth'), 150);
}

// Pelaa streak-ääni
function playStreakSound(streakLength) {
    if (!soundEffectsEnabled) return;
    
    const baseFreq = 440;
    const steps = Math.min(streakLength, 8);
    
    for (let i = 0; i < steps; i++) {
        const freq = baseFreq * Math.pow(1.125, i); // Pentatonic-ish scale
        setTimeout(() => playSound(freq, 0.1, 'square', 0.05), i * 50);
    }
}

// Pelaa perfect-ääni
function playPerfectSound() {
    if (!soundEffectsEnabled) return;
    
    // Korkeampi, kirkkaampi ääni
    setTimeout(() => playSound(880, 0.1), 0);
    setTimeout(() => playSound(1046.5, 0.15), 100);
    setTimeout(() => playSound(1318.5, 0.2), 200);
}

// Pelaa level up -ääni
function playLevelUpSound() {
    if (!soundEffectsEnabled) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C-E-G-C octave
    notes.forEach((freq, index) => {
        setTimeout(() => playSound(freq, 0.2, 'triangle'), index * 100);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    document.querySelectorAll('.mode-btn[data-gamemode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentGameMode = e.target.dataset.gamemode;
            startGame();
        });
    });
    
    document.getElementById('write-toggle').addEventListener('click', () => {
        switchPracticeMode('write');
    });
    
    document.getElementById('speak-toggle').addEventListener('click', () => {
        switchPracticeMode('speak');
    });
    
    document.getElementById('listen-word').addEventListener('click', () => {
        playAudioWithAnimation();
    });
    
    document.getElementById('got-it').addEventListener('click', () => {
        nextWord();
    });
    
    // Monivalintanapit
    document.querySelectorAll('#choice-area .choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const choice = parseInt(e.target.dataset.choice);
            handleChoiceAnswer(choice, 'choice');
        });
    });
    
    // Kuuntelunapit
    document.querySelectorAll('#listen-area .choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const choice = parseInt(e.target.dataset.choice);
            handleChoiceAnswer(choice, 'listen');
        });
    });
    
    // Kuuntelu uudelleen -nappi
    document.getElementById('listen-word-again').addEventListener('click', () => {
        playListenWordWithAnimation();
    });
    
    // Näppäinkomennot
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Ääniasetusten toggle
    const soundToggle = document.createElement('button');
    soundToggle.innerHTML = soundEffectsEnabled ? '🔊' : '🔇';
    soundToggle.style.position = 'fixed';
    soundToggle.style.top = '10px';
    soundToggle.style.right = '10px';
    soundToggle.style.background = 'rgba(0,0,0,0.1)';
    soundToggle.style.border = 'none';
    soundToggle.style.borderRadius = '50px';
    soundToggle.style.width = '40px';
    soundToggle.style.height = '40px';
    soundToggle.style.fontSize = '1.2em';
    soundToggle.style.cursor = 'pointer';
    soundToggle.style.zIndex = '1000';
    soundToggle.title = 'Kytke äänitehosteet päälle/pois';
    
    soundToggle.addEventListener('click', () => {
        soundEffectsEnabled = !soundEffectsEnabled;
        soundToggle.innerHTML = soundEffectsEnabled ? '🔊' : '🔇';
        if (soundEffectsEnabled) {
            initAudio();
            playSuccessSound(); // Testimerkki
        }
    });
    
    document.body.appendChild(soundToggle);
    
    // Emoji-klikkaus
    document.getElementById('word-image').addEventListener('click', () => {
        if (currentGameMode === 'learn') {
            playAudioWithAnimation();
        }
    });
});

function startGame() {
    score = 0;
    streak = 0;
    correctAnswers = 0;
    perfectAnswers = 0;
    currentWordIndex = 0;
    comboMultiplier = 1;
    wordStartTime = null;
    gameStarted = false;
    
    updateScore();
    updateProgressBar();
    
    if (currentGameMode === 'learn') {
        totalWords = 5;
        currentWords = progressTracker.getWordsForPractice(currentTopic, totalWords);
    } else {
        const topicWords = [...wordDatabase[currentTopic]];
        currentWords = [];
        for (let i = 0; i < Math.min(totalWords, topicWords.length); i++) {
            const randomIndex = Math.floor(Math.random() * topicWords.length);
            currentWords.push(topicWords.splice(randomIndex, 1)[0]);
        }
    }
    
    showScreen('game');
    updateGameBreadcrumb();
    
    document.getElementById('learn-area').style.display = 'none';
    document.getElementById('practice-area').style.display = 'none';
    document.getElementById('choice-area').style.display = 'none';
    document.getElementById('listen-area').style.display = 'none';
    
    if (currentGameMode === 'learn') {
        document.getElementById('learn-area').style.display = 'block';
    } else if (currentGameMode === 'practice') {
        document.getElementById('practice-area').style.display = 'block';
        initSpeechRecognition();
    } else if (currentGameMode === 'choice') {
        document.getElementById('choice-area').style.display = 'block';
    } else if (currentGameMode === 'listen') {
        document.getElementById('listen-area').style.display = 'block';
    }
    
    showWord();
}

function showWord() {
    if (currentWordIndex >= currentWords.length) {
        // Tarkista onko peli edes aloitettu
        if (gameStarted) {
            endGame();
        } else {
            // Jos ei ole aloitettu peliä, palaa takaisin
            showScreen('mode');
        }
        return;
    }
    
    // Merkitse peli aloitetuksi kun näytetään ensimmäinen sana
    if (currentWordIndex === 0) {
        gameStarted = true;
    }
    
    const word = currentWords[currentWordIndex];
    
    // Kuunteluharjoituksessa ei näytetä suomenkielistä sanaa
    if (currentGameMode === 'listen') {
        document.getElementById('finnish-word').textContent = '🎧 Kuuntele ja valitse';
    } else {
        document.getElementById('finnish-word').textContent = word.finnish;
    }
    
    document.getElementById('word-image').textContent = word.emoji;
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('next-word').style.display = 'none';
    
    // Aloita ajanlaskenta nopeuspisteitiä varten
    wordStartTime = Date.now();
    
    if (currentGameMode === 'learn') {
        showLearnWord();
    } else if (currentGameMode === 'practice') {
        if (currentPracticeMode === 'write') {
            document.getElementById('answer-input').value = '';
            document.getElementById('answer-input').focus();
            document.getElementById('submit-answer').disabled = false;
            document.getElementById('answer-input').disabled = false;
        } else {
            document.getElementById('start-speaking').disabled = false;
        }
    } else if (currentGameMode === 'choice') {
        showChoices();
    } else if (currentGameMode === 'listen') {
        showListenChoices();
        // Toista sana automaattisesti kuunteluharjoituksessa
        setTimeout(() => {
            speakWord(word.english);
        }, 500);
    }
    
    // Näytä vaikeusaste ja mastery-taso
    displayWordDifficulty(word);
    displayWordMastery(word);
}

function displayWordDifficulty(word) {
    const difficultyColors = {
        easy: '#4caf50',
        medium: '#ff9800', 
        hard: '#f44336'
    };
    
    const difficultyTexts = {
        easy: 'Helppo 😊',
        medium: 'Keskitaso 😐',
        hard: 'Vaikea 😤'
    };
    
    const difficulty = word.difficulty || 'medium';
    const wordEl = document.getElementById('finnish-word');
    
    // Lisää vaikeusaste-indikaattori
    let difficultyEl = document.getElementById('difficulty-indicator');
    if (!difficultyEl) {
        difficultyEl = document.createElement('div');
        difficultyEl.id = 'difficulty-indicator';
        wordEl.parentNode.appendChild(difficultyEl);
    }
    
    difficultyEl.textContent = difficultyTexts[difficulty];
    difficultyEl.style.color = difficultyColors[difficulty];
    difficultyEl.style.fontSize = '0.9em';
    difficultyEl.style.marginTop = '5px';
    difficultyEl.style.fontWeight = 'normal';
}

function displayWordMastery(word) {
    if (!currentTopic) return;
    
    const masteryInfo = progressTracker.getWordMastery(currentTopic, word.english);
    const wordEl = document.getElementById('finnish-word');
    
    // Lisää mastery-indikaattori
    let masteryEl = document.getElementById('mastery-indicator');
    if (!masteryEl) {
        masteryEl = document.createElement('div');
        masteryEl.id = 'mastery-indicator';
        masteryEl.className = 'word-mastery-indicator';
        wordEl.parentNode.appendChild(masteryEl);
    }
    
    // Värikoodi mastery-tasojen mukaan
    const levelColors = {
        0: '#95a5a6', // Aloittelija
        1: '#3498db', // Oppija
        2: '#f39c12', // Hyvä
        3: '#e74c3c', // Vahva
        4: '#9b59b6', // Asiantuntuja
        5: '#2ecc71'  // Mestari
    };
    
    const levelIndex = Math.min(Math.floor(masteryInfo.level), 5);
    const color = levelColors[levelIndex];
    
    masteryEl.innerHTML = `
        <span style="color: ${color}">${masteryInfo.icon}</span>
        <span style="color: ${color}">${masteryInfo.name}</span>
        <span style="font-size: 0.7em; opacity: 0.8;">(${masteryInfo.attempts} yritystä)</span>
    `;
    
    masteryEl.title = `Taso: ${masteryInfo.level.toFixed(1)}/5
Oikeita: ${masteryInfo.correct}/${masteryInfo.attempts}
Peräkkäisiä oikeita: ${masteryInfo.consecutiveCorrect}
Keskim. aika: ${masteryInfo.avgTime.toFixed(1)}s`;
}

function showLearnWord() {
    const currentWord = currentWords[currentWordIndex];
    
    // Suuret englanninkieliset sanat
    document.getElementById('english-word-display').textContent = currentWord.english;
    document.getElementById('phonetic-text').textContent = phoneticData[currentWord.english] || '';
    
    // Oppimistip
    const tip = learningTips[currentWord.english] || 'Toista sana ääneen useita kertoja!';
    document.getElementById('learn-tip').textContent = tip;
    
    // Esimerkkilause
    const example = getExampleSentence(currentWord);
    document.getElementById('sentence-text').innerHTML = `
        <strong>🇬🇧 ${example.english}</strong><br>
        <em>🇫🇮 ${example.finnish}</em>
    `;
    
    // Muistiapu
    document.getElementById('memory-aid').textContent = getMemoryAid(currentWord);
    
    // Alusta toiminnallisuudet
    setupLearnModeButtons(currentWord);
    
    setTimeout(() => {
        speakWord(currentWord.english);
    }, 500);
}

function getExampleSentence(word) {
    const examples = {
        // Eläimet
        dog: { english: 'The dog is playing in the park.', finnish: 'Koira leikkii puistossa.' },
        cat: { english: 'The cat is sleeping on the bed.', finnish: 'Kissa nukkuu sängyllä.' },
        bird: { english: 'The bird flies high in the sky.', finnish: 'Lintu lentää korkealla taivaalla.' },
        fish: { english: 'The fish swims in the water.', finnish: 'Kala ui vedessä.' },
        horse: { english: 'The horse runs fast.', finnish: 'Hevonen juoksee nopeasti.' },
        cow: { english: 'The cow gives milk.', finnish: 'Lehmä antaa maitoa.' },
        pig: { english: 'The pig is pink and round.', finnish: 'Sika on vaaleanpunainen ja pyöreä.' },
        
        // Värit
        red: { english: 'The apple is red.', finnish: 'Omena on punainen.' },
        blue: { english: 'The sky is blue.', finnish: 'Taivas on sininen.' },
        yellow: { english: 'The sun is yellow.', finnish: 'Aurinko on keltainen.' },
        green: { english: 'The grass is green.', finnish: 'Ruoho on vihreää.' },
        
        // Numerot
        one: { english: 'I have one apple.', finnish: 'Minulla on yksi omena.' },
        two: { english: 'Two cats are playing.', finnish: 'Kaksi kissaa leikkii.' },
        three: { english: 'Three birds in the tree.', finnish: 'Kolme lintua puussa.' }
    };
    
    return examples[word.english] || {
        english: `This is a ${word.english}.`,
        finnish: `Tämä on ${word.finnish}.`
    };
}

function getMemoryAid(word) {
    const aids = {
        // Eläimet
        dog: '🐕 DOG kuulostaa suomeksi "toki" - toki koira on ihmisen paras ystävä!',
        cat: '🐈 CAT alkaa samalla tavalla kuin "katti" (kissanpentu)!',
        bird: '🐦 BIRD - "Bööördi" kuulostaa linnun ääneltä!',
        fish: '🐟 FISH - "Fiish" kuulostaa kalan ui-ääneltä vedessä!',
        horse: '🐴 HORSE - "Hööörse" kuulostaa hevosen hirnunnalta!',
        cow: '🐄 COW - "Kau" on lähellä lehmän "muu" ääntä!',
        pig: '🐷 PIG - Lyhyt ja napakka kuten sian kähinä!',
        
        // Värit
        red: '🔴 RED - "Red" kuulostaa samalta kuin se näyttää - tulisen punaiselta!',
        blue: '🔵 BLUE - "Bluu" on helppo muistaa, kuulostaa "siniseltä"!',
        yellow: '🟡 YELLOW - "Jellou" kuin auringon säteily!',
        green: '🟢 GREEN - "Griin" kuin nurmikon vihreä väri!',
        
        // Numerot
        one: '1️⃣ ONE - "Van" kuulostaa "yhdeltä"!',
        two: '2️⃣ TWO - "Tuu" kuulostaa "toiselta"!',
        three: '3️⃣ THREE - "Trii" kuulostaa "kolmelta"!'
    };
    
    return aids[word.english] || `💡 Yritä yhdistää "${word.english}" johonkin tuttuun sanaan tai äänteeseen!`;
}

function setupLearnModeButtons(word) {
    // Toista sana uudelleen
    document.getElementById('repeat-word').onclick = () => {
        speakWord(word.english);
    };
    
    // Kuuntele esimerkkilause
    document.getElementById('listen-sentence').onclick = () => {
        const example = getExampleSentence(word);
        speakWord(example.english);
    };
    
    // Ääntämisharjoitus
    document.getElementById('practice-pronunciation').onclick = () => {
        startPronunciationPractice(word);
    };
}

function startPronunciationPractice(word) {
    const feedbackEl = document.getElementById('pronunciation-feedback');
    feedbackEl.textContent = '🎤 Sano sana ääneen...';
    feedbackEl.className = 'pronunciation-feedback';
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const said = event.results[0][0].transcript.toLowerCase().trim();
            const target = word.english.toLowerCase();
            
            if (said === target) {
                feedbackEl.textContent = '🎉 Erinomaista! Ääntäminen oli oikein!';
                feedbackEl.className = 'pronunciation-feedback correct';
                playSuccessSound();
            } else {
                feedbackEl.textContent = `🤔 Kuulin "${said}". Yritä sanoa "${word.english}" uudelleen.`;
                feedbackEl.className = 'pronunciation-feedback incorrect';
            }
        };
        
        recognition.onerror = () => {
            feedbackEl.textContent = '❌ Puheentunnistus ei toiminut. Yritä uudelleen.';
            feedbackEl.className = 'pronunciation-feedback incorrect';
        };
        
        recognition.start();
    } else {
        feedbackEl.textContent = '❌ Selaimesi ei tue puheentunnistusta.';
        feedbackEl.className = 'pronunciation-feedback incorrect';
    }
}

function speakWord(word) {
    if (speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

function playAudioWithAnimation() {
    const currentWord = currentWords[currentWordIndex];
    const listenBtn = document.getElementById('listen-word');
    
    // Animaatio kuuntelunappiin
    listenBtn.classList.add('playing');
    
    speakWord(currentWord.english);
    
    // Poista animaatio 2 sekunnin kuluttua
    setTimeout(() => {
        listenBtn.classList.remove('playing');
    }, 2000);
}

function handleKeyboardShortcuts(event) {
    // Estä oletustoiminnot vain tietyille näppäimille
    if (['Enter', ' ', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(event.key)) {
        const activeScreen = document.querySelector('.screen.active').id;
        
        switch (event.key) {
            case 'Enter':
                handleEnterKey(activeScreen);
                event.preventDefault();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                if (activeScreen === 'game-screen' && (currentGameMode === 'choice' || currentGameMode === 'listen')) {
                    const choiceIndex = parseInt(event.key) - 1;
                    const area = currentGameMode === 'choice' ? 'choice-area' : 'listen-area';
                    const button = document.querySelector(`#${area} .choice-btn[data-choice="${choiceIndex}"]`);
                    if (button && !button.disabled) {
                        button.click();
                        event.preventDefault();
                    }
                }
                break;
            case ' ':
                if (activeScreen === 'game-screen' && currentGameMode === 'learn') {
                    playAudioWithAnimation();
                    event.preventDefault();
                }
                break;
            case 'ArrowRight':
                if (activeScreen === 'game-screen' && document.getElementById('next-word').style.display !== 'none') {
                    nextWord();
                    event.preventDefault();
                }
                break;
            case 'ArrowLeft':
                handleBackNavigation(activeScreen);
                event.preventDefault();
                break;
            case 'Escape':
                handleBackNavigation(activeScreen);
                event.preventDefault();
                break;
        }
    }
}

function handleEnterKey(activeScreen) {
    switch (activeScreen) {
        case 'game-screen':
            if (currentGameMode === 'learn') {
                nextWord();
            } else if (currentGameMode === 'practice') {
                if (currentPracticeMode === 'write') {
                    const submitBtn = document.getElementById('submit-answer');
                    if (!submitBtn.disabled) {
                        const answer = document.getElementById('answer-input').value.trim().toLowerCase();
                        if (answer) checkAnswer(answer);
                    }
                } else {
                    const nextBtn = document.getElementById('next-word');
                    if (nextBtn.style.display !== 'none') {
                        nextWord();
                    }
                }
            }
            break;
        case 'results-screen':
            const playAgainBtn = document.getElementById('play-again');
            if (playAgainBtn) playAgainBtn.click();
            break;
    }
}

function handleBackNavigation(activeScreen) {
    switch (activeScreen) {
        case 'game-screen':
            showScreen('mode');
            break;
        case 'mode-screen':
            showScreen('menu');
            break;
        case 'results-screen':
            showScreen('menu');
            break;
    }
}

function switchPracticeMode(mode) {
    currentPracticeMode = mode;
    
    document.querySelectorAll('.mode-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + '-toggle').classList.add('active');
    
    document.getElementById('write-practice').style.display = mode === 'write' ? 'block' : 'none';
    document.getElementById('speak-practice').style.display = mode === 'speak' ? 'block' : 'none';
    
    if (mode === 'write') {
        document.getElementById('answer-input').focus();
    }
}

function nextWord() {
    currentWordIndex++;
    showWord();
}

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true; // Näytä väliaikaiset tulokset
        recognition.maxAlternatives = 3; // Useampia vaihtoehtoja
        
        recognition.onresult = (event) => {
            if (!isListening) return;
            
            const result = event.results[event.results.length - 1];
            
            // Jos tulos on lopullinen (isFinal = true)
            if (result.isFinal) {
                const transcript = result[0].transcript.toLowerCase().trim();
                const confidence = result[0].confidence || 0;
                
                // Lopeta visualisointi
                stopMicrophoneVisualization();
                
                // Näytä tulos ja luottamustaso
                const feedbackEl = document.getElementById('speech-feedback');
                const confidencePercent = Math.round(confidence * 100);
                feedbackEl.innerHTML = `🎤 Kuulin: "<strong>${transcript}</strong>" (${confidencePercent}% varmuus)`;
                
                isListening = false;
                
                // Lopullinen puheentunnistustulos
                
                // Vältetään palauteluuppi odottamalla hetki ennen vastauksen tarkistusta
                setTimeout(() => {
                    checkAnswer(transcript);
                }, 200);
            } else {
                // Väliaikainen tulos - näytä vain palautteena
                const transcript = result[0].transcript.toLowerCase().trim();
                const feedbackEl = document.getElementById('speech-feedback');
                feedbackEl.innerHTML = `🎤 Kuuntelen: "${transcript}..."<br><span style="font-size: 0.8em; color: #666;">Jatka puhumista...</span>`;
                
                // Väliaikainen puheentunnistustulos
            }
        };
        
        recognition.onerror = (event) => {
            isListening = false;
            // Puheentunnistusvirhe
            
            stopMicrophoneVisualization();
            
            let errorMessage = '😕 En kuullut selvästi, yritä uudelleen!';
            let errorIcon = '⚠️';
            
            if (event.error === 'not-allowed') {
                errorMessage = 'Mikrofonin käyttö estetty. Anna lupa selaimessa!';
                errorIcon = '🎤';
            } else if (event.error === 'no-speech') {
                errorMessage = 'En kuullut mitään. Sano sana selkeästi ja hitaasti!';
                errorIcon = '🔇';
            } else if (event.error === 'network') {
                errorMessage = 'Verkkovirhe. Tarkista internetyhteys!';
                errorIcon = '🌐';
            } else if (event.error === 'aborted') {
                errorMessage = 'Kuuntelu keskeytetty. Yritä uudelleen!';
                errorIcon = '⏹️';
            } else if (event.error === 'audio-capture') {
                errorMessage = 'Mikrofoniongelma. Tarkista mikrofonin toimivuus!';
                errorIcon = '🎤';
            }
            
            document.getElementById('speech-feedback').innerHTML = `${errorIcon} ${errorMessage}`;
            
            const speakBtn = document.getElementById('start-speaking');
            speakBtn.textContent = '🎤 Paina ja sano sana englanniksi';
            speakBtn.disabled = false;
            speakBtn.classList.remove('listening', 'processing');
        };
        
        recognition.onend = () => {
            isListening = false;
            stopMicrophoneVisualization();
            
            const speakBtn = document.getElementById('start-speaking');
            speakBtn.textContent = '🎤 Paina ja sano sana englanniksi';
            speakBtn.disabled = false;
            speakBtn.classList.remove('listening', 'processing');
            
            if (speechTimeout) {
                clearTimeout(speechTimeout);
                speechTimeout = null;
            }
        };
    } else {
        document.getElementById('speech-feedback').textContent = 'Selaimesi ei tue puheentunnistusta. Kokeile kirjoitustilaa!';
        document.getElementById('start-speaking').disabled = true;
    }
}

document.getElementById('start-speaking').addEventListener('click', () => {
    if (recognition && !isListening) {
        isListening = true;
        const speakBtn = document.getElementById('start-speaking');
        
        speakBtn.textContent = '🔴 Kuuntelen...';
        speakBtn.disabled = true;
        speakBtn.classList.add('listening');
        
        document.getElementById('speech-feedback').innerHTML = '';
        document.getElementById('speech-tip').style.display = 'block';
        
        // Aloita mikrofonin visualisointi
        startMicrophoneVisualization();
        
        // Pysäytetään mahdollinen käynnissä oleva puhesynteesi
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        // Odotetaan hetki ennen puheentunnistuksen käynnistystä
        setTimeout(() => {
            if (isListening) {
                try {
                    // Yritä saada parempi äänenlaatu
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        navigator.mediaDevices.getUserMedia({ 
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                sampleRate: 44100
                            } 
                        }).then(() => {
                            recognition.start();
                        }).catch(() => {
                            // Fallback: käynnistä ilman erityisasetuksia
                            recognition.start();
                        });
                    } else {
                        recognition.start();
                    }
                    
                    // Pidempi timeout pidemmille sanoille
                    speechTimeout = setTimeout(() => {
                        if (isListening && recognition) {
                            recognition.stop();
                            document.getElementById('speech-feedback').textContent = '⏰ Aikakatkaistu - yritä uudelleen! (Kokeile sanoa sana hitaammin)';
                        }
                    }, 8000); // 8 sekuntia aikaa
                } catch (error) {
                    isListening = false;
                    stopMicrophoneVisualization();
                    document.getElementById('speech-feedback').textContent = '⚠️ Virhe puheentunnistuksessa. Yritä uudelleen!';
                    speakBtn.textContent = '🎤 Paina ja sano sana englanniksi';
                    speakBtn.disabled = false;
                    speakBtn.classList.remove('listening');
                }
            }
        }, 300);
    }
});

function startMicrophoneVisualization() {
    const visualEl = document.getElementById('microphone-visual');
    const iconEl = document.getElementById('microphone-icon');
    const volumeBars = document.querySelectorAll('.volume-bar');
    
    visualEl.style.display = 'flex';
    iconEl.classList.add('listening');
    
    // Simuloi äänitason visualisointia
    let animationInterval = setInterval(() => {
        if (!isListening) {
            clearInterval(animationInterval);
            return;
        }
        
        volumeBars.forEach((bar, index) => {
            // Satunnainen aktivointi barreille
            if (Math.random() > 0.4) {
                bar.classList.add('active');
                setTimeout(() => {
                    bar.classList.remove('active');
                }, 200 + (index * 20));
            }
        });
    }, 150);
    
    // Tallenna animaatio-interval pysäytystä varten
    window.microphoneAnimation = animationInterval;
}

function stopMicrophoneVisualization() {
    const visualEl = document.getElementById('microphone-visual');
    const iconEl = document.getElementById('microphone-icon');
    const volumeBars = document.querySelectorAll('.volume-bar');
    
    visualEl.style.display = 'none';
    iconEl.classList.remove('listening');
    
    // Poista kaikki aktiiviluokat
    volumeBars.forEach(bar => bar.classList.remove('active'));
    
    // Pysäytä animaatio
    if (window.microphoneAnimation) {
        clearInterval(window.microphoneAnimation);
        window.microphoneAnimation = null;
    }
    
    // Piilota vinkki
    document.getElementById('speech-tip').style.display = 'none';
}

// Apufunktio sanojen samankaltaisuuden laskemiseen (Levenshtein distance)
function calculateSimilarity(str1, str2) {
    if (str1.length === 0) return str2.length === 0 ? 1 : 0;
    if (str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            if (str1[i - 1] === str2[j - 1]) {
                matrix[j][i] = matrix[j - 1][i - 1];
            } else {
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1,
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i - 1] + 1
                );
            }
        }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - distance) / maxLength;
}

// Uudet pelifunktiot
function showChoices() {
    const currentWord = currentWords[currentWordIndex];
    const correctAnswer = currentWord.english;
    
    // Hae väärät vaihtoehdot samasta aiheesta
    const topicWords = wordDatabase[currentTopic]
        .filter(word => word.english !== correctAnswer)
        .map(word => word.english);
    
    // Valitse 3 väärää vaihtoehtoa
    const wrongAnswers = [];
    while (wrongAnswers.length < 3 && topicWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * topicWords.length);
        wrongAnswers.push(topicWords.splice(randomIndex, 1)[0]);
    }
    
    // Luo vaihtoehdot (1 oikea + 3 väärää)
    const choices = [correctAnswer, ...wrongAnswers];
    
    // Sekoita vaihtoehdot
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    
    // Löydä oikean vastauksen indeksi sekoituksen jälkeen
    window.correctChoiceIndex = choices.indexOf(correctAnswer);
    
    // Päivitä napit
    const choiceButtons = document.querySelectorAll('#choice-area .choice-btn');
    choiceButtons.forEach((btn, index) => {
        btn.textContent = choices[index] || '';
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
}

function showListenChoices() {
    const currentWord = currentWords[currentWordIndex];
    const correctAnswer = currentWord.finnish;
    
    // Hae väärät vaihtoehdot samasta aiheesta  
    const topicWords = wordDatabase[currentTopic]
        .filter(word => word.finnish !== correctAnswer)
        .map(word => word.finnish);
    
    // Valitse 3 väärää vaihtoehtoa
    const wrongAnswers = [];
    while (wrongAnswers.length < 3 && topicWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * topicWords.length);
        wrongAnswers.push(topicWords.splice(randomIndex, 1)[0]);
    }
    
    // Luo vaihtoehdot (1 oikea + 3 väärää)
    const choices = [correctAnswer, ...wrongAnswers];
    
    // Sekoita vaihtoehdot
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    
    // Löydä oikean vastauksen indeksi sekoituksen jälkeen
    window.correctChoiceIndex = choices.indexOf(correctAnswer);
    
    // Päivitä napit
    const choiceButtons = document.querySelectorAll('#listen-area .choice-btn');
    choiceButtons.forEach((btn, index) => {
        btn.textContent = choices[index] || '';
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect');
    });
    
    // Pelaa sana automaattisesti
    setTimeout(() => {
        playListenWordWithAnimation();
    }, 500);
}

function playListenWordWithAnimation() {
    const currentWord = currentWords[currentWordIndex];
    const listenBtn = document.getElementById('listen-word-again');
    
    listenBtn.classList.add('playing');
    speakWord(currentWord.english);
    
    setTimeout(() => {
        listenBtn.classList.remove('playing');
    }, 2000);
}

function handleChoiceAnswer(selectedIndex, mode) {
    const isCorrect = selectedIndex === window.correctChoiceIndex;
    const currentWord = currentWords[currentWordIndex];
    
    const area = mode === 'choice' ? 'choice-area' : 'listen-area';
    const buttons = document.querySelectorAll(`#${area} .choice-btn`);
    
    // Merkitse valittu nappi
    buttons[selectedIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
    
    // Merkitse oikea vastaus aina
    if (!isCorrect) {
        buttons[window.correctChoiceIndex].classList.add('correct');
    }
    
    // Sama pistejärjestelmä kuin muissakin pelimuodoissa
    calculatePoints(isCorrect, currentWord);
    
    // Äänitehosteet
    if (isCorrect) {
        if (perfectAnswers > 0 && (Date.now() - wordStartTime) / 1000 < 2) {
            playPerfectSound();
        } else if (streak >= 5) {
            playStreakSound(streak);
        } else {
            playSuccessSound();
        }
    } else {
        playErrorSound();
    }
    
    // Tallenna adaptiivisen oppimisen tiedot  
    const choiceResponseTime = wordStartTime ? (Date.now() - wordStartTime) / 1000 : 0;
    progressTracker.recordAttempt(currentTopic, currentWord.english, isCorrect, choiceResponseTime, false);
    updateScore(isCorrect);
    
    // Poista käytöstä kaikki napit
    buttons.forEach(btn => btn.disabled = true);
    
    // Automaattisesti seuraavaan sanaan oikean vastauksen jälkeen
    if (isCorrect) {
        setTimeout(() => {
            nextWord();
        }, 1500); // 1.5 sekuntia aikaa nähdä palaute
    } else {
        document.getElementById('next-word').style.display = 'block';
    }
}

function calculatePoints(isCorrect, currentWord) {
    const calcResponseTime = wordStartTime ? (Date.now() - wordStartTime) / 1000 : 0;
    let pointsEarned = 0;
    let bonusText = '';
    
    const feedbackEl = document.getElementById('feedback');
    
    if (isCorrect) {
        correctAnswers++;
        streak++;
        
        // Peruspisteet (monivalinta antaa vähemmän pisteitä)
        pointsEarned = currentGameMode === 'choice' ? 8 : 6;
        
        // Vaikeusbonus
        const difficulty = currentWord.difficulty || 'medium';
        const difficultyBonus = {
            easy: 0,
            medium: 3,
            hard: 8
        };
        pointsEarned += difficultyBonus[difficulty];
        
        // Nopeusbonukset
        if (calcResponseTime < 3) {
            pointsEarned += 5;
            bonusText += ' ⚡ Nopea! (+5)';
        } else if (calcResponseTime < 5) {
            pointsEarned += 2;
            bonusText += ' 💨 Ripeä! (+2)';
        }
        
        // Täydellisyysbonus
        if (calcResponseTime < 2) {
            perfectAnswers++;
            pointsEarned += 10;
            bonusText += ' 🎆 Täydellinen! (+10)';
        }
        
        // Streak-bonukset
        if (streak >= 5) {
            const streakBonus = Math.floor(streak / 5) * 5;
            pointsEarned += streakBonus;
            bonusText += ` 🔥 Putki ${streak}! (+${streakBonus})`;
            
            document.getElementById('streak').classList.add('hot');
        }
        
        score += pointsEarned;
        
        feedbackEl.innerHTML = `✅ Oikein! "${currentWord.english}" = "${currentWord.finnish}"<br><span style="font-size: 0.9em; color: #28a745;">+${pointsEarned} pistettä${bonusText}</span>`;
        feedbackEl.className = 'feedback correct';
        
    } else {
        streak = 0;
        comboMultiplier = 1;
        document.getElementById('streak').classList.remove('hot');
        
        const encouragement = getEncouragingFeedback();
        const tip = getMotivationalTip();
        feedbackEl.innerHTML = `${encouragement} "${currentWord.english}" tarkoittaa "${currentWord.finnish}".<br><span style="font-size: 0.9em; color: #f39c12;">💪 ${tip}</span>`;
        feedbackEl.className = 'feedback incorrect';
    }
}

document.getElementById('submit-answer').addEventListener('click', () => {
    const answer = document.getElementById('answer-input').value.trim().toLowerCase();
    checkAnswer(answer);
});

document.getElementById('answer-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const answer = e.target.value.trim().toLowerCase();
        checkAnswer(answer);
    }
});

function checkAnswer(answer) {
    const currentWord = currentWords[currentWordIndex];
    const expectedAnswer = currentWord.english.toLowerCase();
    
    // Tarkista osittaiset osumat pitkille sanoille
    let isCorrect = answer === expectedAnswer;
    
    // Jos ei ole täysin oikein, tarkista onko vastaus osittain oikein (yli 5 kirjainta pitkille sanoille)
    if (!isCorrect && expectedAnswer.length > 5) {
        const similarity = calculateSimilarity(answer, expectedAnswer);
        const partialMatch = answer.length >= 4 && expectedAnswer.startsWith(answer) && answer.length / expectedAnswer.length >= 0.6;
        
        // Vastauksen analyysi
        
        // Hyväksy osittaiset vastaukset pitkille sanoille jos ne ovat tarpeeksi lähellä
        if (similarity > 0.7 || partialMatch) {
            isCorrect = true;
            // Hyväksytty osittaisena vastauksena;
        }
    }
    
    const feedbackEl = document.getElementById('feedback');
    const wordImageEl = document.getElementById('word-image');
    const inputEl = document.getElementById('answer-input');
    
    // Laske vastausaika ja nopeusbonukset
    const calcResponseTime = wordStartTime ? (Date.now() - wordStartTime) / 1000 : 0;
    let pointsEarned = 0;
    let bonusText = '';
    
    // Animaatiot
    if (isCorrect) {
        correctAnswers++;
        streak++;
        
        // Peruspisteet
        pointsEarned = 10;
        
        // Vaikeusbonus
        const difficulty = currentWord.difficulty || 'medium';
        const difficultyBonus = {
            easy: 0,
            medium: 5,
            hard: 15
        };
        pointsEarned += difficultyBonus[difficulty];
        
        // Nopeusbonukset
        if (calcResponseTime < 3) {
            pointsEarned += 10;
            bonusText += ' ⚡ Nopea! (+10)';
        } else if (calcResponseTime < 5) {
            pointsEarned += 5;
            bonusText += ' 💨 Ripeä! (+5)';
        }
        
        // Täydellisyysbonus
        if (calcResponseTime < 2) {
            perfectAnswers++;
            pointsEarned += 20;
            bonusText += ' 🎆 Täydellinen! (+20)';
        }
        
        // Streak-bonukset
        if (streak >= 5) {
            const streakBonus = Math.floor(streak / 5) * 10;
            pointsEarned += streakBonus;
            bonusText += ` 🔥 Putki ${streak}! (+${streakBonus})`;
            
            // Päivitä combo multiplier
            comboMultiplier = Math.min(3, 1 + Math.floor(streak / 10) * 0.5);
        }
        
        // Käytä combo multiplieria
        if (comboMultiplier > 1) {
            const originalPoints = pointsEarned;
            pointsEarned = Math.floor(pointsEarned * comboMultiplier);
            bonusText += ` 🎆 Combo x${comboMultiplier.toFixed(1)} (+${pointsEarned - originalPoints})`;
        }
        
        score += pointsEarned;
        
        feedbackEl.innerHTML = `✅ Oikein! "${currentWord.english}" on oikea vastaus!<br><span style="font-size: 0.9em; color: #28a745;">+${pointsEarned} pistettä${bonusText}</span>`;
        feedbackEl.className = 'feedback correct';
        wordImageEl.classList.add('correct');
        if (inputEl) inputEl.classList.add('correct');
        
        // Äänitehosteet
        if (perfectAnswers > 0 && calcResponseTime < 2) {
            playPerfectSound();
        } else if (streak >= 5) {
            playStreakSound(streak);
        } else {
            playSuccessSound();
        }
        
        // Streak-animaatio
        const streakEl = document.getElementById('streak');
        if (streak >= 3) {
            streakEl.classList.add('hot');
        }
        
        // Puhesynteesi vain kirjoitustilassa tai oppimistilassa
        if (currentPracticeMode !== 'speak') {
            setTimeout(() => speakWord(currentWord.english), 200);
        }
        
        // Erikoisefektit pitkillä streakeilla
        if (streak === 10) {
            showSpecialEffect('🎆 Mahtava sarja! Keep going!');
            playLevelUpSound();
        } else if (streak === 20) {
            showSpecialEffect('🎆🎆 Incredible! You\'re on fire! 🎆🎆');
            playLevelUpSound();
        }
        
    } else {
        feedbackEl.innerHTML = `🌟 Lähellä oli! Oikea vastaus on "${currentWord.english}".<br><span style="font-size: 0.9em; color: #f39c12;">💡 Muista tämä ensi kerralla!</span>`;
        feedbackEl.className = 'feedback incorrect';
        wordImageEl.classList.add('incorrect');
        if (inputEl) inputEl.classList.add('incorrect');
        
        // Äänitehosteet
        playErrorSound();
        
        // Nollaa streak ja combo
        streak = 0;
        comboMultiplier = 1;
        document.getElementById('streak').classList.remove('hot');
        
        // Puhesynteesi vain kirjoitustilassa tai oppimistilassa
        if (currentPracticeMode !== 'speak') {
            setTimeout(() => speakWord(currentWord.english), 200);
        }
    }
    
    // Poista animaatioluokat hetken kuluttua
    setTimeout(() => {
        wordImageEl.classList.remove('correct', 'incorrect');
        if (inputEl) inputEl.classList.remove('correct', 'incorrect');
    }, 1000);
    
    // Tallenna adaptiivisen oppimisen tiedot
    const practiceResponseTime = wordStartTime ? (Date.now() - wordStartTime) / 1000 : 0;
    progressTracker.recordAttempt(currentTopic, currentWord.english, isCorrect, practiceResponseTime, false);
    
    updateScore(isCorrect);
    
    if (currentGameMode === 'practice') {
        if (currentPracticeMode === 'write') {
            document.getElementById('submit-answer').disabled = true;
            document.getElementById('answer-input').disabled = true;
        } else {
            document.getElementById('start-speaking').disabled = true;
        }
        
        // Automaattisesti seuraavaan sanaan oikean vastauksen jälkeen
        if (isCorrect) {
            setTimeout(() => {
                nextWord();
            }, 2000); // 2 sekuntia aikaa kuulla ääntäminen
        } else {
            document.getElementById('next-word').style.display = 'block';
        }
    } else if (currentGameMode === 'choice' || currentGameMode === 'listen') {
        // Poista käytöstä kaikki valinnat
        const area = currentGameMode === 'choice' ? 'choice-area' : 'listen-area';
        document.querySelectorAll(`#${area} .choice-btn`).forEach(btn => {
            btn.disabled = true;
        });
        document.getElementById('next-word').style.display = 'block';
    }
}

function showSpecialEffect(message) {
    const effectEl = document.createElement('div');
    effectEl.textContent = message;
    effectEl.style.position = 'fixed';
    effectEl.style.top = '50%';
    effectEl.style.left = '50%';
    effectEl.style.transform = 'translate(-50%, -50%)';
    effectEl.style.fontSize = '2em';
    effectEl.style.fontWeight = 'bold';
    effectEl.style.color = '#ff6b6b';
    effectEl.style.textAlign = 'center';
    effectEl.style.zIndex = '9999';
    effectEl.style.animation = 'bounce 2s ease-out';
    effectEl.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
    
    document.body.appendChild(effectEl);
    
    setTimeout(() => {
        document.body.removeChild(effectEl);
    }, 3000);
}

document.getElementById('next-word').addEventListener('click', () => {
    currentWordIndex++;
    showWord();
});

function updateScore(isCorrect = false) {
    const scoreEl = document.getElementById('score');
    const streakEl = document.getElementById('streak');
    
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    
    // Score-animaatio kun pisteet nousevat
    if (isCorrect) {
        scoreEl.classList.add('updated');
        setTimeout(() => {
            scoreEl.classList.remove('updated');
        }, 800);
    }
    
    // Poista hot-luokka jos streak katkeaa
    if (streak < 3) {
        streakEl.classList.remove('hot');
    }
}

function endGame() {
    showScreen('results');
    
    progressTracker.addScore(score);
    const achievements = progressTracker.checkAchievements();
    
    const percentage = (correctAnswers / totalWords) * 100;
    const perfectPercentage = (perfectAnswers / totalWords) * 100;
    
    document.getElementById('final-score').textContent = score;
    
    // Laske statistiikkoja
    const avgTime = wordStartTime ? ((Date.now() - wordStartTime) / totalWords / 1000).toFixed(1) : 0;
    const maxStreak = streak; // Current streak at end
    
    let message = '';
    let stars = '';
    let performanceText = '';
    
    // Perusviesti prosenttien perusteella
    if (percentage === 100) {
        message = 'Täydellistä! Olet englannin mestari! 🏆';
        stars = '⭐⭐⭐⭐⭐';
    } else if (percentage >= 80) {
        message = 'Erinomaista työtä! Melkein kaikki oikein! 🎉';
        stars = '⭐⭐⭐⭐';
    } else if (percentage >= 60) {
        message = 'Hyvää työtä! Jatka harjoittelua! 👍';
        stars = '⭐⭐⭐';
    } else if (percentage >= 40) {
        message = 'Ihan hyvä alku! Harjoittelu tekee mestarin! 💪';
        stars = '⭐⭐';
    } else {
        const encouragingMessages = [
            'Hyvä alku! Oppiminen on matkaa! 🌱',
            'Jokainen yritys tekee viisaammaksi! 💡',
            'Erinomaista että yrität! Jatka vain! 🌟',
            'Virheistä oppii parhaiten! Hyvin meni! 💪'
        ];
        message = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
        stars = '⭐';
    }
    
    // Lisää suoritusstatistiikkoja
    performanceText = `<br><br><strong>Suoritustiedot:</strong><br>`;
    performanceText += `✅ Oikein: ${correctAnswers}/${totalWords} (${percentage.toFixed(0)}%)<br>`;
    
    if (perfectAnswers > 0) {
        performanceText += `🎆 Täydellisiä: ${perfectAnswers} (${perfectPercentage.toFixed(0)}%)<br>`;
    }
    
    if (maxStreak > 0) {
        performanceText += `🔥 Paras putki: ${maxStreak}<br>`;
    }
    
    if (comboMultiplier > 1) {
        performanceText += `🎆 Combo-kerroin: x${comboMultiplier.toFixed(1)}<br>`;
    }
    
    // Erikoisviestejä suorituksen perusteella
    if (perfectPercentage >= 50) {
        message += '<br><br>🎆 Speed Demon! Yli puolet täydellisiä vastauksia!';
    }
    
    if (maxStreak >= 10) {
        message += '<br><br>🔥 Streak Master! Huikea sarja!';
    }
    
    if (achievements.length > 0) {
        message += '<br><br>🏆 Uusi saavutus: ' + achievements[0].title;
    }
    
    document.getElementById('result-message').innerHTML = message + performanceText;
    document.getElementById('star-rating').textContent = stars;
}

function updateProgressBar() {
    if (currentTopic) {
        const progress = progressTracker.getTopicProgress(currentTopic);
        document.getElementById('topic-progress').textContent = progress;
        document.getElementById('progress-fill').style.width = progress + '%';
        
        // Päivitä mastery-statistiikka
        updateMasteryStats();
    }
}

function updateMasteryStats() {
    if (!currentTopic) return;
    
    const stats = progressTracker.getMasteryStats(currentTopic);
    if (!stats) return;
    
    document.getElementById('mastered-count').textContent = stats.mastered;
    document.getElementById('expert-count').textContent = stats.expert;
    document.getElementById('strong-count').textContent = stats.strong;
    document.getElementById('good-count').textContent = stats.good;
    document.getElementById('learning-count').textContent = stats.learning;
    document.getElementById('rookie-count').textContent = stats.rookie;
    
    // Animoi päivittyneet luvut
    ['mastered', 'expert', 'strong', 'good', 'learning', 'rookie'].forEach(level => {
        const element = document.getElementById(level + '-count');
        if (element && parseInt(element.textContent) > 0) {
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

document.getElementById('back-to-menu').addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('back-to-mode').addEventListener('click', () => {
    showScreen('mode');
});

document.getElementById('play-again').addEventListener('click', () => {
    startGame();
});

document.getElementById('back-to-menu-from-results').addEventListener('click', () => {
    showScreen('menu');
});

document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentTopic = e.target.dataset.topic;
        updateProgressBar();
        showScreen('mode');
    });
});

// Exam creation functionality
let detectedWords = [];
let currentImageFile = null;

// Modal controls
const examModal = document.getElementById('exam-modal');
const examCameraBtn = document.getElementById('exam-camera-btn');
const closeExamModal = document.getElementById('close-exam-modal');

examCameraBtn.addEventListener('click', () => {
    examModal.style.display = 'block';
    resetExamModal();
});

closeExamModal.addEventListener('click', () => {
    examModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === examModal) {
        examModal.style.display = 'none';
    }
});

function resetExamModal() {
    document.getElementById('step-capture').style.display = 'block';
    document.getElementById('step-processing').style.display = 'none';
    document.getElementById('step-results').style.display = 'none';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('exam-name-input').value = '';
    detectedWords = [];
    currentImageFile = null;
}

// Image handling
const imageInput = document.getElementById('image-input');
const takePhotoBtn = document.getElementById('take-photo-btn');
const uploadPhotoBtn = document.getElementById('upload-photo-btn');
const analyzeImageBtn = document.getElementById('analyze-image-btn');
const previewImage = document.getElementById('preview-image');

takePhotoBtn.addEventListener('click', () => {
    imageInput.click();
});

uploadPhotoBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', handleImageSelect);

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        currentImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            document.getElementById('image-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

analyzeImageBtn.addEventListener('click', async () => {
    if (!currentImageFile) return;
    
    document.getElementById('step-capture').style.display = 'none';
    document.getElementById('step-processing').style.display = 'block';
    
    try {
        // 1. Yritä ensin modernia Web OCR API:a
        const ocrText = await extractTextFromImage(currentImageFile);
        
        // 2. Parsi teksti AI:lla ja etsi sanapareja
        detectedWords = await parseWordPairs(ocrText);
        
        if (detectedWords.length === 0) {
            throw new Error('Ei löytynyt sanapareja kuvasta');
        }
        
        showDetectedWords();
        
    } catch (error) {
        console.error('AI parsing error:', error);
        
        // Fallback: Kysy käyttäjältä manuaalista syöttöä
        showManualInputFallback();
    }
});

function showDetectedWords() {
    document.getElementById('step-processing').style.display = 'none';
    document.getElementById('step-results').style.display = 'block';
    
    const wordsList = document.getElementById('detected-words-list');
    wordsList.innerHTML = '';
    
    detectedWords.forEach((word, index) => {
        const wordPair = document.createElement('div');
        wordPair.className = 'word-pair';
        wordPair.innerHTML = `
            <div>
                <span class="word-english">${word.english}</span>
                <span> - </span>
                <span class="word-finnish">${word.finnish}</span>
            </div>
            <button class="remove-word" onclick="removeWord(${index})">×</button>
        `;
        wordsList.appendChild(wordPair);
    });
}

function removeWord(index) {
    detectedWords.splice(index, 1);
    showDetectedWords();
}

// AI-powered text extraction and parsing
async function extractTextFromImage(imageFile) {
    // Yritä useita eri OCR-menetelmiä
    
    // 1. Tesseract.js (client-side OCR)
    if (window.Tesseract) {
        try {
            const { data: { text } } = await Tesseract.recognize(imageFile, 'eng+fin');
            return text;
        } catch (e) {
            console.log('Tesseract failed, trying other methods...');
        }
    }
    
    // 2. Google Vision API (jos saatavilla)
    try {
        return await googleVisionOCR(imageFile);
    } catch (e) {
        console.log('Google Vision failed, trying other methods...');
    }
    
    // 3. Microsoft Computer Vision API
    try {
        return await microsoftComputerVisionOCR(imageFile);
    } catch (e) {
        console.log('Microsoft API failed, trying other methods...');
    }
    
    // 4. Fallback: Pyydetään käyttäjää syöttämään tekstiä
    throw new Error('OCR ei onnistunut');
}

async function googleVisionOCR(imageFile) {
    // Google Vision API implementation
    const API_KEY = 'YOUR_GOOGLE_VISION_API_KEY'; // Pitää asettaa
    
    const base64 = await fileToBase64(imageFile);
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                image: { content: base64.split(',')[1] },
                features: [{ type: 'TEXT_DETECTION' }]
            }]
        })
    });
    
    const result = await response.json();
    return result.responses[0]?.textAnnotations[0]?.description || '';
}

async function microsoftComputerVisionOCR(imageFile) {
    // Microsoft Computer Vision API implementation
    const API_KEY = 'YOUR_MICROSOFT_API_KEY'; // Pitää asettaa
    const endpoint = 'YOUR_MICROSOFT_ENDPOINT'; // Pitää asettaa
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`${endpoint}/vision/v3.2/ocr`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': API_KEY,
        },
        body: formData
    });
    
    const result = await response.json();
    
    // Parse Microsoft OCR response
    let text = '';
    result.regions?.forEach(region => {
        region.lines?.forEach(line => {
            line.words?.forEach(word => {
                text += word.text + ' ';
            });
            text += '\n';
        });
    });
    
    return text;
}

async function parseWordPairs(ocrText) {
    console.log('OCR Text:', ocrText);
    
    // Älykkäämpi parsinta useilla menetelmillä
    let wordPairs = [];
    
    // 1. Regex-pohjaiset mallit sanaparien tunnistamiseen
    wordPairs = [...wordPairs, ...findWordPairsWithRegex(ocrText)];
    
    // 2. AI-pohjainen parsinta (käyttää modernia NLP:tä)
    wordPairs = [...wordPairs, ...await aiPoweredWordPairExtraction(ocrText)];
    
    // 3. Heuristinen analyysi rivien perusteella
    wordPairs = [...wordPairs, ...findWordPairsHeuristic(ocrText)];
    
    // Poista duplikaatit ja validoi
    return removeDuplicatesAndValidate(wordPairs);
}

function findWordPairsWithRegex(text) {
    const patterns = [
        // Englanti - Suomi (esim. "cat - kissa")
        /([a-zA-Z]+)\s*[-–—]\s*([a-zA-ZäöåÄÖÅ]+)/g,
        
        // Suomi - Englanti (esim. "kissa - cat")
        /([a-zA-ZäöåÄÖÅ]+)\s*[-–—]\s*([a-zA-Z]+)/g,
        
        // Tab-erotetut (esim. "cat    kissa")
        /([a-zA-Z]+)\s{2,}([a-zA-ZäöåÄÖÅ]+)/g,
        
        // Numeroidut listat (esim. "1. cat kissa")
        /\d+\.\s*([a-zA-Z]+)\s+([a-zA-ZäöåÄÖÅ]+)/g,
        
        // Sulkeissa käännökset (esim. "cat (kissa)")
        /([a-zA-Z]+)\s*\(([a-zA-ZäöåÄÖÅ]+)\)/g,
    ];
    
    const wordPairs = [];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const word1 = match[1].trim().toLowerCase();
            const word2 = match[2].trim().toLowerCase();
            
            // Tunnista mikä on englantia ja mikä suomea
            if (isEnglish(word1) && isFinnish(word2)) {
                wordPairs.push({ english: word1, finnish: word2 });
            } else if (isFinnish(word1) && isEnglish(word2)) {
                wordPairs.push({ english: word2, finnish: word1 });
            }
        }
    });
    
    return wordPairs;
}

async function aiPoweredWordPairExtraction(text) {
    // Simuloitu AI-parsinta - voidaan korvata oikealla AI API:lla
    const lines = text.split('\n').filter(line => line.trim());
    const wordPairs = [];
    
    for (const line of lines) {
        // Analysoi jokainen rivi ja yritä löytää sanapareja
        const words = line.split(/\s+/).filter(word => word.length > 2);
        
        if (words.length >= 2) {
            // Etsi englanti-suomi pareja riviltä
            for (let i = 0; i < words.length - 1; i++) {
                const word1 = cleanWord(words[i]);
                const word2 = cleanWord(words[i + 1]);
                
                if (isEnglish(word1) && isFinnish(word2)) {
                    wordPairs.push({ english: word1, finnish: word2 });
                } else if (isFinnish(word1) && isEnglish(word2)) {
                    wordPairs.push({ english: word2, finnish: word1 });
                }
            }
        }
    }
    
    return wordPairs;
}

function findWordPairsHeuristic(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 3);
    const wordPairs = [];
    
    lines.forEach(line => {
        // Poista numerot, välimerkit yms. alusta
        const cleanLine = line.replace(/^\d+\.?\s*/, '').trim();
        
        // Jaa kahteen osaan yleisimmillä erottimilla
        const separators = ['-', '–', '—', '\t', '  ', ' = ', ' → '];
        
        for (const sep of separators) {
            if (cleanLine.includes(sep)) {
                const parts = cleanLine.split(sep).map(p => p.trim());
                if (parts.length === 2) {
                    const word1 = cleanWord(parts[0]);
                    const word2 = cleanWord(parts[1]);
                    
                    if (word1 && word2) {
                        if (isEnglish(word1) && isFinnish(word2)) {
                            wordPairs.push({ english: word1, finnish: word2 });
                        } else if (isFinnish(word1) && isEnglish(word2)) {
                            wordPairs.push({ english: word2, finnish: word1 });
                        }
                    }
                }
                break;
            }
        }
    });
    
    return wordPairs;
}

function isEnglish(word) {
    // Yksinkertainen englannin kielen tunnistus
    const englishPattern = /^[a-zA-Z]+$/;
    const finnishChars = /[äöåÄÖÅ]/;
    
    return englishPattern.test(word) && !finnishChars.test(word) && word.length > 1;
}

function isFinnish(word) {
    // Suomen kielen tunnistus
    const finnishChars = /[äöåÄÖÅ]/;
    const hasOnlyLatinChars = /^[a-zA-ZäöåÄÖÅ]+$/;
    
    // Jos sisältää ä, ö, å niin todennäköisesti suomea
    if (finnishChars.test(word)) {
        return true;
    }
    
    // Tunnista tyypillisiä suomalaisia päätteitä
    const finnishEndings = ['nen', 'ttu', 'lla', 'llä', 'ssa', 'ssä', 'sta', 'stä', 'tta', 'ttä'];
    const wordLower = word.toLowerCase();
    
    return hasOnlyLatinChars.test(word) && 
           word.length > 2 && 
           finnishEndings.some(ending => wordLower.endsWith(ending));
}

function cleanWord(word) {
    // Puhdista sana välimerkeistä ja ylimääräisistä merkeistä
    return word.replace(/[^\w\säöåÄÖÅ]/g, '').trim().toLowerCase();
}

function removeDuplicatesAndValidate(wordPairs) {
    const seen = new Set();
    const unique = [];
    
    wordPairs.forEach(pair => {
        const key = `${pair.english}-${pair.finnish}`;
        if (!seen.has(key) && pair.english.length > 1 && pair.finnish.length > 1) {
            seen.add(key);
            unique.push(pair);
        }
    });
    
    return unique;
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showManualInputFallback() {
    document.getElementById('step-processing').style.display = 'none';
    document.getElementById('step-results').style.display = 'block';
    
    // Näytä manuaalinen syöttökenttä
    const wordsList = document.getElementById('detected-words-list');
    wordsList.innerHTML = `
        <div class="manual-input-section">
            <h4>🤖 AI ei pystynyt tunnistamaan sanoja automaattisesti</h4>
            <p>Syötä sanat manuaalisesti alla olevaan kenttään:</p>
            <textarea id="manual-text-input" placeholder="Syötä sanaparit, esim:&#10;cat - kissa&#10;dog - koira&#10;house - talo" rows="10" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ddd;"></textarea>
            <button id="parse-manual-text" class="analyze-btn" style="margin-top: 15px;">📝 Parsi sanat</button>
        </div>
    `;
    
    // Lisää kuuntelija manuaaliselle parsinnalle
    document.getElementById('parse-manual-text').addEventListener('click', async () => {
        const manualText = document.getElementById('manual-text-input').value;
        if (manualText.trim()) {
            detectedWords = await parseWordPairs(manualText);
            if (detectedWords.length > 0) {
                showDetectedWords();
            } else {
                alert('Ei löytynyt kelvollisia sanapareja. Tarkista muotoilu.');
            }
        }
    });
}

// Create exam functionality
document.getElementById('create-exam-btn').addEventListener('click', createCustomExam);

function createCustomExam() {
    const examName = document.getElementById('exam-name-input').value.trim();
    
    if (!examName) {
        alert('Anna kokeelle nimi!');
        return;
    }
    
    if (detectedWords.length === 0) {
        alert('Ei sanoja luotavaksi!');
        return;
    }
    
    // Luo uusi custom topic
    const customTopicKey = `custom_${Date.now()}`;
    
    // Lisää sanat wordDatabase:en
    if (!wordDatabase[customTopicKey]) {
        wordDatabase[customTopicKey] = [];
    }
    wordDatabase[customTopicKey] = [...detectedWords];
    
    // Alusta progress tracker tälle topicille
    if (!progressTracker.progress.topics[customTopicKey]) {
        progressTracker.progress.topics[customTopicKey] = {
            words: {},
            level: 1,
            mastered: false
        };
        
        detectedWords.forEach(word => {
            progressTracker.progress.topics[customTopicKey].words[word.english] = {
                attempts: 0,
                correct: 0,
                mastered: false,
                lastSeen: null,
                masteryLevel: 0,
                consecutiveCorrect: 0,
                difficulty: 'medium',
                avgResponseTime: 0,
                fastCorrectCount: 0
            };
        });
        
        progressTracker.saveProgress();
    }
    
    // Siirry suoraan tähän topiciin
    currentTopic = customTopicKey;
    examModal.style.display = 'none';
    showScreen('mode');
    
    // Päivitä mode-screen custom-topicille
    document.getElementById('current-topic-name').textContent = examName;
    
    alert(`Koe "${examName}" luotu! Voit nyt aloittaa oppimisen.`);
}

// Breadcrumb navigation event listeners
document.getElementById('breadcrumb-home')?.addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('breadcrumb-game-home')?.addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('breadcrumb-game-topic')?.addEventListener('click', () => {
    showScreen('mode');
});

document.getElementById('breadcrumb-results-home')?.addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('breadcrumb-results-topic')?.addEventListener('click', () => {
    showScreen('mode');
});

// Enhanced navigation buttons
document.getElementById('home-from-game')?.addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('try-different-mode')?.addEventListener('click', () => {
    showScreen('mode');
});

showScreen('menu');