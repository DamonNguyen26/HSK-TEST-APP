// ==========================================
// QUẢN LÝ TRANG CÀI ĐẶT (SETTING)
// ==========================================
class SettingManager {
    constructor(profile) { this.profile = profile; this.initUI(); }
    initUI() {
        const nameInput = document.getElementById("nameInput");
        if (!nameInput) return;
        nameInput.value = this.profile.name;
        document.getElementById("ageInput").value = this.profile.age;
        document.getElementById("hskSelect").value = "HSK " + this.profile.hsk;
    }
    saveSettings() {
        const name = document.getElementById("nameInput").value;
        const age = document.getElementById("ageInput").value;
        const hsk = document.getElementById("hskSelect").value.replace("HSK ", ""); 
        this.profile.save(name, age, hsk);
        alert("💾 Đã lưu cài đặt thành công!");
    }
}

function saveSetting() { app.setting.saveSettings(); }