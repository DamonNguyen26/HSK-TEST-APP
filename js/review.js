// ==========================================
// QUẢN LÝ TRANG ÔN TẬP (REVIEW) - PHÂN LOẠI THEO TAB & HSK
// ==========================================
class ReviewManager {
    constructor() {
        this.reviewList = document.getElementById("reviewList");
        this.currentTab = 'game'; // 'game' hoặc 'flashcard'
        this.currentHsk = 'all';  // 'all', '1', '2', '3', '4', '5', '6'
        if (this.reviewList) this.render();
    }
    
    setTab(tabName) {
        this.currentTab = tabName;
        document.getElementById("tabGame").classList.remove("active-tab");
        document.getElementById("tabFlashcard").classList.remove("active-tab");
        
        if(tabName === 'game') document.getElementById("tabGame").classList.add("active-tab");
        else document.getElementById("tabFlashcard").classList.add("active-tab");
        
        this.render();
    }

    setHskFilter(hsk) {
        this.currentHsk = hsk;
        document.querySelectorAll("[id^='reviewHsk_']").forEach(el => el.classList.remove("active-tab"));
        let activeEl = document.getElementById(`reviewHsk_${hsk}`);
        if(activeEl) activeEl.classList.add("active-tab");
        this.render();
    }

    render() {
        let storageKey = (this.currentTab === 'game') ? "reviewWords" : "fcReviewWords";
        let words = safeGetLocal(storageKey, "[]"); 

        // Lọc danh sách theo HSK nếu người dùng chọn cấp độ cụ thể
        let filteredWords = words;
        if (this.currentHsk !== 'all') {
            filteredWords = words.filter(w => String(w.hskLevel || "1") === String(this.currentHsk));
        }

        const countEl = document.getElementById("reviewCount");
        
        if (filteredWords.length === 0) {
            let emptyMsg = (this.currentTab === 'game') 
                ? `Không có từ sai nào ở HSK ${this.currentHsk === 'all' ? '' : this.currentHsk}.`
                : `Không có từ flashcard nào ở HSK ${this.currentHsk === 'all' ? '' : this.currentHsk}.`;
                
            this.reviewList.innerHTML = `
                <div class="review-empty-box">
                    <div class="review-empty-icon">🎉</div>
                    <div class="review-empty-title">Tuyệt vời!</div>
                    <div class="review-empty-desc">${emptyMsg}</div>
                </div>`;
            if (countEl) countEl.style.display = "none";
            return;
        }

        if (countEl) {
            countEl.style.display = "inline-block";
            countEl.innerText = `${filteredWords.length} từ cần ôn`;
        }

        this.reviewList.innerHTML = filteredWords.map((item) => {
            // Tìm vị trí thật của từ trong mảng gốc để khi bấm "Đã thuộc" xóa chuẩn xác
            let realIndex = words.findIndex(w => (w.word || w.simplified) === (item.word || item.simplified));
            let hskBadge = item.hskLevel ? `HSK ${item.hskLevel}` : `HSK 1`;

            return `
                <div class="review-word-card">
                    <div class="review-word-info">
                        <div style="font-size: 11px; background: #e3f2fd; color: #1976d2; display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: bold; margin-bottom: 4px;">${hskBadge}</div>
                        <div class="hanzi">${item.word || item.simplified}</div>
                        <div class="pinyin">${item.pinyin || ''}</div>
                        <div class="meaning">${item.meaning || item.english || ''}</div>
                    </div>
                    <button class="btn-mastered" onclick="removeReviewWord(${realIndex})">✓ Đã thuộc</button>
                </div>`;
        }).join('');
    }

    removeWord(index) {
        let storageKey = (this.currentTab === 'game') ? "reviewWords" : "fcReviewWords";
        let words = safeGetLocal(storageKey, "[]"); 
        
        // Nếu xóa ở mục Flashcard, tự động ghi nhận đã thuộc bộ flashcard đó luôn
        if (this.currentTab === 'flashcard' && words[index]) {
            let word = words[index];
            let level = word.hskLevel || "1";
            let targetText = word.word || word.simplified;
            let masteredSet = safeGetLocal(`fc_mastered_hsk_${level}`, "[]");
            if (!masteredSet.includes(targetText)) {
                masteredSet.push(targetText);
                localStorage.setItem(`fc_mastered_hsk_${level}`, JSON.stringify(masteredSet));
            }
        }

        words.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(words));
        this.render();
    }
}

// Các hàm Global liên kết với HTML
function removeReviewWord(index) { app.review.removeWord(index); }
function switchReviewTab(tabName) { app.review.setTab(tabName); }
function filterReviewHsk(hsk) { app.review.setHskFilter(hsk); }