// ==========================================
// QUẢN LÝ TỪ VỰNG (VOCABULARY)
// ==========================================
class VocabManager {
    constructor() {
        this.vocabList = document.getElementById("vocabList");
        this.devMessage = document.getElementById("devMessage");
        if (this.vocabList) this.fetchData(1);
    }
    async fetchData(level) {
        try {
            // Lùi 1 cấp từ html ra ngoài, sau đó vào dataApp
            const res = await fetch(`../dataApp/hsk-${level}.json`);
            if (!res.ok) throw new Error("Chưa có data");
            const data = await res.json();
            this.render(data.terms);
        } catch (err) { this.showDevMessage(level); }
    }
    render(terms) {
        this.devMessage.style.display = "none";
        this.vocabList.style.display = "block";
        this.vocabList.innerHTML = terms.map(item => `
            <div class="word-card">
                <div class="hanzi">${item.word || item.simplified}</div>
                <div class="pinyin">${item.pinyin}</div>
                <div class="meaning">${item.meaning || item.english}</div>
            </div>`).join('');
    }
    showDevMessage(level) {
        this.vocabList.style.display = "none";
        this.devMessage.innerHTML = `🚧 Từ vựng HSK ${level} đang phát triển.`;
        this.devMessage.style.display = "block";
    }
    changeTab(level, element) {
        document.querySelectorAll(".hsk-tab").forEach(t => t.classList.remove("active-tab"));
        element.classList.add("active-tab");
        this.fetchData(level);
    }
}

function changeHSK(level, element) { app.vocab.changeTab(level, element); }