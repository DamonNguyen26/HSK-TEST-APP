// ==========================================
// KHỞI TẠO ỨNG DỤNG & SỰ KIỆN HTML
// ==========================================
class HSKGameApp {
    constructor() {
        // Chỉ chạy nếu PlayerProfile đã được nạp từ core.js
        if (typeof PlayerProfile !== 'undefined') {
            this.profile = new PlayerProfile();
        }
        
        window.onload = () => {
            if (this.profile) this.profile.updateUI();
            
            // Khởi tạo các Manager nếu file js tương ứng của chúng đã được chèn vào HTML
            if (typeof SettingManager !== 'undefined') {
                this.setting = new SettingManager(this.profile);
            }
            if (typeof VocabManager !== 'undefined') {
                this.vocab = new VocabManager();
            }
            if (typeof ReviewManager !== 'undefined') {
                this.review = new ReviewManager();
            }
            
            // Tự động phát hiện xem người dùng đang mở trang game nào
            if (document.getElementById("setupScreen") && typeof SpeedGameManager !== 'undefined') {
                this.speedGame = new SpeedGameManager(this.profile);
            }
            if (document.getElementById("game2Setup") && typeof PinyinGameManager !== 'undefined') {
                this.pinyinGame = new PinyinGameManager(this.profile);
            }
            if (document.getElementById("game3Setup") && typeof TypingGameManager !== 'undefined') {
                this.typingGame = new TypingGameManager(this.profile);
            }
            if (document.getElementById("game4Setup") && typeof SurgeryGameManager !== 'undefined') {
                this.surgeryGame = new SurgeryGameManager(this.profile);
            }
            if (document.getElementById("fcSetupScreen") && typeof FlashcardManager !== 'undefined') {
                this.flashcard = new FlashcardManager();
            }
        };
    }
}
const app = new HSKGameApp();

// Hệ thống bảo vệ Loading Screen
window.addEventListener('DOMContentLoaded', () => {
    let loader = document.getElementById('globalLoader') || document.getElementById('loadingScreen');
    if (loader) {
        setTimeout(() => { if (loader.style.display !== 'none') loader.style.display = 'none'; }, 3000);
    }
});