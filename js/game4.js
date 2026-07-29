// ==========================================
// QUẢN LÝ GAME 4 (PHẪU THUẬT TỪ & TÍNH GIỜ)
// ==========================================
class SurgeryGameManager {
    constructor(profile) {
        this.profile = profile; 
        this.setupScreen = document.getElementById("game4Setup");
        if (!this.setupScreen) return; 

        this.consecutiveWrong = 0;

        this.qCountInput = document.getElementById("g4QuestionCount");
        this.easySelect = document.getElementById("g4EasyTimeSelect");
        this.startHskSelect = document.getElementById("g4StartHskSelect");
        this.endHskSelect = document.getElementById("g4EndHskSelect");
        
        this.mode = 'easy'; 
        this.allWords = [];
        this.gameWords = [];
        this.currentIndex = 0;
        this.score = 0;
        
        this.timer = null;
        this.elapsedTimer = null; 
        this.totalTimeElapsed = 0;
        this.timeLeft = 0;
        this.maxTime = 0;
        this.userHistory = []; 

        this.currentWordTarget = "";
        this.currentSlots = [];
        this.trayPieces = [];

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
        document.getElementById("g4EasyModeCard").classList.remove("active-easy");
        document.getElementById("g4HardModeCard").classList.remove("active-hard");
        if (mode === 'easy') document.getElementById("g4EasyModeCard").classList.add("active-easy");
        else document.getElementById("g4HardModeCard").classList.add("active-hard");
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
            if (this.allWords.length === 0) return alert("Không tìm thấy dữ liệu từ vựng!");
        } catch(e) { return alert("Lỗi tải dữ liệu file JSON!"); }

        let validWords = [];
        this.allWords.forEach(w => {
            let rawText = w.word || w.simplified || "";
            let cleanText = rawText.split(/[,，/|、]/)[0].trim();
            
            if (cleanText.length > 0) {
                let clonedWord = { ...w, cleanWord: cleanText };
                if (w.hskLevel > 1) {
                    if (cleanText.length >= 2) validWords.push(clonedWord);
                } else {
                    validWords.push(clonedWord); 
                }
            }
        });

        if (validWords.length < 5) validWords = this.allWords.map(w => ({ ...w, cleanWord: (w.word || w.simplified).split(/[,，/|、]/)[0].trim() })); 

        let reqCount = parseInt(this.qCountInput.value);
        if(validWords.length < reqCount) reqCount = validWords.length; 
        let shuffled = [...validWords].sort(() => 0.5 - Math.random());
        this.gameWords = shuffled.slice(0, reqCount);

        this.setupScreen.style.display = "none";
        document.getElementById("game4PlayScreen").style.display = "block";
        this.currentIndex = 0;
        this.score = 0;
        this.userHistory = [];
        this.totalTimeElapsed = 0;

        clearInterval(this.elapsedTimer);
        this.elapsedTimer = setInterval(() => { this.totalTimeElapsed++; }, 1000);

        if (this.mode === 'easy') {
            this.timeLeft = parseInt(this.easySelect.value);
            this.maxTime = this.timeLeft;
            this.startGlobalTimer();
        }

        this.renderCaMo();
    }

    renderCaMo() {
        if (this.currentIndex >= this.gameWords.length) { this.endGame(); return; }
        
        let currentWord = this.gameWords[this.currentIndex];
        document.getElementById("g4ProgressText").innerText = `Ca mổ ${this.currentIndex + 1}/${this.gameWords.length}`;

        this.currentWordTarget = currentWord.cleanWord;
        let meaning = currentWord.meaning || currentWord.english;
        document.getElementById("g4MeaningPrompt").innerText = meaning;

        if (this.mode === 'hard') {
            this.timeLeft = parseInt(document.getElementById("g4HardTimeSelect").value);
            this.maxTime = this.timeLeft;
            this.startQuestionTimer(currentWord);
        }

        let targetChars = this.currentWordTarget.split('');
        let trayCharSet = new Set(targetChars);
        
        let poolChars = [];
        this.allWords.forEach(w => {
            let txt = w.cleanWord || w.word || w.simplified;
            txt.split('').forEach(c => poolChars.push(c));
        });
        poolChars.sort(() => 0.5 - Math.random());

        for (let c of poolChars) {
            if (trayCharSet.size >= 15) break;
            trayCharSet.add(c);
        }

        let trayChars = Array.from(trayCharSet).sort(() => 0.5 - Math.random());

        this.currentSlots = new Array(this.currentWordTarget.length).fill(null);
        
        this.trayPieces = trayChars.map((char, idx) => ({
            id: idx,
            char: char,
            used: false
        }));

        this.updateBoardUI();
    }

    updateBoardUI() {
        let slotsEl = document.getElementById("g4SlotsContainer");
        slotsEl.innerHTML = "";
        this.currentSlots.forEach((char, slotIdx) => {
            let slot = document.createElement("div");
            slot.className = `surgery-slot ${char ? 'filled' : ''}`;
            slot.innerText = char || "";
            slot.onclick = () => this.removeFromSlot(slotIdx);
            slotsEl.appendChild(slot);
        });

        let trayEl = document.getElementById("g4TrayContainer");
        trayEl.innerHTML = "";
        this.trayPieces.forEach(piece => {
            let pieceEl = document.createElement("div");
            pieceEl.className = `surgery-piece ${piece.used ? 'used' : ''}`;
            pieceEl.innerText = piece.char;
            pieceEl.onclick = () => this.selectPiece(piece.id);
            trayEl.appendChild(pieceEl);
        });
    }

    selectPiece(pieceId) {
        let piece = this.trayPieces.find(p => p.id === pieceId);
        if (!piece || piece.used) return;

        let emptySlotIdx = this.currentSlots.findIndex(s => s === null);
        if (emptySlotIdx === -1) return; 

        this.currentSlots[emptySlotIdx] = piece.char;
        piece.used = true;
        this.updateBoardUI();
    }

    removeFromSlot(slotIdx) {
        let charInSlot = this.currentSlots[slotIdx];
        if (!charInSlot) return;

        let piece = this.trayPieces.find(p => p.char === charInSlot && p.used);
        if (piece) piece.used = false;

        this.currentSlots[slotIdx] = null;
        this.updateBoardUI();
    }

    resetSurgeryCurrent() {
        this.currentSlots.fill(null);
        this.trayPieces.forEach(p => p.used = false);
        this.updateBoardUI();
    }

    submitSurgery() {
        if (this.currentSlots.includes(null)) {
            alert("⚠️ Ca mổ chưa hoàn tất! Hãy lắp đầy đủ các chữ vào ô khâu.");
            return;
        }

        if (this.mode === 'hard') clearInterval(this.timer);

        let playerResult = this.currentSlots.join('');
        let isCorrect = (playerResult === this.currentWordTarget);
        let currentWord = this.gameWords[this.currentIndex];

        if (isCorrect) {
            this.score++;
            this.consecutiveWrong = 0; 
            // 🟢 Cộng EXP khi phẫu thuật đúng
            if (this.profile) this.profile.addExp(1, 'game');
            else if (window.myProfile) window.myProfile.addExp(1, 'game');
        } else {
            this.consecutiveWrong++; 
            if (this.consecutiveWrong >= 10) {
                this.consecutiveWrong = 0;
                // 🔴 Trừ 10 EXP khi sai 10 ca liên tiếp
                if (this.profile) this.profile.deductExp(10);
                else if (window.myProfile) window.myProfile.deductExp(10);
            }
            this.saveToReview(currentWord);
            this.userHistory.push({
                meaning: currentWord.meaning || currentWord.english,
                playerResult: playerResult,
                correctResult: `${this.currentWordTarget} (${currentWord.pinyin || ''})`
            });
        }

        this.currentIndex++;
        this.renderCaMo();
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
                    this.userHistory.push({
                        meaning: w.meaning || w.english,
                        playerResult: "⏳ Hết giờ",
                        correctResult: `${w.word || w.simplified} (${w.pinyin || ''})`
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
                this.userHistory.push({
                    meaning: currentWord.meaning || currentWord.english,
                    playerResult: "⏳ Hết giờ",
                    correctResult: `${this.currentWordTarget} (${currentWord.pinyin || ''})`
                });
                this.currentIndex++;
                this.renderCaMo();
            }
        }, 1000);
    }

    updateTimerUI() {
        let pct = (this.timeLeft / this.maxTime) * 100;
        document.getElementById("g4TimerFill").style.width = pct + "%";
        if (this.mode === 'easy') {
            let m = Math.floor(this.timeLeft / 60);
            let s = this.timeLeft % 60;
            document.getElementById("g4TimerText").innerText = `${m}:${s < 10 ? '0':''}${s}`;
        } else {
            document.getElementById("g4TimerText").innerText = `${this.timeLeft}s`;
        }
    }

    saveToReview(word) {
        let words = JSON.parse(localStorage.getItem("reviewWords") || "[]");
        let targetText = word.word || word.simplified;
        if (!words.some(w => (w.word || w.simplified) === targetText)) {
            words.push(word); localStorage.setItem("reviewWords", JSON.stringify(words));
        }
    }

    endGame() {
        clearInterval(this.timer);
        clearInterval(this.elapsedTimer);
        document.getElementById("game4PlayScreen").style.display = "none";
        document.getElementById("game4ResultScreen").style.display = "block";
        document.getElementById("g4ScoreText").innerText = `${this.score} / ${this.gameWords.length}`;
        
        let m = Math.floor(this.totalTimeElapsed / 60);
        let s = this.totalTimeElapsed % 60;
        document.getElementById("g4TotalTime").innerText = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
        
        let historyHtml = "";
        if (this.userHistory.length === 0) {
            historyHtml = `<div style="text-align:center; padding: 20px; color:#00695c; font-weight:bold;">Xuất sắc! Bác sĩ tay nghề cao, cứu sống toàn bộ bệnh nhân! 🎉</div>`;
        } else {
            this.userHistory.forEach(item => {
                historyHtml += `
                    <div class="g4-history-item wrong">
                        <div class="g4-history-hanzi">Nghĩa: ${item.meaning}</div>
                        <div class="g4-history-detail">Bạn khâu thành: <span style="color:#c62828; font-weight:bold;">${item.playerResult}</span> | Ca mổ chuẩn: <span style="color:#00695c; font-weight:bold;">${item.correctResult}</span></div>
                    </div>`;
            });
        }
        document.getElementById("g4HistoryList").innerHTML = historyHtml;
    }

    resetGame() {
        clearInterval(this.timer);
        clearInterval(this.elapsedTimer);
        this.timer = null;
        document.getElementById("game4ResultScreen").style.display = "none";
        document.getElementById("game4PlayScreen").style.display = "none";
        this.setupScreen.style.display = "block";
    }
}

function selectGame4Mode(mode) { app.surgeryGame.setMode(mode); }
function checkGame4Hsk() { app.surgeryGame.checkHsk(); }
function startGame4() { app.surgeryGame.start(); }
function resetSurgeryCurrent() { app.surgeryGame.resetSurgeryCurrent(); }
function submitSurgery() { app.surgeryGame.submitSurgery(); }
function resetGame4() { app.surgeryGame.resetGame(); }
function leaveGame4() {
    if (app && app.surgeryGame) {
        clearInterval(app.surgeryGame.timer);
        clearInterval(app.surgeryGame.elapsedTimer);
    }
    window.location.href = 'gamecenter.html';
}