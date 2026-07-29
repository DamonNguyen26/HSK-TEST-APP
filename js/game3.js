// ==========================================
// THUẬT TOÁN HỖ TRỢ XỬ LÝ CHUỖI GÕ GAME 3
// ==========================================
function cleanAndSplitOptions(rawStr) {
    if (!rawStr) return [];
    let str = rawStr.replace(/[\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/\([^)]*\)/g, '')
             .replace(/\[[^\]]*\]/g, '')
             .replace(/\{[^}]*\}/g, '')
             .replace(/<[^>]*>/g, '');
    str = str.replace(/['"]/g, '');
    let parts = str.split(/[/|,;，、；]/);
    return parts.map(p => p.trim().replace(/\s+/g, ' ')).filter(p => p.length > 0);
}

function normalizeVietnamese(str) {
    if (!str) return "";
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePinyin(str) {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
}

function normalizeHanzi(str) {
    if (!str) return "";
    return str.replace(/\s+/g, '');
}

// ==========================================
// QUẢN LÝ GAME 3 (ANH HÙNG BÀN PHÍM)
// ==========================================
class TypingGameManager {
    constructor(profile) {
        this.profile = profile; 
        this.setupScreen = document.getElementById("game3Setup");
        if (!this.setupScreen) return; 

        this.consecutiveWrong = 0;

        this.qCountInput = document.getElementById("g3QuestionCount");
        this.startHskSelect = document.getElementById("g3StartHskSelect");
        this.endHskSelect = document.getElementById("g3EndHskSelect");
        this.quizTypeSelect = document.getElementById("g3QuizType");
        this.inputBox = document.getElementById("g3TypingInput");
        
        this.mode = 'easy'; 
        this.quizType = 'hanzi_to_vi'; 
        this.allWords = [];
        this.gameWords = [];
        this.currentIndex = 0;
        this.score = 0;
        
        this.timer = null;
        this.totalTimeElapsed = 0;
        this.userHistory = []; 

        this.currentDisplayQuestion = "";
        this.hanziOptions = [];
        this.pinyinOptions = [];
        this.meaningOptions = [];
    }

    checkHsk() {
        let start = parseInt(this.startHskSelect.value);
        let end = parseInt(this.endHskSelect.value);
        if (start > end) this.endHskSelect.value = start;
    }

    setMode(mode) {
        this.mode = mode;
        document.getElementById("g3EasyModeCard").classList.remove("active-easy");
        document.getElementById("g3HardModeCard").classList.remove("active-hard");
        if (mode === 'easy') document.getElementById("g3EasyModeCard").classList.add("active-easy");
        else document.getElementById("g3HardModeCard").classList.add("active-hard");
    }

    async start() {
        let startHsk = parseInt(this.startHskSelect.value);
        let endHsk = parseInt(this.endHskSelect.value);
        this.quizType = this.quizTypeSelect.value;
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

        this.gameWords.forEach(w => w.skipCount = 0);

        this.setupScreen.style.display = "none";
        document.getElementById("game3PlayScreen").style.display = "block";
        this.currentIndex = 0;
        this.score = 0;
        this.userHistory = [];
        this.totalTimeElapsed = 0;

        clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.totalTimeElapsed++;
            let m = Math.floor(this.totalTimeElapsed / 60);
            let s = this.totalTimeElapsed % 60;
            document.getElementById("g3TimerText").innerText = `⏱️ ${m}:${s < 10 ? '0':''}${s}`;
        }, 1000);

        this.renderQuestion();
    }

    renderQuestion() {
        if (this.currentIndex >= this.gameWords.length) { this.endGame(); return; }
        
        this.inputBox.disabled = false;
        this.inputBox.value = "";
        this.inputBox.classList.remove("error", "success");
        this.inputBox.focus();

        let currentWord = this.gameWords[this.currentIndex];
        document.getElementById("g3ProgressText").innerText = `Câu ${this.currentIndex + 1}/${this.gameWords.length}`;

        this.hanziOptions = cleanAndSplitOptions(currentWord.word || currentWord.simplified);
        this.pinyinOptions = cleanAndSplitOptions(currentWord.pinyin);
        this.meaningOptions = cleanAndSplitOptions(currentWord.meaning || currentWord.english);
        
        if (this.hanziOptions.length === 0) this.hanziOptions = [currentWord.word || currentWord.simplified];
        if (this.meaningOptions.length === 0) this.meaningOptions = [currentWord.meaning || currentWord.english];

        let displayEl = document.getElementById("g3QuestionDisplay");

        if (this.quizType === 'hanzi_to_vi') {
            this.currentDisplayQuestion = this.hanziOptions[Math.floor(Math.random() * this.hanziOptions.length)];
            displayEl.innerText = this.currentDisplayQuestion;
            displayEl.style.fontSize = "58px";
            this.inputBox.placeholder = "Gõ nghĩa Tiếng Việt...";
        } else {
            this.currentDisplayQuestion = this.meaningOptions[Math.floor(Math.random() * this.meaningOptions.length)];
            displayEl.innerText = this.currentDisplayQuestion;
            displayEl.style.fontSize = "32px";
            this.inputBox.placeholder = "Gõ Pinyin (không dấu) / Hán tự...";
        }
    }

    evaluateAnswer(isSkip = false) {
        let userInput = this.inputBox.value;
        let currentWord = this.gameWords[this.currentIndex];
        let isCorrect = false;

        if (isSkip) {
            if (this.mode === 'easy') {
                currentWord.skipCount++;
                if (currentWord.skipCount === 1) {
                    this.gameWords.push(currentWord);
                    this.currentIndex++;
                    this.renderQuestion();
                    return; 
                }
            }
            userInput = "⏭️ Đã bỏ qua";
        } else {
            if (userInput.trim() === "") {
                userInput = "❌ (Bỏ trống)";
            } else {
                if (this.quizType === 'hanzi_to_vi') {
                    let normalizedInput = normalizeVietnamese(userInput);
                    isCorrect = this.meaningOptions.some(m => normalizeVietnamese(m) === normalizedInput);
                } else {
                    let inputHanzi = normalizeHanzi(userInput);
                    let inputPinyin = normalizePinyin(userInput);
                    isCorrect = this.hanziOptions.some(h => normalizeHanzi(h) === inputHanzi) || 
                                this.pinyinOptions.some(p => normalizePinyin(p) === inputPinyin);
                }
            }
        }

        this.inputBox.disabled = true;

        if (isSkip) {
            this.consecutiveWrong++; 
            if (this.consecutiveWrong >= 10) {
                this.consecutiveWrong = 0;
                if (this.profile) this.profile.deductExp(10);
                else if (window.myProfile) window.myProfile.deductExp(10);
            }
            this.handleAnswerResult(userInput, false, currentWord);
        } else {
            if (isCorrect) {
                this.score++;
                this.consecutiveWrong = 0; 
                this.inputBox.classList.add("success");
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
                this.inputBox.classList.add("error");
            }
            setTimeout(() => {
                this.handleAnswerResult(userInput, isCorrect, currentWord);
            }, 400); 
        }
    }

    handleAnswerResult(userTyped, isCorrect, wordData) {
        if (!isCorrect) {
            this.saveToReview(wordData);
            let correctDisplay = (this.quizType === 'hanzi_to_vi') 
                ? this.meaningOptions.join(" HOẶC ") 
                : `${this.hanziOptions.join(" / ")} (${this.pinyinOptions.join(" / ")})`;

            this.userHistory.push({
                question: this.currentDisplayQuestion, 
                typed: userTyped,
                correctAnswer: correctDisplay
            });
        }
        
        this.currentIndex++;
        this.renderQuestion();
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
        document.getElementById("game3PlayScreen").style.display = "none";
        document.getElementById("game3ResultScreen").style.display = "block";
        document.getElementById("g3ScoreText").innerText = `${this.score} / ${this.gameWords.length}`;
        
        let m = Math.floor(this.totalTimeElapsed / 60);
        let s = this.totalTimeElapsed % 60;
        document.getElementById("g3TotalTime").innerText = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
        
        let historyHtml = "";
        if (this.userHistory.length === 0) {
            historyHtml = `<div style="text-align:center; padding: 20px; color:#00695c; font-weight:bold;">Tuyệt vời! Bạn không sai câu nào! 🎉</div>`;
        } else {
            this.userHistory.forEach(item => {
                historyHtml += `
                    <div class="g3-history-item wrong">
                        <div class="g3-history-hanzi">${item.question}</div>
                        <div class="g3-history-detail">Bạn gõ: <span class="g3-highlight-wrong">${item.typed}</span> | Đáp án: <span class="g3-highlight-correct">${item.correctAnswer}</span></div>
                    </div>`;
            });
        }
        document.getElementById("g3HistoryList").innerHTML = historyHtml;
    }

    resetGame() {
        clearInterval(this.timer);
        document.getElementById("game3ResultScreen").style.display = "none";
        document.getElementById("game3PlayScreen").style.display = "none";
        this.setupScreen.style.display = "block";
    }
}

function selectGame3Mode(mode) { app.typingGame.setMode(mode); } 
function checkGame3Hsk() { app.typingGame.checkHsk(); }
function startGame3() { app.typingGame.start(); }
function submitGame3Answer() { app.typingGame.evaluateAnswer(false); }
function skipGame3Question() { app.typingGame.evaluateAnswer(true); }
function resetGame3() { app.typingGame.resetGame(); }
function leaveGame3() {
    if (app && app.typingGame) clearInterval(app.typingGame.timer);
    window.location.href = 'gamecenter.html';
}