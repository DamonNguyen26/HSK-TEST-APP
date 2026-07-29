// ==========================================
// QUẢN LÝ GAME 1 (THẦN TỐC HSK)
// ==========================================
class SpeedGameManager {
    constructor(profile) {
        this.profile = profile; 
        this.setupScreen = document.getElementById("setupScreen");
        if (!this.setupScreen) return;

        this.consecutiveWrong = 0; // Biến đếm sai liên tiếp để trừ EXP
        
        this.qCountInput = document.getElementById("questionCount");
        this.easySelect = document.getElementById("easyTimeSelect");
        this.startHskSelect = document.getElementById("startHskSelect");
        this.endHskSelect = document.getElementById("endHskSelect");
        this.gameModeTypeSelect = document.getElementById("gameModeType"); 
        
        this.mode = 'easy'; 
        this.quizType = 'hanzi_to_meaning'; 
        this.allWords = [];
        this.gameWords = [];
        this.currentIndex = 0;
        this.score = 0;
        
        this.timer = null;
        this.elapsedTimer = null; 
        this.totalTimeElapsed = 0; 
        this.userHistory = []; 
        
        this.qCountInput.addEventListener('change', () => this.generateEasyTimeOptions());
        this.generateEasyTimeOptions();
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
        document.getElementById("easyModeCard").classList.remove("active-easy", "active");
        document.getElementById("hardModeCard").classList.remove("active-hard", "active");
        if (mode === 'easy') {
            document.getElementById("easyModeCard").classList.add("active-easy");
        } else {
            document.getElementById("hardModeCard").classList.add("active-hard");
        }
    }
    async start() {
        let startHsk = parseInt(this.startHskSelect.value);
        let endHsk = parseInt(this.endHskSelect.value);
        this.quizType = this.gameModeTypeSelect ? this.gameModeTypeSelect.value : 'hanzi_to_meaning';
        
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
        document.getElementById("playScreen").style.display = "block";
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
        let currentMeaning = currentWord.meaning || currentWord.english;

        document.getElementById("progressText").innerText = `Câu ${this.currentIndex + 1}/${this.gameWords.length}`;

        if (this.quizType === 'meaning_to_hanzi') {
            document.getElementById("questionHanzi").innerText = currentMeaning;
            document.getElementById("questionHanzi").style.fontSize = "36px"; 
        } else {
            document.getElementById("questionHanzi").innerText = currentHanzi;
            document.getElementById("questionHanzi").style.fontSize = "58px";
        }

        if (this.mode === 'hard') {
            this.timeLeft = parseInt(document.getElementById("hardTimeSelect").value);
            this.maxTime = this.timeLeft;
            this.startQuestionTimer(currentWord);
        }

        let wrongOptions = this.allWords.filter(w => {
            let wText = (this.quizType === 'meaning_to_hanzi') ? (w.word || w.simplified) : (w.meaning || w.english);
            let cText = (this.quizType === 'meaning_to_hanzi') ? currentHanzi : currentMeaning;
            return wText !== cText;
        }).sort(() => 0.5 - Math.random()).slice(0, 3);

        let options = [currentWord, ...wrongOptions].sort(() => 0.5 - Math.random());
        const grid = document.getElementById("optionsGrid");
        grid.innerHTML = "";
        
        options.forEach(opt => {
            let btn = document.createElement("button");
            btn.className = "option-btn"; 
            
            let textPinyin = opt.pinyin || "";
            let textMean = opt.meaning || opt.english || "";
            let textHanzi = opt.word || opt.simplified || "";
            
            if (this.quizType === 'meaning_to_hanzi') {
                btn.innerHTML = `<span style="font-size:24px; font-weight:bold; color:#333;">${textHanzi}</span><br><span style="font-size:13px; color:#555;">${textPinyin}</span>`;
            } else {
                if (this.mode === 'hard') {
                    btn.innerHTML = `<span style="font-size:16px; font-weight:bold; color:#333;">${textMean}</span>`;
                } else {
                    btn.innerHTML = `<span style="color:#333;">${textPinyin}</span><br><span style="font-size:14px; font-weight:normal; color:#555;">${textMean}</span>`;
                }
            }
            
            btn.onclick = () => this.checkAnswer(opt, currentWord);
            grid.appendChild(btn);
        });
    }
    checkAnswer(selected, correct) {
        if (this.mode === 'hard') clearInterval(this.timer); 
        
        let selText = (this.quizType === 'meaning_to_hanzi') ? (selected.word || selected.simplified) : (selected.meaning || selected.english);
        let corrText = (this.quizType === 'meaning_to_hanzi') ? (correct.word || correct.simplified) : (correct.meaning || correct.english);
        let isCorrect = (selText === corrText);
        
        if (isCorrect) {
            this.score++;
            this.consecutiveWrong = 0; 
            // 🟢 Cộng 1 EXP khi trả lời đúng (sử dụng cả this.profile hoặc window.myProfile)
            if (this.profile) this.profile.addExp(1, 'game');
            else if (window.myProfile) window.myProfile.addExp(1, 'game');
        } else {
            this.consecutiveWrong++; 
            if (this.consecutiveWrong >= 10) {
                this.consecutiveWrong = 0; 
                // 🔴 Trừ 10 EXP khi sai liên tiếp 10 câu
                if (this.profile) this.profile.deductExp(10);
                else if (window.myProfile) window.myProfile.deductExp(10);
            }
            this.saveToReview(correct); 
        }
        
        let displayCorrect = (this.quizType === 'meaning_to_hanzi') ? (correct.word || correct.simplified) : (correct.meaning || correct.english);
        let displaySelected = (this.quizType === 'meaning_to_hanzi') ? (selected.word || selected.simplified) : (selected.meaning || selected.english);

        this.userHistory.push({
            hanzi: correct.word || correct.simplified,
            pinyin: correct.pinyin,
            correctMeaning: displayCorrect,
            selectedMeaning: displaySelected,
            isCorrect: isCorrect,
            quizType: this.quizType
        });
        
        this.currentIndex++;
        this.renderQuestion();
    }
    startGlobalTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                for(let i = this.currentIndex; i < this.gameWords.length; i++) { 
                    let w = this.gameWords[i];
                    this.saveToReview(w); 
                    let displayCorrect = (this.quizType === 'meaning_to_hanzi') ? (w.word || w.simplified) : (w.meaning || w.english);
                    this.userHistory.push({
                        hanzi: w.word || w.simplified, pinyin: w.pinyin,
                        correctMeaning: displayCorrect, selectedMeaning: "⏳ Hết giờ", isCorrect: false, quizType: this.quizType
                    });
                }
                this.endGame();
            }
        }, 1000);
    }
    startQuestionTimer(currentWord) {
        clearInterval(this.timer);
        this.updateTimerUI(); 
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.saveToReview(currentWord); 
                let displayCorrect = (this.quizType === 'meaning_to_hanzi') ? (currentWord.word || currentWord.simplified) : (currentWord.meaning || currentWord.english);
                this.userHistory.push({
                    hanzi: currentWord.word || currentWord.simplified, pinyin: currentWord.pinyin,
                    correctMeaning: displayCorrect, selectedMeaning: "⏳ Hết giờ", isCorrect: false, quizType: this.quizType
                });
                this.currentIndex++;
                this.renderQuestion();
            }
        }, 1000);
    }
    updateTimerUI() {
        let pct = (this.timeLeft / this.maxTime) * 100;
        document.getElementById("timerFill").style.width = pct + "%";
        if (this.mode === 'easy') {
            let m = Math.floor(this.timeLeft / 60);
            let s = this.timeLeft % 60;
            document.getElementById("timerText").innerText = `${m}:${s < 10 ? '0':''}${s}`;
        } else {
            document.getElementById("timerText").innerText = `${this.timeLeft}s`;
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
        
        document.getElementById("playScreen").style.display = "none";
        document.getElementById("resultScreen").style.display = "block";
        document.getElementById("scoreText").innerText = `${this.score} / ${this.gameWords.length}`;
        
        let m = Math.floor(this.totalTimeElapsed / 60);
        let s = this.totalTimeElapsed % 60;
        document.getElementById("g1TotalTime").innerText = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
        
        let historyHtml = "";
        let wrongAnswers = this.userHistory.filter(item => !item.isCorrect);

        if (wrongAnswers.length === 0) {
            historyHtml = `<div style="text-align:center; padding: 20px; color:#4caf50; font-weight:bold;">Tuyệt vời! Bạn không sai câu nào! 🎉</div>`;
        } else {
            wrongAnswers.forEach(item => {
                let userPickText = `Bạn chọn: <span class="g1-highlight-wrong">${item.selectedMeaning}</span> | Đáp án: <span class="g1-highlight-correct">${item.correctMeaning}</span>`;
                
                let titleHeader = (item.quizType === 'meaning_to_hanzi') 
                    ? `Nghĩa: ${item.correctMeaning}` 
                    : `${item.hanzi} (${item.pinyin})`;

                historyHtml += `
                    <div class="g1-history-item wrong">
                        <div class="g1-history-hanzi">${titleHeader}</div>
                        <div class="g1-history-detail">${userPickText}</div>
                    </div>`;
            });
        }
        document.getElementById("g1HistoryList").innerHTML = historyHtml;
    }

    resetGame() {
        clearInterval(this.timer);
        clearInterval(this.elapsedTimer);
        this.timer = null;
        document.getElementById("resultScreen").style.display = "none";
        document.getElementById("playScreen").style.display = "none";
        this.setupScreen.style.display = "block";
    }
}

function selectGameMode(mode) { app.speedGame.setMode(mode); }
function startSpeedGame() { app.speedGame.start(); }
function checkGameHsk() { app.speedGame.checkHsk(); }
function resetSpeedGame() { app.speedGame.resetGame(); }
function leaveGame() {
    if (app && app.speedGame) clearInterval(app.speedGame.timer);
    window.location.href = 'gamecenter.html';
}