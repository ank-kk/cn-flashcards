let words = [];
let index = 0;
let showPinyin = true;

const CACHE_KEY = "chineseFlashcardsData";
const INDEX_KEY = "chineseFlashcardsIndex";
const HSK_KEY = "chineseFlashcardsHSK";
const PINYIN_KEY = "chineseFlashcardsPinyin";
const DARK_MODE_KEY = "flashcardDarkMode";

const el = (id) => document.getElementById(id);

const card = el("card");
const cardSlider = el("cardSlider");

// ========================================
// Cache
// ========================================

function saveCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(words));
    localStorage.setItem(INDEX_KEY, index.toString());
    localStorage.setItem(PINYIN_KEY, showPinyin ? "1" : "0");
}

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

    if (words.length > 0 && (index < 0 || index >= words.length)) {
        index = 0;
    }
}

// ========================================
// Render
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
    el("pinyin").textContent = showPinyin ? (word.Pinyin || "") : "";
    el("thai").textContent = word.Thai || "-";
    el("english").textContent = word.English || "";
    el("progress").textContent = `${index + 1} / ${words.length}`;

    card.classList.remove("flipped");

    saveCache();
}

// ========================================
// เปลี่ยนคำศัพท์แบบ 3D Swipe
// ========================================

function changeWord(direction) {
    if (!words.length || cardSlider.classList.contains("animating")) {
        return;
    }

    cardSlider.classList.add("animating");

    const width = cardSlider.offsetWidth;

    const exitX = direction === "left"
        ? -width * 1.2
        : width * 1.2;

    const exitRotate = direction === "left"
        ? -28
        : 28;

    cardSlider.style.transition =
        "transform 0.3s cubic-bezier(.4, 0, .2, 1), opacity 0.3s ease";

    cardSlider.style.transform =
        `translateX(${exitX}px) rotateY(${exitRotate}deg) rotateZ(${exitRotate / 3}deg)`;

    cardSlider.style.opacity = "0";

    setTimeout(() => {

        // ปัดซ้าย = ก่อนหน้า
        if (direction === "left") {
            index = (index - 1 + words.length) % words.length;
        } else {
            // ปัดขวา = ถัดไป
            index = (index + 1) % words.length;
        }

        render();

        // การ์ดใหม่เข้ามาจากฝั่งตรงข้าม
        const enterX = direction === "left"
            ? width * 1.2
            : -width * 1.2;

        const enterRotate = direction === "left"
            ? 28
            : -28;

        cardSlider.style.transition = "none";

        cardSlider.style.transform =
            `translateX(${enterX}px) rotateY(${enterRotate}deg) rotateZ(${enterRotate / 3}deg)`;

        cardSlider.style.opacity = "0";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {

                cardSlider.style.transition =
                    "transform 0.45s cubic-bezier(.16, 1, .3, 1), opacity 0.35s ease";

                cardSlider.style.transform =
                    "translateX(0) rotateY(0deg) rotateZ(0deg)";

                cardSlider.style.opacity = "1";

                setTimeout(() => {
                    cardSlider.style.transition = "";
                    cardSlider.style.transform = "";
                    cardSlider.style.opacity = "";
                    cardSlider.classList.remove("animating");
                }, 450);
            });
        });

    }, 300);
}

// ========================================
// Swipe Gesture
// ========================================

let startX = 0;
let startY = 0;
let isDragging = false;
let isHorizontalSwipe = false;
let currentPointerType = "";

const SWIPE_THRESHOLD = 70;
const DIRECTION_THRESHOLD = 8;

cardSlider.addEventListener("pointerdown", (event) => {

    if (!words.length || cardSlider.classList.contains("animating")) {
        return;
    }

    startX = event.clientX;
    startY = event.clientY;

    isDragging = true;
    isHorizontalSwipe = false;
    currentPointerType = event.pointerType;

    cardSlider.classList.add("dragging");

    // ใช้ Pointer Capture เพื่อให้มือถือยังติดตามนิ้ว
    // แม้นิ้วจะลากออกนอกพื้นที่การ์ด
    cardSlider.setPointerCapture(event.pointerId);
});

cardSlider.addEventListener("pointermove", (event) => {

    // ========================================
    // Desktop Hover
    // คงระบบเดิมไว้
    // ========================================

    if (
        !isDragging &&
        event.pointerType === "mouse" &&
        !cardSlider.classList.contains("animating")
    ) {

        const rect = cardSlider.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const percentX = mouseX / rect.width - 0.5;
        const percentY = mouseY / rect.height - 0.5;

        const rotateY = percentX * 10;
        const rotateX = percentY * -8;

        cardSlider.style.transform =
            `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        return;
    }

    // ========================================
    // Swipe
    // ========================================

    if (!isDragging) {
        return;
    }

    const diffX = event.clientX - startX;
    const diffY = event.clientY - startY;

    // ตรวจสอบทิศทางเมื่อเริ่มลาก
    if (!isHorizontalSwipe) {

        // ถ้ายังลากไม่ไกลพอ ให้รอตรวจสอบทิศทาง
        if (
            Math.abs(diffX) < DIRECTION_THRESHOLD &&
            Math.abs(diffY) < DIRECTION_THRESHOLD
        ) {
            return;
        }

        // ถ้าลากแนวตั้งมากกว่า ไม่ถือว่าเป็น Swipe การ์ด
        if (Math.abs(diffY) > Math.abs(diffX)) {
            return;
        }

        isHorizontalSwipe = true;
    }

    // ป้องกันการ Scroll ระหว่าง Swipe แนวนอนบนมือถือ
    if (event.pointerType === "touch") {
        event.preventDefault();
    }

    // จำกัดระยะการลากเล็กน้อย
    // ทำให้การ์ดยังตามนิ้ว แต่ไม่เคลื่อนเร็วเกินไป
    const dragX = diffX;

    // ใช้การหมุนแบบเดียวกับ Desktop
    const rotateY = Math.max(
        -20,
        Math.min(20, dragX / 10)
    );

    const rotateZ = Math.max(
        -8,
        Math.min(8, dragX / 30)
    );

    const opacity = Math.max(
        0.72,
        1 - Math.abs(dragX) / 900
    );

    // เพิ่มความรู้สึก 3D บนมือถือ
    // การ์ดจะยกขึ้นเล็กน้อยระหว่างลาก
    const translateY = event.pointerType === "touch"
        ? -2
        : 0;

    cardSlider.style.transform =
        `translateX(${dragX}px) translateY(${translateY}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;

    cardSlider.style.opacity = opacity;
}, { passive: false });

function finishSwipe(event) {

    if (!isDragging) {
        return;
    }

    const diffX = event.clientX - startX;
    const diffY = event.clientY - startY;

    const wasHorizontalSwipe = isHorizontalSwipe;

    isDragging = false;
    isHorizontalSwipe = false;

    cardSlider.classList.remove("dragging");

    try {
        cardSlider.releasePointerCapture(event.pointerId);
    } catch (error) {
        // ไม่จำเป็นต้องทำอะไร
    }

    // ========================================
    // ปัดสำเร็จ
    // ========================================

    if (
        wasHorizontalSwipe &&
        Math.abs(diffX) >= SWIPE_THRESHOLD &&
        Math.abs(diffX) > Math.abs(diffY)
    ) {

        const direction = diffX < 0
            ? "left"
            : "right";

        // Reset ก่อนเริ่ม Animation
        cardSlider.style.transition = "none";
        cardSlider.style.transform = "";
        cardSlider.style.opacity = "";

        changeWord(direction);

        return;
    }

    // ========================================
    // ปัดไม่ถึงระยะ → เด้งกลับ
    // ========================================

    if (wasHorizontalSwipe && Math.abs(diffX) > 10) {

        cardSlider.style.transition =
            "transform 0.4s cubic-bezier(.16, 1, .3, 1), opacity 0.3s ease";

        cardSlider.style.transform =
            "translateX(0) translateY(0) rotateY(0deg) rotateZ(0deg)";

        cardSlider.style.opacity = "1";

        setTimeout(() => {
            cardSlider.style.transition = "";
            cardSlider.style.transform = "";
            cardSlider.style.opacity = "";
        }, 400);

        return;
    }

    // ========================================
    // แตะหรือคลิก → พลิกการ์ด
    // ========================================

    // พลิกเฉพาะเมื่อแทบไม่ได้ลาก
    if (
        Math.abs(diffX) < 10 &&
        Math.abs(diffY) < 10
    ) {
        card.classList.toggle("flipped");
    }
}

cardSlider.addEventListener("pointerup", finishSwipe);

cardSlider.addEventListener("pointercancel", (event) => {

    if (!isDragging) {
        return;
    }

    isDragging = false;
    isHorizontalSwipe = false;

    cardSlider.classList.remove("dragging");

    cardSlider.style.transition =
        "transform 0.4s cubic-bezier(.16, 1, .3, 1), opacity 0.3s ease";

    cardSlider.style.transform =
        "translateX(0) translateY(0) rotateY(0deg) rotateZ(0deg)";

    cardSlider.style.opacity = "1";

    setTimeout(() => {
        cardSlider.style.transition = "";
        cardSlider.style.transform = "";
        cardSlider.style.opacity = "";
    }, 400);
});

// ========================================
// 3D Hover Effect - Mouse Leave
// ========================================

cardSlider.addEventListener("pointerleave", (event) => {

    // ไม่กระทบระบบลาก
    if (
        isDragging ||
        event.pointerType !== "mouse"
    ) {
        return;
    }

    cardSlider.style.transform =
        "translateY(0) rotateX(0deg) rotateY(0deg)";
});

// ========================================
// Pinyin
// ========================================

el("pinyinBtn").addEventListener("click", () => {

    showPinyin = !showPinyin;

    el("pinyinBtn").textContent = showPinyin
        ? "🔤 ซ่อนพินอิน"
        : "🔤 แสดงพินอิน";

    render();
});

// ========================================
// Dark Mode
// ========================================

function setDarkMode(enabled) {

    document.body.classList.toggle("dark", enabled);

    el("darkBtn").textContent = enabled
        ? "☀️ โหมดกลางวัน"
        : "🌙 โหมดกลางคืน";

    localStorage.setItem(
        DARK_MODE_KEY,
        enabled ? "1" : "0"
    );
}

el("darkBtn").addEventListener("click", () => {

    setDarkMode(
        !document.body.classList.contains("dark")
    );
});

// ========================================
// Shuffle
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
// Excel Functions
// ========================================

function getColumn(object, possibleNames) {

    const key = Object.keys(object).find(
        (columnName) =>
            possibleNames.includes(
                columnName.trim().toLowerCase()
            )
    );

    return key ? object[key] : "";
}

function parseExcelRows(rows) {

    return rows
        .map((row) => ({
            Chinese: getColumn(row, [
                "chinese", "จีน", "汉字", "汉语",
                "中文", "word", "คำศัพท์"
            ]),
            Pinyin: getColumn(row, [
                "pinyin", "พินอิน"
            ]),
            Thai: getColumn(row, [
                "thai", "ไทย", "ความหมายไทย"
            ]),
            English: getColumn(row, [
                "english", "อังกฤษ", "ความหมายอังกฤษ"
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

        const fileName = `data/${level}.xlsx`;

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
                XLSX.read(data, { type: "array" });

            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];

            const rows =
                XLSX.utils.sheet_to_json(
                    sheet,
                    { defval: "" }
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

loadCache();

if (localStorage.getItem(DARK_MODE_KEY) === "1") {
    setDarkMode(true);
}

el("pinyinBtn").textContent = showPinyin
    ? "🔤 ซ่อนพินอิน"
    : "🔤 แสดงพินอิน";

if (words.length > 0) {

    const savedHSK =
        localStorage.getItem(HSK_KEY);

    el("status").textContent = savedHSK
        ? `${savedHSK} : ${words.length}`
        : `คำศัพท์ล่าสุด : ${words.length}`;

} else {
    el("status").textContent =
        `${level} : ${words.length}`;
}

render();