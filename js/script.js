// ========================================
// Chinese Flashcards
// ========================================

let words = [];
let index = 0;
let showPinyin = true;

// ========================================
// Cache Keys
// ========================================

const CACHE_KEY = "chineseFlashcardsData";
const INDEX_KEY = "chineseFlashcardsIndex";
const HSK_KEY = "chineseFlashcardsHSK";
const PINYIN_KEY = "chineseFlashcardsPinyin";
const DARK_MODE_KEY = "flashcardDarkMode";

// ========================================
// เรียก HTML Element
// ========================================

const el = (id) => document.getElementById(id);

// ========================================
// บันทึก Cache
// ========================================

function saveCache() {
    localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(words)
    );

    localStorage.setItem(
        INDEX_KEY,
        index.toString()
    );

    localStorage.setItem(
        PINYIN_KEY,
        showPinyin ? "1" : "0"
    );
}

// ========================================
// โหลด Cache
// ========================================

function loadCache() {
    const cachedWords = localStorage.getItem(CACHE_KEY);
    const cachedIndex = localStorage.getItem(INDEX_KEY);
    const cachedPinyin = localStorage.getItem(PINYIN_KEY);
    const cachedHSK = localStorage.getItem(HSK_KEY);

    if (cachedWords) {
        try {
            const parsedWords = JSON.parse(cachedWords);

            if (Array.isArray(parsedWords)) {
                words = parsedWords;
            }
        } catch (error) {
            console.error("ไม่สามารถโหลด Cache ได้", error);
        }
    }

    if (cachedIndex !== null) {
        const savedIndex = Number(cachedIndex);

        if (!Number.isNaN(savedIndex)) {
            index = savedIndex;
        }
    }

    if (cachedPinyin !== null) {
        showPinyin = cachedPinyin === "1";
    }

    if (cachedHSK) {
        el("hskSelect").value = cachedHSK;
    }

    if (
        words.length > 0 &&
        (index < 0 || index >= words.length)
    ) {
        index = 0;
    }
}

// ========================================
// แสดง Flashcard
// ========================================

function render() {
    if (!words.length) {
        el("word").textContent = "เลือก HSK";
        el("pinyin").textContent = "";
        el("thai").textContent = "";
        el("english").textContent = "";
        el("progress").textContent = "0 / 0";
        return;
    }

    const word = words[index];

    el("word").textContent = word.Chinese || "-";

    el("pinyin").textContent =
        showPinyin ? (word.Pinyin || "") : "";

    el("thai").textContent = word.Thai || "-";

    el("english").textContent = word.English || "";

    el("progress").textContent =
        `${index + 1} / ${words.length}`;

    // กลับไปด้านหน้าทุกครั้งที่เปลี่ยนคำศัพท์
    el("card").classList.remove("flipped");

    saveCache();
}

// ========================================
// พลิก Flashcard
// ========================================

el("card").addEventListener("click", () => {
    if (!words.length) return;

    el("card").classList.toggle("flipped");
});

// ========================================
// คำศัพท์ถัดไป
// ========================================

el("next").addEventListener("click", () => {
    if (!words.length) return;

    index = (index + 1) % words.length;

    render();
});

// ========================================
// คำศัพท์ก่อนหน้า
// ========================================

el("prev").addEventListener("click", () => {
    if (!words.length) return;

    index =
        (index - 1 + words.length) % words.length;

    render();
});

// ========================================
// เปิด / ปิด Pinyin
// ========================================

el("pinyinBtn").addEventListener("click", () => {
    showPinyin = !showPinyin;

    el("pinyinBtn").textContent =
        showPinyin
            ? "🔤 ซ่อนพินอิน"
            : "🔤 แสดงพินอิน";

    render();
});

// ========================================
// Dark Mode
// ========================================

function setDarkMode(enabled) {
    document.body.classList.toggle(
        "dark",
        enabled
    );

    el("darkBtn").textContent =
        enabled
            ? "☀️ โหมดกลางวัน"
            : "🌙 โหมดกลางคืน";

    localStorage.setItem(
        DARK_MODE_KEY,
        enabled ? "1" : "0"
    );
}

el("darkBtn").addEventListener("click", () => {
    const isDark =
        !document.body.classList.contains("dark");

    setDarkMode(isDark);
});

// ========================================
// สุ่มคำศัพท์
// ========================================

el("shuffleBtn").addEventListener("click", () => {
    if (!words.length) return;

    words = [...words].sort(
        () => Math.random() - 0.5
    );

    index = 0;

    render();

    el("status").textContent =
        `🔀 สุ่มคำศัพท์แล้ว ${words.length} คำ`;
});

// ========================================
// อ่านคอลัมน์จาก Excel
// ========================================

function getColumn(object, possibleNames) {
    const key = Object.keys(object).find(
        (columnName) =>
            possibleNames.includes(
                columnName
                    .trim()
                    .toLowerCase()
            )
    );

    return key ? object[key] : "";
}

// ========================================
// แปลงข้อมูล Excel
// ========================================

function parseExcelRows(rows) {
    return rows
        .map((row) => ({
            Chinese: getColumn(row, [
                "chinese",
                "จีน",
                "汉字",
                "汉语",
                "中文",
                "word",
                "คำศัพท์"
            ]),

            Pinyin: getColumn(row, [
                "pinyin",
                "พินอิน"
            ]),

            Thai: getColumn(row, [
                "thai",
                "ไทย",
                "ความหมายไทย"
            ]),

            English: getColumn(row, [
                "english",
                "อังกฤษ",
                "ความหมายอังกฤษ"
            ])
        }))
        .filter((word) => word.Chinese);
}

// ========================================
// โหลดไฟล์ HSK
// ========================================

el("hskSelect").addEventListener(
    "change",
    async (event) => {

        const level = event.target.value;

        if (!level) return;

        const fileName =
            `data/${level}.xlsx`;

        try {
            el("status").textContent =
                `⏳ กำลังโหลด ${level}...`;

            const response =
                await fetch(fileName);

            if (!response.ok) {
                throw new Error("ไม่พบไฟล์");
            }

            const data =
                await response.arrayBuffer();

            const workbook =
                XLSX.read(data, {
                    type: "array"
                });

            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];

            const rows =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: ""
                    }
                );

            const parsedWords =
                parseExcelRows(rows);

            if (!parsedWords.length) {
                throw new Error(
                    "ไม่พบคำศัพท์ในไฟล์"
                );
            }

            words = parsedWords;
            index = 0;

            // จำระดับ HSK
            localStorage.setItem(
                HSK_KEY,
                level
            );

            render();

            el("status").textContent =
                `📚 ${level}: โหลดสำเร็จ ${words.length} คำศัพท์`;

        } catch (error) {
            console.error(error);

            el("status").textContent =
                `❌ ไม่สามารถโหลดไฟล์ ${fileName} ได้`;
        }
    }
);

// ========================================
// เริ่มต้นเว็บไซต์
// ========================================

// โหลด Cache
loadCache();

// โหลด Dark Mode
if (
    localStorage.getItem(DARK_MODE_KEY) === "1"
) {
    setDarkMode(true);
}

// แสดงสถานะปุ่ม Pinyin
el("pinyinBtn").textContent =
    showPinyin
        ? "🔤 ซ่อนพินอิน"
        : "🔤 แสดงพินอิน";

// แสดงสถานะล่าสุด
if (words.length > 0) {
    const savedHSK =
        localStorage.getItem(HSK_KEY);

    if (savedHSK) {
        el("status").textContent =
            `📌 กำลังเรียน ${savedHSK}: ${words.length} คำศัพท์`;
    } else {
        el("status").textContent =
            `📌 โหลดคำศัพท์ล่าสุด ${words.length} คำ`;
    }
} else {
    el("status").textContent =
        "เลือกระดับ HSK เพื่อเริ่มเรียน";
}

// แสดง Flashcard
render();