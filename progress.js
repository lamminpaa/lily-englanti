const STORAGE_KEY = 'englantipeli_progress';

class ProgressTracker {
    constructor() {
        this.progress = this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
        
        const progress = {
            topics: {},
            totalScore: 0,
            achievements: []
        };
        
        Object.keys(wordDatabase).forEach(topic => {
            progress.topics[topic] = {
                words: {},
                level: 1,
                mastered: false
            };
            
            wordDatabase[topic].forEach(word => {
                progress.topics[topic].words[word.english] = {
                    attempts: 0,
                    correct: 0,
                    mastered: false,
                    lastSeen: null,
                    masteryLevel: 0, // 0-5: Rookie, Learning, Good, Strong, Expert, Mastered
                    consecutiveCorrect: 0,
                    difficulty: word.difficulty || 'medium',
                    avgResponseTime: 0,
                    fastCorrectCount: 0 // Nopeat oikeat vastaukset
                };
            });
        });
        
        return progress;
    }

    saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    }

    recordAttempt(topic, word, isCorrect, responseTime = 0, wasAutoAdvanced = false) {
        const wordProgress = this.progress.topics[topic].words[word];
        if (!wordProgress) return; // Turvallisuus
        
        wordProgress.attempts++;
        const oldLevel = wordProgress.masteryLevel;
        
        if (isCorrect) {
            wordProgress.correct++;
            wordProgress.consecutiveCorrect++;
            
            // Laske keskimääräinen vastausaika
            if (responseTime > 0) {
                const totalTime = wordProgress.avgResponseTime * (wordProgress.correct - 1) + responseTime;
                wordProgress.avgResponseTime = totalTime / wordProgress.correct;
                
                // Nopeat vastaukset (alle 3 sekuntia)
                if (responseTime < 3) {
                    wordProgress.fastCorrectCount++;
                }
            }
            
            // Päivitä masteryLevel dynaamisen algoritmin mukaan
            this.updateMasteryLevel(wordProgress);
            
        } else {
            // Virheellinen vastaus vähentää tasoa hieman
            wordProgress.consecutiveCorrect = 0;
            wordProgress.masteryLevel = Math.max(0, wordProgress.masteryLevel - 0.5);
        }
        
        wordProgress.lastSeen = Date.now();
        
        // Sana on "mastered" kun masteryLevel >= 4
        wordProgress.mastered = wordProgress.masteryLevel >= 4;
        
        // Näytä level up -ilmoitus jos taso nousi
        if (wordProgress.masteryLevel > oldLevel && Math.floor(wordProgress.masteryLevel) > Math.floor(oldLevel)) {
            this.showMasteryNotification(word, wordProgress.masteryLevel);
        }
        
        this.updateTopicProgress(topic);
        this.saveProgress();
    }
    
    updateMasteryLevel(wordProgress) {
        const correctRate = wordProgress.correct / wordProgress.attempts;
        const consecutive = wordProgress.consecutiveCorrect;
        const difficulty = wordProgress.difficulty || 'medium';
        
        // Perusmasterybonus oikeellisuuden perusteella
        let levelGain = 0;
        
        if (correctRate >= 0.9 && consecutive >= 3) {
            levelGain = 0.8; // Erinomainen suoritus
        } else if (correctRate >= 0.8 && consecutive >= 2) {
            levelGain = 0.6; // Hyvä suoritus
        } else if (correctRate >= 0.7) {
            levelGain = 0.4; // Kohtalainen suoritus
        } else {
            levelGain = 0.2; // Heikko suoritus
        }
        
        // Vaikeuskerroin
        const difficultyMultiplier = {
            easy: 1.0,
            medium: 1.2,
            hard: 1.5
        };
        levelGain *= (difficultyMultiplier[difficulty] || 1.0);
        
        // Nopeusbonus
        if (wordProgress.avgResponseTime > 0 && wordProgress.avgResponseTime < 2) {
            levelGain *= 1.3; // Nopeus bonus
        }
        
        // Päivitä taso
        wordProgress.masteryLevel = Math.min(5, wordProgress.masteryLevel + levelGain);
    }
    
    showMasteryNotification(word, level) {
        const levels = [
            { name: 'Aloittelija', icon: '🌱', color: '#95a5a6' },
            { name: 'Oppija', icon: '📚', color: '#3498db' },
            { name: 'Hyvä', icon: '👍', color: '#f39c12' },
            { name: 'Vahva', icon: '💪', color: '#e74c3c' },
            { name: 'Asiantuntija', icon: '🏆', color: '#9b59b6' },
            { name: 'Mestari', icon: '🌟', color: '#2ecc71' }
        ];
        
        const levelInfo = levels[Math.min(Math.floor(level), 5)];
        
        // Luo ilmoituselementti
        const notification = document.createElement('div');
        notification.className = 'mastery-notification';
        notification.innerHTML = `
            <div class="mastery-content">
                <div class="mastery-icon">${levelInfo.icon}</div>
                <div class="mastery-text">
                    <div class="mastery-title">Level Up!</div>
                    <div class="mastery-word">"${word}"</div>
                    <div class="mastery-level">${levelInfo.name}</div>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}dd);
            color: white;
            padding: 15px 20px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 9999;
            transform: translateX(400px);
            transition: all 0.5s ease;
            max-width: 250px;
            font-family: inherit;
        `;
        
        document.body.appendChild(notification);
        
        // Animoi sisään
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Poista 3 sekunnin kuluttua
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    updateTopicProgress(topic) {
        const topicData = this.progress.topics[topic];
        const words = Object.values(topicData.words);
        const masteredCount = words.filter(w => w.mastered).length;
        const totalWords = words.length;
        
        if (masteredCount >= totalWords * 0.8) {
            topicData.level = Math.min(topicData.level + 1, 5);
            if (topicData.level === 5) {
                topicData.mastered = true;
            }
        }
    }

    getTopicProgress(topic) {
        const topicData = this.progress.topics[topic];
        const words = Object.values(topicData.words);
        const masteredCount = words.filter(w => w.mastered).length;
        return Math.round((masteredCount / words.length) * 100);
    }

    getWordsForPractice(topic, count = 10) {
        const topicWords = [...wordDatabase[topic]];
        const progressData = this.progress.topics[topic].words;
        
        // Adaptiivinen sanojen valinta
        const weightedWords = topicWords.map(word => {
            const progress = progressData[word.english] || {};
            let weight = 1;
            
            // Vähennä painoarvoa hallituille sanoille
            if (progress.mastered) {
                weight *= 0.1; // Harvemmin hallittuja sanoja
            } else {
                // Painota sanoja mastery levelin mukaan (matalampi = useammin)
                const masteryLevel = progress.masteryLevel || 0;
                weight *= Math.max(0.2, (5 - masteryLevel) / 5);
            }
            
            // Aikaperusteinen painotus (kauan sitten nähty sana = suurempi paino)
            const daysSinceLastSeen = progress.lastSeen ? 
                (Date.now() - progress.lastSeen) / (1000 * 60 * 60 * 24) : 999;
            weight *= Math.min(2, 1 + daysSinceLastSeen / 7); // Enemmän painoa vanhoille sanoille
            
            // Vaikeustasoperusteinen painotus
            const difficultyWeight = {
                easy: 0.8,
                medium: 1.0, 
                hard: 1.3
            };
            weight *= difficultyWeight[word.difficulty] || 1.0;
            
            return { ...word, weight };
        });
        
        // Järjestä painon mukaan ja ota satunnaisesti painotetusti
        const selectedWords = [];
        const wordPool = [...weightedWords];
        
        for (let i = 0; i < Math.min(count, wordPool.length); i++) {
            // Valitse sana painotetulla satunnaisuudella
            const totalWeight = wordPool.reduce((sum, w) => sum + w.weight, 0);
            let random = Math.random() * totalWeight;
            
            let selectedIndex = 0;
            for (let j = 0; j < wordPool.length; j++) {
                random -= wordPool[j].weight;
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            
            selectedWords.push(wordPool[selectedIndex]);
            wordPool.splice(selectedIndex, 1);
        }
        
        return selectedWords;
    }
    
    getWordMastery(topic, word) {
        const progress = this.progress.topics[topic]?.words[word];
        if (!progress) return { level: 0, name: 'Tuntematon', icon: '❓' };
        
        const levels = [
            { name: 'Aloittelija', icon: '🌱' },
            { name: 'Oppija', icon: '📚' },
            { name: 'Hyvä', icon: '👍' },
            { name: 'Vahva', icon: '💪' },
            { name: 'Asiantuntija', icon: '🏆' },
            { name: 'Mestari', icon: '🌟' }
        ];
        
        const levelIndex = Math.min(Math.floor(progress.masteryLevel || 0), 5);
        return {
            level: progress.masteryLevel || 0,
            ...levels[levelIndex],
            attempts: progress.attempts || 0,
            correct: progress.correct || 0,
            consecutiveCorrect: progress.consecutiveCorrect || 0,
            avgTime: progress.avgResponseTime || 0
        };
    }
    
    getMasteryStats(topic) {
        const topicData = this.progress.topics[topic];
        if (!topicData) return null;
        
        const words = Object.entries(topicData.words);
        const stats = {
            total: words.length,
            mastered: 0,
            expert: 0,
            strong: 0,
            good: 0,
            learning: 0,
            rookie: 0
        };
        
        words.forEach(([word, progress]) => {
            const level = Math.floor(progress.masteryLevel || 0);
            switch(level) {
                case 5: stats.mastered++; break;
                case 4: stats.expert++; break;
                case 3: stats.strong++; break;
                case 2: stats.good++; break;
                case 1: stats.learning++; break;
                default: stats.rookie++; break;
            }
        });
        
        return stats;
    }

    addScore(points) {
        this.progress.totalScore += points;
        this.saveProgress();
    }

    checkAchievements() {
        const achievements = [];
        
        const masteredTopics = Object.values(this.progress.topics).filter(t => t.mastered).length;
        if (masteredTopics >= 1 && !this.progress.achievements.includes('first_master')) {
            achievements.push({
                id: 'first_master',
                title: 'Ensimmäinen mestari!',
                description: 'Hallitset yhden aiheen täydellisesti!'
            });
        }
        
        if (this.progress.totalScore >= 1000 && !this.progress.achievements.includes('score_1000')) {
            achievements.push({
                id: 'score_1000',
                title: 'Tuhat pistettä!',
                description: 'Olet kerännyt 1000 pistettä!'
            });
        }
        
        achievements.forEach(achievement => {
            if (!this.progress.achievements.includes(achievement.id)) {
                this.progress.achievements.push(achievement.id);
            }
        });
        
        if (achievements.length > 0) {
            this.saveProgress();
        }
        
        return achievements;
    }
}

const progressTracker = new ProgressTracker();