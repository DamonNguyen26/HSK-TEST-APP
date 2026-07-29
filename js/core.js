// ==========================================
// 0. HỆ THỐNG BẢO VỆ TRẢI NGHIỆM NGƯỜI DÙNG (CORE SHIELD)
// ==========================================

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.warn("⚠️ App phát hiện sự cố, đang tự động khôi phục...", msg);
    let loader = document.getElementById('globalLoader');
    if(loader) loader.style.display = 'none';
    return true; 
};

function safeGetLocal(key, defaultVal = "[]") {
    try {
        let data = localStorage.getItem(key);
        if (!data || data === "undefined" || data === "null") return JSON.parse(defaultVal);
        return JSON.parse(data);
    } catch (e) {
        console.error(`Lỗi dữ liệu tại [${key}], đã tự động reset để cứu app.`);
        localStorage.setItem(key, defaultVal);
        return JSON.parse(defaultVal);
    }
}

function renderWithoutFreezing(array, renderItemFunc, containerId, chunkSize = 50) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ""; 
    
    let index = 0;
    function renderChunk() {
        let chunkHtml = "";
        let end = Math.min(index + chunkSize, array.length);
        
        for (let i = index; i < end; i++) {
            chunkHtml += renderItemFunc(array[i], i);
        }
        
        container.insertAdjacentHTML('beforeend', chunkHtml);
        index += chunkSize;
        
        if (index < array.length) {
            requestAnimationFrame(renderChunk);
        }
    }
    renderChunk();
}

// ==========================================
// 1. QUẢN LÝ HỒ SƠ NGƯỜI CHƠI & HỆ THỐNG LEVEL (EXP)
// ==========================================
class PlayerProfile {
    constructor() { 
        window.myProfile = this; // Tạo lối tắt toàn cục gọi EXP an toàn
        this.load(); 
    }
    
    load() {
        this.name = localStorage.getItem("playerName") || "Damon Nguyen";
        this.age = localStorage.getItem("playerAge") || "18";
        
        let rawHsk = localStorage.getItem("currentHSK") || "1";
        this.hsk = rawHsk.replace(/[^0-9]/g, '') || "1"; 
        this.rank = localStorage.getItem("rank") || "Đồng";

        // Khởi tạo Level & EXP (Bắt đầu từ LV. 1, 0 EXP)
        this.level = parseInt(localStorage.getItem("playerLevel") || "1");
        this.exp = parseInt(localStorage.getItem("playerExp") || "0");
        
        this.checkDailyFlashcardExp();
    }

    // ⚙️ CÔNG THỨC TÍNH EXP CẦN THIẾT ĐỂ LÊN CẤP
    getRequiredExp(lvl) {
        if (lvl < 10) {
            return lvl * 100; // Cấp 1->2 cần 100, 2->3 cần 200, ..., 9->10 cần 1000
        } else {
            return lvl * 150 + 500; // Từ cấp 10 trở đi tăng mượt mà
        }
    }

    // Hàm cộng EXP (source: 'game' hoặc 'flashcard')
    addExp(amount, source = 'game') {
        if (source === 'flashcard') {
            let todayStr = new Date().toDateString();
            let fcTodayExp = parseInt(localStorage.getItem(`fc_exp_${todayStr}`) || "0");
            
            if (fcTodayExp >= 100) return false; // Giới hạn tối đa 100 EXP Flashcard mỗi ngày
            
            let allowedAdd = Math.min(amount, 100 - fcTodayExp);
            if (allowedAdd <= 0) return false;
            
            localStorage.setItem(`fc_exp_${todayStr}`, fcTodayExp + allowedAdd);
            amount = allowedAdd;
        }

        this.exp += amount;
        let reqExp = this.getRequiredExp(this.level);
        let leveledUp = false;

        // Xử lý thăng cấp liên tục nếu đủ điểm
        while (this.exp >= reqExp && this.level < 100) {
            this.exp -= reqExp;
            this.level++;
            leveledUp = true;
            reqExp = this.getRequiredExp(this.level);
        }

        if (this.level >= 100) {
            this.level = 100;
            this.exp = 0;
        }

        this.saveToStorage();
        this.updateUI();

        if (leveledUp) {
            this.showLevelUpEffect(this.level);
        }
        return true;
    }

    // Hàm trừ 10 EXP khi sai 10 câu liên tiếp
    deductExp(amount = 10) {
        this.exp -= amount;
        if (this.exp < 0) {
            if (this.level > 1) {
                this.level--;
                let prevReq = this.getRequiredExp(this.level);
                this.exp = prevReq + this.exp; 
            } else {
                this.exp = 0; 
            }
        }
        this.saveToStorage();
        this.updateUI();
    }

    checkDailyFlashcardExp() {
        let todayStr = new Date().toDateString();
        let lastLoginDate = localStorage.getItem("last_login_date");
        if (lastLoginDate !== todayStr) {
            localStorage.setItem("last_login_date", todayStr);
        }
    }

    saveToStorage() {
        localStorage.setItem("playerLevel", this.level);
        localStorage.setItem("playerExp", this.exp);
    }

    save(name, age, hsk) {
        let cleanHsk = hsk.toString().replace(/[^0-9]/g, '');
        this.name = name;
        this.age = age;
        this.hsk = cleanHsk;
        
        localStorage.setItem("playerName", name);
        localStorage.setItem("playerAge", age);
        localStorage.setItem("currentHSK", cleanHsk);
        
        this.updateUI(); 
    }

    showLevelUpEffect(newLevel) {
        let toast = document.getElementById("expPopupToast");
        if (toast) {
            toast.innerText = `🎉 CHÚC MỪNG! Đã thăng lên LV. ${newLevel}!`;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 3500);
        }
    }

    updateUI() {
        document.querySelectorAll("#playerName").forEach(el => el.innerText = this.name);
        document.querySelectorAll("#playerAge").forEach(el => el.innerText = this.age + " tuổi");
        
        // Trả lại HSK cho dòng trên
        let currentHSKEls = document.querySelectorAll("#currentHSK");
        currentHSKEls.forEach(el => {
            el.innerText = `HSK ${this.hsk}`;
        });

        // Đưa LV. X thay thế vị trí chữ Đồng ở dòng dưới
        let playerRankEls = document.querySelectorAll("#playerRank");
        playerRankEls.forEach(el => {
            el.innerText = `LV. ${this.level}`;
        });

        // Vẽ thanh EXP ngang viền dưới khung Profile
        let reqExp = this.getRequiredExp(this.level);
        let percent = Math.min(100, Math.max(0, (this.exp / reqExp) * 100));

        document.querySelectorAll(".profile").forEach(profileEl => {
            let barContainer = profileEl.querySelector(".exp-bar-container");
            if (!barContainer) {
                barContainer = document.createElement("div");
                barContainer.className = "exp-bar-container";
                barContainer.innerHTML = `<div class="exp-bar-fill" style="width: ${percent}%;"></div>`;
                profileEl.appendChild(barContainer);

                // Chạm vào khung profile để xem chi tiết EXP
                profileEl.addEventListener('click', () => {
                    let toast = document.getElementById("expPopupToast");
                    if (!toast) {
                        toast = document.createElement("div");
                        toast.id = "expPopupToast";
                        document.body.appendChild(toast);
                    }
                    toast.innerText = `📊 EXP: ${this.exp} / ${reqExp} (Cần ${reqExp - this.exp} EXP lên cấp)`;
                    toast.classList.add("show");
                    setTimeout(() => toast.classList.remove("show"), 3000);
                });
            } else {
                let fill = barContainer.querySelector(".exp-bar-fill");
                if (fill) fill.style.width = `${percent}%`;
            }
        });
    }
}
// ==========================================
// ĐĂNG KÝ PWA (CHẠY OFFLINE)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Vì core.js được gọi từ các file html bên trong hoặc ngoài, ta dùng đường dẫn tuyệt đối hoặc linh hoạt
        let swPath = window.location.pathname.includes('/html/') ? '../sw.js' : './sw.js';
        navigator.serviceWorker.register(swPath)
        .then(reg => console.log('Service Worker đăng ký thành công!', reg.scope))
        .catch(err => console.log('Service Worker đăng ký thất bại: ', err));
    });
}