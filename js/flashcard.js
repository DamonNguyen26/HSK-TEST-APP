// ==========================================
// QUẢN LÝ TÍNH NĂNG FLASHCARD (CÓ LƯU TIẾN TRÌNH & ĐỒNG BỘ EXP)
// ==========================================
class FlashcardManager {
    constructor() {
        this.setupScreen = document.getElementById("fcSetupScreen");
        if (!this.setupScreen) return;

        this.hskSelect = document.getElementById("fcHskSelect");
        this.learningModeSelect = document.getElementById("fcLearningMode");
        this.counterEl = document.getElementById("fcMasteredCounter");
        this.btnResume = document.getElementById("btnResumeFc");

        this.allWords = [];
        this.queue = [];
        this.currentIndex = 0;
        this.isFlipped = false;
        this.currentMode = "full";
        this.currentLevel = "1";

        this.updateCounterUI();
        this.checkSavedProgress(); // Kiểm tra xem có bài học dở không
    }

    async loadHskData(level) {
        try {
            let res = await fetch(`../dataApp/hsk-${level}.json`);
            if (res.ok) {
                let data = await res.json();
                // Đính kèm HSK level vào từng từ để lúc Ôn tập còn biết thuộc HSK mấy
                let terms = data.terms || [];
                terms.forEach(t => t.hskLevel = level);
                return terms;
            }
        } catch (e) {
            console.error("Lỗi tải HSK data cho flashcard:", e);
        }
        return [];
    }

    async updateCounterUI() {
        let level = this.hskSelect.value;
        let words = await this.loadHskData(level);
        let masteredSet = safeGetLocal(`fc_mastered_hsk_${level}`, "[]");
        
        if (words.length > 0) {
            this.counterEl.innerText = `Đã thuộc: ${masteredSet.length}/${words.length}`;
        } else {
            this.counterEl.innerText = `Đang tải...`;
        }
    }

    // Kiểm tra tiến trình cũ
    checkSavedProgress() {
        let savedQueue = safeGetLocal("fc_saved_queue", "null");
        if (savedQueue && savedQueue.length > 0) {
            let savedIndex = parseInt(localStorage.getItem("fc_saved_index") || "0");
            if (savedIndex < savedQueue.length) {
                if (this.btnResume) {
                    this.btnResume.style.display = "block";
                    this.btnResume.innerText = `🔄 TIẾP TỤC (Thẻ ${savedIndex + 1}/${savedQueue.length})`;
                }
                return;
            }
        }
        if (this.btnResume) this.btnResume.style.display = "none";
    }

    async start() {
        this.currentLevel = this.hskSelect.value;
        this.currentMode = this.learningModeSelect.value;
        this.allWords = await this.loadHskData(this.currentLevel);

        if (this.allWords.length === 0) {
            alert("Không tìm thấy dữ liệu từ vựng!");
            return;
        }

        // Xóa tiến trình cũ đi để học mới từ đầu
        localStorage.removeItem("fc_saved_queue");
        localStorage.removeItem("fc_saved_index");

        this.queue = [...this.allWords].sort(() => 0.5 - Math.random());
        this.currentIndex = 0;

        this.showPlayScreen();
    }

    resume() {
        // Tải lại dữ liệu từ bộ nhớ đang học dở
        this.queue = safeGetLocal("fc_saved_queue", "[]");
        this.currentIndex = parseInt(localStorage.getItem("fc_saved_index") || "0");
        this.currentMode = localStorage.getItem("fc_saved_mode") || "flip";
        this.currentLevel = localStorage.getItem("fc_saved_level") || "1";

        if (this.queue.length === 0) return this.start();
        this.showPlayScreen();
    }

    showPlayScreen() {
        document.getElementById("fcSetupScreen").style.display = "none";
        document.getElementById("fcPlayScreen").style.display = "block";
        document.getElementById("fcResultScreen").style.display = "none";
        this.renderCard();
    }

    // Lưu tiến trình hiện tại vào máy
    saveProgress() {
        localStorage.setItem("fc_saved_queue", JSON.stringify(this.queue));
        localStorage.setItem("fc_saved_index", this.currentIndex);
        localStorage.setItem("fc_saved_mode", this.currentMode);
        localStorage.setItem("fc_saved_level", this.currentLevel);
    }

    renderCard() {
        if (this.currentIndex >= this.queue.length) {
            this.endSession();
            return;
        }

        // Vừa render vừa lưu tiến trình để người dùng tắt web đột ngột vẫn giữ được
        this.saveProgress();

        let word = this.queue[this.currentIndex];
        document.getElementById("fcProgressText").innerText = `Thẻ ${this.currentIndex + 1} / ${this.queue.length}`;

        let hanziEl = document.getElementById("fcHanzi");
        let pinyinEl = document.getElementById("fcPinyin");
        let meaningEl = document.getElementById("fcMeaning");
        let tipText = document.getElementById("fcTipText");
        let cardContainer = document.getElementById("fcCardContainer");

        cardContainer.style.borderColor = "#e0e0e0";
        cardContainer.style.background = "#ffffff";

        hanziEl.innerText = word.word || word.simplified;
        pinyinEl.innerText = word.pinyin || "";
        meaningEl.innerText = word.meaning || word.english || "";
        
        if (this.currentMode === 'full') {
            pinyinEl.style.display = "block";
            meaningEl.style.display = "block";
            tipText.style.display = "none";
            this.isFlipped = true;
        } else {
            pinyinEl.style.display = "none";
            meaningEl.style.display = "none";
            tipText.style.display = "block";
            tipText.innerText = "💡 Chạm vào thẻ để lật xem đáp án";
            this.isFlipped = false;
        }
    }

    flipCard() {
        if (this.currentMode === 'full' || this.isFlipped) return;
        
        let pinyinEl = document.getElementById("fcPinyin");
        let meaningEl = document.getElementById("fcMeaning");
        let tipText = document.getElementById("fcTipText");
        let cardContainer = document.getElementById("fcCardContainer");

        pinyinEl.style.display = "block";
        meaningEl.style.display = "block";
        tipText.innerText = "✨ Bạn có thuộc từ này không?";
        cardContainer.style.borderColor = "#66bb6a";
        this.isFlipped = true;
    }

    markKnown() {
        let word = this.queue[this.currentIndex];
        let targetText = word.word || word.simplified;
        
        // 🟢 CỘNG 1 EXP KHI HỌC THUỘC FLASHCARD (Có giới hạn tối đa 100 EXP/ngày ở core.js)
        if (window.app && window.app.profile) {
            window.app.profile.addExp(1, 'flashcard');
        } else if (window.myProfile) {
            window.myProfile.addExp(1, 'flashcard');
        }

        // 1. Thêm vào danh sách "Đã Thuộc" (để đếm số lượng HSK)
        let masteredSet = safeGetLocal(`fc_mastered_hsk_${this.currentLevel}`, "[]");
        if (!masteredSet.includes(targetText)) {
            masteredSet.push(targetText);
            localStorage.setItem(`fc_mastered_hsk_${this.currentLevel}`, JSON.stringify(masteredSet));
        }

        // 2. XÓA TỰ ĐỘNG KHỎI DANH SÁCH ÔN TẬP FLASHCARD NẾU NÓ ĐANG Ở TRONG ĐÓ
        let fcReview = safeGetLocal("fcReviewWords", "[]");
        let originalLength = fcReview.length;
        fcReview = fcReview.filter(w => (w.word || w.simplified) !== targetText);
        if (fcReview.length < originalLength) {
            localStorage.setItem("fcReviewWords", JSON.stringify(fcReview));
        }

        this.nextCard();
    }

    markUnknown() {
        let word = this.queue[this.currentIndex];
        let targetText = word.word || word.simplified;
        
        // LƯU RIÊNG VÀO fcReviewWords (Không trộn chung với Game)
        let fcReview = safeGetLocal("fcReviewWords", "[]");
        if (!fcReview.some(w => (w.word || w.simplified) === targetText)) {
            fcReview.push(word);
            localStorage.setItem("fcReviewWords", JSON.stringify(fcReview));
        }

        this.nextCard();
    }

    nextCard() {
        this.currentIndex++;
        this.renderCard();
    }

    endSession() {
        // Xóa tiến trình vì đã học xong
        localStorage.removeItem("fc_saved_queue");
        localStorage.removeItem("fc_saved_index");
        if (this.btnResume) this.btnResume.style.display = "none";

        document.getElementById("fcPlayScreen").style.display = "none";
        document.getElementById("fcResultScreen").style.display = "block";
        this.updateCounterUI();
    }

    reset() {
        document.getElementById("fcResultScreen").style.display = "none";
        document.getElementById("fcSetupScreen").style.display = "block";
        this.updateCounterUI();
        this.checkSavedProgress();
    }

    quit() {
        // Lưu lần cuối trước khi thoát để an toàn
        this.saveProgress(); 
        document.getElementById("fcPlayScreen").style.display = "none";
        this.reset();
    }
}
// ==========================================
// CÁC HÀM GỌI GLOBAL CHO HTML
// ==========================================
function updateFcCounter() { app.flashcard.updateCounterUI(); }
function startFlashcard() { app.flashcard.start(); }
function resumeFlashcard() { app.flashcard.resume(); } 
function flipFlashcard() { app.flashcard.flipCard(); }
function fcMarkKnown() { app.flashcard.markKnown(); }
function fcMarkUnknown() { app.flashcard.markUnknown(); }
function resetFlashcard() { app.flashcard.reset(); }
function quitFlashcard() { app.flashcard.quit(); }