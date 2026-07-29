// ==========================================
// QUẢN LÝ GAME 2 (PINYIN GAME)
// ==========================================
class PinyinGameManager {
    constructor(profile) {
        this.profile = profile; 
        this.setupScreen = document.getElementById("game2Setup");
        if (!this.setupScreen) return; 

        this.consecutiveWrong = 0;

        this.qCountInput = document.getElementById("g2QuestionCount");
        this.easySelect = document.getElementById("g2EasyTimeSelect");
        this.startHskSelect = document.getElementById("g2StartHskSelect");
        this.endHskSelect = document.getElementById("g2EndHskSelect");
        this.mode = 'easy'; 
        this.allWords = [];
        this.gameWords = [];
        this.currentIndex = 0;
        this.score = 0;
        
        this.timer = null;
        this.elapsedTimer = null; 
        this.totalTimeElapsed = 0;
        this.userHistory = []; 

        this.toneGroups = [
            ["a", "ā", "á", "ǎ", "à"], ["e", "ē", "é", "ě", "è"],
            ["i", "ī", "í", "ǐ", "ì"], ["o", "ō", "ó", "ǒ", "ò"],
            ["u", "ū", "ú", "ǔ", "ù"]
        ];

        this.qCountInput.addEventListener('change', () => this.generateEasyTimeOptions());
        this.generateEasyTimeOptions();
        this.setMode('easy'); 
    }
    checkHsk() {
        let start = parseInt(this.startHskSelect.value);
        let end = parseInt(this.endHskSelect.value);
        if (start > end) this.endHskSelect.value = start;
    }
    generateEasyTimeOptions() {
        let count = parseInt(this.qCountInput.value);
        if (count < 10) count = 10;
        if (count > 100) count = 100;
        let minMin = count / 10;          
        let maxMin = (count / 10) * 1.5;  
        let step = (count <= 50) ? 0.5 : 1; 
        this.easySelect.innerHTML = "";
        for (let i = minMin; i <= maxMin; i += step) {
            let minutes = Math.floor(i);
            let seconds = (i % 1) * 60;
            let text = seconds > 0 ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
            this.easySelect.innerHTML += `<option value="${i * 60}">${text}</option>`; 
        }
    }
    setMode(mode) {
        this.mode = mode;
        document.getElementById("g2EasyModeCard").classList.remove("active-easy");
        document.getElementById("g2HardModeCard").classList.remove("active-hard");
        if (mode === 'easy') document.getElementById("g2EasyModeCard").classList.add("active-easy");
        else document.getElementById("g2HardModeCard").classList.add("active-hard");
    }
    generateDistractors(correctPinyin) {
        let distractors = new Set();
        const swapTone = (py) => {
            for (let group of this.toneGroups) {
                for (let char of group) {
                    if (py.includes(char)) {
                        let otherTones = group.filter(t => t !== char);
                        let randomTone = otherTones[Math.floor(Math.random() * otherTones.length)];
                        return py.replace(char, randomTone);
                    }
                }
            }
            return py; 
        };
        const swapConsonant = (py) => {
            let words = py.split(' ');
            words = words.map(w => {
                if (w.startsWith('zh')) return w.replace('zh', 'z');
                if (w.startsWith('z')) return w.replace('z', 'zh');
                if (w.startsWith('sh')) return w.replace('sh', 's');
                if (w.startsWith('s')) return w.replace('s', 'sh');
                if (w.startsWith('b')) return w.replace('b', 'p');
                if (w.startsWith('p')) return w.replace('p', 'b');
                if (w.startsWith('n')) return w.replace('n', 'l');
                if (w.startsWith('l')) return w.replace('l', 'n');
                return w;
            });
            let res = words.join(' ');
            return res !== py ? res : swapTone(swapTone(py)); 
        };
        const swapEnding = (py) => {
            let words = py.split(' ');
            words = words.map(w => {
                if (w.endsWith('ng')) return w.slice(0, -1);
                if (w.endsWith('n')) return w + 'g';
                return w;
            });
            let res = words.join(' ');
            return res !== py ? res : swapTone(py + "r"); 
        };
        let d1 = swapTone(correctPinyin);
        let d2 = swapConsonant(correctPinyin);
        let d3 = swapEnding(correctPinyin);
        [d1, d2, d3].forEach(d => { if (d !== correctPinyin) distractors.add(d); });
        let attempts = 0;
        while(distractors.size < 3 && attempts < 15) {
            let temp = swapTone(correctPinyin);
            if (temp !== correctPinyin) distractors.add(temp);
            attempts++;
        }
        return Array.from(distractors).slice(0, 3);
    }
    async start() {
        let startHsk = parseInt(this.startHskSelect.value);
        let endHsk = parseInt(this.endHskSelect.value);
        this.allWords = [];
        try {
            for (let level = startHsk; level <= endHsk; level++) {
                let res = await fetch(`../dataApp/hsk-${level}.json`);
                if (res.ok) {
                    let data = await res.json();
                    if (data.terms) {
                        data.terms.forEach(t => t.hskLevel = level);
                        this.allWords = this.allWords.concat(data.terms);
                    }
                }
            }
            if (this.allWords.length === 0) { 
                alert("Không tìm thấy dữ liệu từ vựng!"); 
                return; 
            }
        } catch(e) { 
            alert("Lỗi tải dữ liệu file JSON!"); 
            return; 
        }

        let reqCount = parseInt(this.qCountInput.value);
        if(this.allWords.length < reqCount) reqCount = this.allWords.length; 
        let shuffled = [...this.allWords].sort(() => 0.5 - Math.random());
        this.gameWords = shuffled.slice(0, reqCount);

        this.setupScreen.style.display = "none";
        document.getElementById("game2PlayScreen").style.display = "block";
        this.currentIndex = 0;
        this.score = 0;
        this.userHistory = [];

        clearInterval(this.elapsedTimer);
        this.totalTimeElapsed = 0;
        this.elapsedTimer = setInterval(() => { this.totalTimeElapsed++; }, 1000);

        if (this.mode === 'easy') {
            this.timeLeft = parseInt(this.easySelect.value);
            this.maxTime = this.timeLeft;
            this.startGlobalTimer();
        }
        this.renderQuestion();
    }
    renderQuestion() {
        if (this.currentIndex >= this.gameWords.length) { this.endGame(); return; }
        let currentWord = this.gameWords[this.currentIndex];
        let currentHanzi = currentWord.word || currentWord.simplified;
        let correctPinyin = currentWord.pinyin;

        document.getElementById("g2ProgressText").innerText = `Câu ${this.currentIndex + 1}/${this.gameWords.length}`;
        document.getElementById("g2QuestionHanzi").innerText = currentHanzi;

        if (this.mode === 'hard') {
            this.timeLeft = parseInt(document.getElementById("g2HardTimeSelect").value);
            this.maxTime = this.timeLeft;
            this.startQuestionTimer();
        }
        let wrongOptions = this.generateDistractors(correctPinyin);
        let options = [correctPinyin, ...wrongOptions].sort(() => 0.5 - Math.random());
        const grid = document.getElementById("g2OptionsGrid");
        grid.innerHTML = "";
        
        options.forEach(opt => {
            let btn = document.createElement("button");
            btn.innerText = opt;
            btn.onclick = (e) => this.checkAnswer(opt, currentWord, e.target, options);
            grid.appendChild(btn);
        });
    }
    checkAnswer(selectedPinyin, currentWord, clickedBtn, allOptionsRendered) {
        if (this.mode === 'hard') clearInterval(this.timer); 
        
        let allBtns = document.getElementById("g2OptionsGrid").querySelectorAll("button");
        allBtns.forEach(b => b.classList.add("btn-option-disabled"));

        let correctPinyin = currentWord.pinyin;
        let isCorrect = (selectedPinyin === correctPinyin);

        if (isCorrect) {
            this.score++;
            this.consecutiveWrong = 0; 
            clickedBtn.classList.add("btn-option-correct");
            // 🟢 Cộng EXP khi đúng
            if (this.profile) this.profile.addExp(1, 'game');
            else if (window.myProfile) window.myProfile.addExp(1, 'game');
        } else {
            this.consecutiveWrong++; 
            if (this.consecutiveWrong >= 10) {
                this.consecutiveWrong = 0;
                // 🔴 Trừ 10 EXP khi sai 10 câu liên tiếp
                if (this.profile) this.profile.deductExp(10);
                else if (window.myProfile) window.myProfile.deductExp(10);
            }
            clickedBtn.classList.add("btn-option-wrong");
            allBtns.forEach(b => { if(b.innerText === correctPinyin) b.classList.add("btn-option-correct"); });
            this.saveToReview(currentWord); 
        }
        this.userHistory.push({
            hanzi: currentWord.word || currentWord.simplified, correctPinyin: correctPinyin,
            selectedPinyin: selectedPinyin, isCorrect: isCorrect, meaning: currentWord.meaning || currentWord.english
        });

        setTimeout(() => { this.currentIndex++; this.renderQuestion(); }, 800);
    }
    startGlobalTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.markRemainingAsWrong();
                this.endGame();
            }
        }, 1000);
    }
    startQuestionTimer() {
        clearInterval(this.timer);
        this.updateTimerUI(); 
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                let currentWord = this.gameWords[this.currentIndex];
                this.saveToReview(currentWord); 
                this.userHistory.push({
                    hanzi: currentWord.word || currentWord.simplified, correctPinyin: currentWord.pinyin,
                    selectedPinyin: "⏳ Hết giờ", isCorrect: false, meaning: currentWord.meaning || currentWord.english
                });
                this.currentIndex++;
                this.renderQuestion();
            }
        }, 1000);
    }
    markRemainingAsWrong() {
        for(let i = this.currentIndex; i < this.gameWords.length; i++) {
            let word = this.gameWords[i];
            this.saveToReview(word);
            this.userHistory.push({
                hanzi: word.word || word.simplified, correctPinyin: word.pinyin,
                selectedPinyin: "⏳ Hết giờ", isCorrect: false, meaning: word.meaning || word.english
            });
        }
    }
    updateTimerUI() {
        let pct = (this.timeLeft / this.maxTime) * 100;
        document.getElementById("g2TimerFill").style.width = pct + "%";
        if (this.mode === 'easy') {
            let m = Math.floor(this.timeLeft / 60);
            let s = this.timeLeft % 60;
            document.getElementById("g2TimerText").innerText = `${m}:${s < 10 ? '0':''}${s}`;
        } else {
            document.getElementById("g2TimerText").innerText = `${this.timeLeft}s`;
        }
    }
    saveToReview(word) {
        let words = JSON.parse(localStorage.getItem("reviewWords") || "[]");
        let targetText = word.word || word.simplified;
        if (!words.some(w => (w.word || w.simplified) === targetText)) {
            words.push(word);
            localStorage.setItem("reviewWords", JSON.stringify(words));
        }
    }
    endGame() {
        clearInterval(this.timer);
        clearInterval(this.elapsedTimer); 
        
        document.getElementById("game2PlayScreen").style.display = "none";
        document.getElementById("game2ResultScreen").style.display = "block";
        document.getElementById("g2ScoreText").innerText = `${this.score} / ${this.gameWords.length}`;
        
        let m = Math.floor(this.totalTimeElapsed / 60);
        let s = this.totalTimeElapsed % 60;
        document.getElementById("g2TotalTime").innerText = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
        
        let historyHtml = "";
        let wrongAnswers = this.userHistory.filter(item => !item.isCorrect);

        if (wrongAnswers.length === 0) {
            historyHtml = `<div style="text-align:center; padding: 20px; color:#4caf50; font-weight:bold;">Tuyệt vời! Bạn không sai câu nào! 🎉</div>`;
        } else {
            wrongAnswers.forEach(item => {
                let userPickText = `Bạn chọn: <span class="g2-highlight-wrong">${item.selectedPinyin}</span> | Đáp án: <span class="g2-highlight-correct">${item.correctPinyin}</span>`;
                historyHtml += `
                    <div class="g2-history-item wrong">
                        <div class="g2-history-hanzi">${item.hanzi} - ${item.meaning}</div>
                        <div class="g2-history-detail">${userPickText}</div>
                    </div>`;
            });
        }
        document.getElementById("g2HistoryList").innerHTML = historyHtml;
    }

    resetGame() {
        clearInterval(this.timer);
        clearInterval(this.elapsedTimer);
        this.timer = null;
        document.getElementById("game2ResultScreen").style.display = "none";
        document.getElementById("game2PlayScreen").style.display = "none";
        this.setupScreen.style.display = "block";
    }
}

function selectGame2Mode(mode) { app.pinyinGame.setMode(mode); }
function startGame2() { app.pinyinGame.start(); }
function checkGame2Hsk() { app.pinyinGame.checkHsk(); }
function resetGame2() { app.pinyinGame.resetGame(); }
function leaveGame2() {
    if (app && app.pinyinGame) clearInterval(app.pinyinGame.timer);
    window.location.href = 'gamecenter.html';
}