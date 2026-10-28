const YEARS = [1, 2, 3, 4];
const QUARTERS = [1, 2, 3, 4];
const DAYS = ['月', '火', '水', '木', '金'];
const PERIODS = [1, 2, 3, 4, 5, '放課後'];
const DEFAULT_TIMES = [
    { start: '8:50', end: '10:20' },
    { start: '10:40', end: '12:10' },
    { start: '13:20', end: '14:50' },
    { start: '15:10', end: '16:40' },
    { start: '17:00', end: '18:30' },
    { start: '17:30', end: '20:30' }
];
const FIELDS = ['subject', 'room', 'teacher'];

// 区分は学生便覧(機械工学科 令和8年度入学者)の卒業要件に合わせる
// 必修◎・選択必修○△・選択 は「機械工学科専門科目」
const CATEGORIES = {
    '専門': ['共通専門基礎(必修)', '共通専門基礎(選択)', '専門基礎', '必修◎', '選択必修○', '選択必修△', '選択'],
    '教養': ['基盤系', '人文系', '社会系', '自然系', '総合系', '外国語第Ⅰ', '外国語第Ⅱ', '健康・スポーツ', '外国語中級(選択)', '卒業要件外'],
    '予定': ['部活', 'アルバイト', 'その他']   // 授業以外の予定(単位には数えない)
};
const EXTRA_DAY = '時間外';   // オンデマンドなど曜日・時限のない授業
// 分類ごとの色(style.css の .cat-xxx)
const CATEGORY_CLASS = {
    '共通専門基礎(必修)': 'cat-common',
    '共通専門基礎(選択)': 'cat-common',
    '専門基礎': 'cat-common',
    '必修◎': 'cat-required',
    '選択必修○': 'cat-elective',
    '選択必修△': 'cat-elective',
    '選択': 'cat-other',
    '基盤系': 'cat-liberal',
    '人文系': 'cat-liberal',
    '社会系': 'cat-liberal',
    '自然系': 'cat-liberal',
    '総合系': 'cat-general',
    '外国語第Ⅰ': 'cat-language',
    '外国語第Ⅱ': 'cat-language',
    '外国語中級(選択)': 'cat-language',
    '健康・スポーツ': 'cat-liberal',
    '卒業要件外': 'cat-none'
};
const LEGEND = [
    ['共通専門基礎・専門基礎', 'cat-common'], ['必修◎', 'cat-required'], ['選択必修○△', 'cat-elective'],
    ['選択', 'cat-other'], ['教養', 'cat-liberal'], ['総合系', 'cat-general'], ['外国語', 'cat-language'], ['予定', 'cat-plan']
];
// 卒業研究に着手するために全部取る必要がある「実験・実習・演習」区分の必修科目
const LAB_REQUIRED = ['機械製図Ⅰ', '機械製図Ⅱ', '機械工学実習Ⅰ', '機械工学実習Ⅱ', 'プログラミング演習Ⅰ',
    'プログラミング演習Ⅱ', 'プログラミング演習Ⅲ', '機械工学実験', '機械設計製作演習Ⅰ', '機械設計製作演習Ⅱ'];

// seed.js の時間割を空いているコマにだけ入れる(一度だけ)
function applySeed() {
    if (localStorage.getItem('seededKikai2026')) return;
    SEED_CELLS.forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        const current = localStorage.getItem(prefix + 'subject');
        if (current && current.trim()) return;
        localStorage.setItem(prefix + 'subject', cell.subject);
        localStorage.setItem(prefix + 'room', cell.room);
        localStorage.setItem(prefix + 'teacher', cell.teacher);
    });
    const saved = localStorage.getItem('subjects');
    const subjects = saved ? JSON.parse(saved) : {};
    Object.keys(SEED_SUBJECTS).forEach((name) => {
        if (!subjects[name]) subjects[name] = SEED_SUBJECTS[name];
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('seededKikai2026', '1');
}
applySeed();

// 科目名の比較用(空白・全角英数字の違いを無視する)
function normalizeName(name) {
    return name.replace(/\s/g, '')
        .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}
function looksLikeRoom(text) {
    return /[0-9０-９]/.test(text);
}

// 保存済みのデータを直す(一度だけ)
// ・教員欄に入っている教室(K401など)を教室欄へ移す
// ・「線形代数」「線形代数１」などを seed.js の「線形代数3」のような名前にそろえる
// ・空いているコマに追加分(フランス語など)を入れ、空の教員・教室を埋める
function migrateV2() {
    if (localStorage.getItem('migratedV2')) return;
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith('cell-') || !key.endsWith('-teacher')) continue;
        const prefix = key.slice(0, -'teacher'.length);
        const teacher = (localStorage.getItem(key) || '').trim();
        const room = (localStorage.getItem(prefix + 'room') || '').trim();
        if (teacher && looksLikeRoom(teacher) && !looksLikeRoom(room)) {
            localStorage.setItem(prefix + 'room', teacher);
            localStorage.setItem(key, room);
        }
    }

    SEED_CELLS.forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        const current = (localStorage.getItem(prefix + 'subject') || '').trim();
        const seedName = normalizeName(cell.subject);
        const currentName = normalizeName(current);
        const sameSubject = currentName === seedName || currentName === seedName.replace(/[0-9]+$/, '');
        if (current && !sameSubject) return;
        if (current && current !== cell.subject) {
            if (!subjects[cell.subject] && subjects[current]) subjects[cell.subject] = subjects[current];
        }
        localStorage.setItem(prefix + 'subject', cell.subject);
        if (!(localStorage.getItem(prefix + 'room') || '').trim()) localStorage.setItem(prefix + 'room', cell.room);
        if (!(localStorage.getItem(prefix + 'teacher') || '').trim()) localStorage.setItem(prefix + 'teacher', cell.teacher);
    });

    // 使われなくなった古い科目名(全角数字など)の区分を消し、新しい名前の区分を入れる
    Object.keys(subjects).forEach((name) => {
        const fixed = normalizeName(name);
        if (fixed !== name && SEED_SUBJECTS[fixed]) delete subjects[name];
    });
    Object.keys(SEED_SUBJECTS).forEach((name) => {
        if (!subjects[name]) subjects[name] = SEED_SUBJECTS[name];
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV2', '1');
}
migrateV2();

// 時間外の授業は cell-{学年}-{Q}-時間外-{番号}-{項目} に保存する
function extraEntries(year, quarter) {
    const prefix = `cell-${year}-${quarter}-${EXTRA_DAY}-`;
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith(prefix) || !key.endsWith('-subject')) continue;
        const subject = (localStorage.getItem(key) || '').trim();
        if (subject) entries.push({ period: Number(key.slice(prefix.length, -'-subject'.length)), subject });
    }
    return entries.sort((a, b) => a.period - b.period);
}
function nextExtraPeriod(year, quarter) {
    const entries = extraEntries(year, quarter);
    return entries.length ? entries[entries.length - 1].period + 1 : 1;
}

// 保存済みのデータを直す(一度だけ)
// ・1年の物理学概論Ⅰ(機械工学科の時間割表から入れたもの)は履修しないので消す
// ・時間外にオンデマンドの Academic English を入れる
function migrateV3() {
    if (localStorage.getItem('migratedV3')) return;
    QUARTERS.forEach((quarter) => {
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                if (localStorage.getItem(prefix + 'subject') === '物理学概論Ⅰ'
                    && localStorage.getItem(prefix + 'teacher') === '田中（克）') {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    SEED_CELLS.filter((cell) => cell.day === EXTRA_DAY).forEach((cell) => {
        if (extraEntries(cell.year, cell.quarter).some((e) => e.subject === cell.subject)) return;
        const prefix = `cell-${cell.year}-${cell.quarter}-${EXTRA_DAY}-${nextExtraPeriod(cell.year, cell.quarter)}-`;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    Object.keys(SEED_SUBJECTS).forEach((name) => {
        if (!subjects[name]) subjects[name] = SEED_SUBJECTS[name];
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV3', '1');
}
migrateV3();

// 1年の月曜・木曜の放課後に起業部を入れる(空いているコマのみ・一度だけ)
function migrateV4() {
    if (localStorage.getItem('migratedV4')) return;
    SEED_CELLS.filter((cell) => cell.subject === '起業部').forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        if ((localStorage.getItem(prefix + 'subject') || '').trim()) return;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    if (!subjects['起業部']) subjects['起業部'] = SEED_SUBJECTS['起業部'];
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV4', '1');
}
migrateV4();

// 物理学概論Ⅰは1年2Qの月曜・水曜2限に戻し、1年のそれ以外の物理学概論は消す(一度だけ)
function migrateV5() {
    if (localStorage.getItem('migratedV5')) return;
    const isPhysics = (name) => normalizeName(name || '').startsWith('物理学概論');
    const keep = SEED_CELLS.filter((cell) => cell.year === 1 && cell.subject === '物理学概論Ⅰ');
    QUARTERS.forEach((quarter) => {
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                const kept = keep.some((c) => c.quarter === quarter && c.day === day && c.period === period);
                if (!kept && isPhysics(localStorage.getItem(prefix + 'subject'))) {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    keep.forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        const current = (localStorage.getItem(prefix + 'subject') || '').trim();
        if (current && !isPhysics(current)) return;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    if (!subjects['物理学概論Ⅰ']) subjects['物理学概論Ⅰ'] = SEED_SUBJECTS['物理学概論Ⅰ'];
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV5', '1');
}
migrateV5();

// 1年2Q・3Qを公式の時間割で書き直す(一度だけ)
// ・seed.js にあるコマは科目・教員・教室・区分をすべて公式の内容にする
// ・それ以外のコマに入っている時間割表の科目(入れる場所を間違えたもの)は消す
// ・時間割表にない科目(自分で選んだ教養科目など)と予定はそのまま残す
function migrateV6() {
    if (localStorage.getItem('migratedV6')) return;
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    const baseName = (name) => normalizeName(name).replace(/[0-9ⅠⅡⅢⅣ]+$/, '');
    const knownBases = Object.keys(SEED_SUBJECTS).map(baseName);
    const isKnown = (name) => {
        const base = baseName(name);
        return knownBases.some((known) => known === base
            || (base.length >= 4 && (known.startsWith(base) || base.startsWith(known))));
    };
    [2, 3].forEach((quarter) => {
        const official = SEED_CELLS.filter((c) => c.year === 1 && c.quarter === quarter && c.day !== EXTRA_DAY);
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                const cell = official.find((c) => c.day === day && c.period === period);
                if (cell) {
                    FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
                    subjects[cell.subject] = SEED_SUBJECTS[cell.subject];
                    return;
                }
                const current = (localStorage.getItem(prefix + 'subject') || '').trim();
                const info = subjects[current];
                if (current && isKnown(current) && !(info && info.major === '予定')) {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV6', '1');
}
migrateV6();

// 1年1Qの金曜5限にアントレプレナーシップ入門を入れる(一度だけ)
function migrateV7() {
    if (localStorage.getItem('migratedV7')) return;
    const cell = SEED_CELLS.find((c) => c.subject === 'アントレプレナーシップ入門');
    if (!cell) return;   // 古い seed.js が読み込まれたときは次回に回す
    const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
    FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    subjects[cell.subject] = SEED_SUBJECTS[cell.subject];
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV7', '1');
}
migrateV7();

// 区分を学生便覧の卒業要件に合わせた新しい区分に置き換える(一度だけ)
// 時間割表の科目は seed.js の区分に、それ以外は古い区分から近いものに移す。落単の印は残す
function migrateV8() {
    if (localStorage.getItem('migratedV8')) return;
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    const OLD_TO_NEW = { '共通専門': '共通専門基礎(選択)', '必修': '必修◎', '選択必修': '選択', 'その他': '選択', '人文社会': '人文系' };
    Object.keys(subjects).forEach((name) => {
        const info = subjects[name];
        if (SEED_SUBJECTS[name]) {
            subjects[name] = { ...SEED_SUBJECTS[name], failed: info.failed };
        } else if (info.major === '教養' && info.minor === '外国語') {
            info.minor = /English|英語/.test(name) ? '外国語第Ⅰ' : '外国語第Ⅱ';
        } else if (info.major !== '予定' && OLD_TO_NEW[info.minor]) {
            info.minor = OLD_TO_NEW[info.minor];
        }
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV8', '1');
}
migrateV8();

// 1年の Academic English を入れ直す(一度だけ)
// 1Qは対面(55クラス)、2Q〜4Qはオンデマンド(遠隔クラス)。以前の入れ間違い(3QにA1など)は消す
function migrateV9() {
    if (localStorage.getItem('migratedV9')) return;
    const official = SEED_CELLS.filter((c) => c.year === 1 && c.subject.startsWith('Academic English'));
    if (!official.length) return;   // 古い seed.js が読み込まれたときは次回に回す
    QUARTERS.forEach((quarter) => {
        [...DAYS, EXTRA_DAY].forEach((day) => {
            const periods = day === EXTRA_DAY ? extraEntries(1, quarter).map((e) => e.period) : PERIODS;
            periods.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                if ((localStorage.getItem(prefix + 'subject') || '').startsWith('Academic English')) {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    official.forEach((cell) => {
        const period = cell.day === EXTRA_DAY ? nextExtraPeriod(1, cell.quarter) : cell.period;
        const prefix = `cell-1-${cell.quarter}-${cell.day}-${period}-`;
        if ((localStorage.getItem(prefix + 'subject') || '').trim()) return;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    Object.keys(SEED_SUBJECTS).filter((n) => n.startsWith('Academic English')).forEach((name) => {
        subjects[name] = { ...SEED_SUBJECTS[name], failed: subjects[name] && subjects[name].failed };
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV9', '1');
}
migrateV9();

// 1年4Qの教養科目を履修登録どおりに入れ、線形代数3・4は1年から外して2年の再履修クラスへ移す(一度だけ)
function migrateV10() {
    if (localStorage.getItem('migratedV10')) return;
    const added = SEED_CELLS.filter((c) => ['政治学B', '西洋史B', '言語科学B'].includes(c.subject)
        || (c.year === 2 && ['線形代数3', '線形代数4'].includes(c.subject)));
    if (added.length < 5) return;   // 古い seed.js が読み込まれたときは次回に回す
    [[3, '線形代数3'], [4, '線形代数4']].forEach(([quarter, name]) => {
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                if (normalizeName(localStorage.getItem(prefix + 'subject') || '') === name) {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    added.forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        const current = (localStorage.getItem(prefix + 'subject') || '').trim();
        // 2年の再履修は空きコマにだけ入れる。1年4Qの教養は履修登録の内容なので上書きする
        if (cell.year === 2 && current && current !== cell.subject) return;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    ['政治学B', '西洋史B', '言語科学B'].forEach((name) => {
        subjects[name] = { ...SEED_SUBJECTS[name], failed: subjects[name] && subjects[name].failed };
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV10', '1');
}
migrateV10();

// 物理学実験は履修していないので1年から消す(一度だけ)
function migrateV11() {
    if (localStorage.getItem('migratedV11')) return;
    QUARTERS.forEach((quarter) => {
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-1-${quarter}-${day}-${period}-`;
                if (normalizeName(localStorage.getItem(prefix + 'subject') || '') === '物理学実験') {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
    });
    localStorage.setItem('migratedV11', '1');
}
migrateV11();

// 1年1Qに取った教養科目(基盤系)4科目を入れる(一度だけ)
function migrateV12() {
    if (localStorage.getItem('migratedV12')) return;
    const kiban = SEED_CELLS.filter((c) => SEED_SUBJECTS[c.subject] && SEED_SUBJECTS[c.subject].minor === '基盤系');
    if (kiban.length < 4) return;   // 古い seed.js が読み込まれたときは次回に回す
    kiban.forEach((cell) => {
        if (cell.day === EXTRA_DAY) {
            if (extraEntries(cell.year, cell.quarter).some((e) => e.subject === cell.subject)) return;
            const prefix = `cell-${cell.year}-${cell.quarter}-${EXTRA_DAY}-${nextExtraPeriod(cell.year, cell.quarter)}-`;
            FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
            return;
        }
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        const current = (localStorage.getItem(prefix + 'subject') || '').trim();
        if (current && current !== cell.subject) return;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    kiban.forEach((cell) => {
        subjects[cell.subject] = { ...SEED_SUBJECTS[cell.subject], failed: subjects[cell.subject] && subjects[cell.subject].failed };
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV12', '1');
}
migrateV12();

// 授業のあるクォーターが決まっている科目が、別のクォーターに入っていないか調べる
// 時間割表(seed.js)にある科目はそのクォーター、番号付きの語学・数学は番号から決まるクォーターと比べる
// 再履修クラスは別のクォーターにあるので、番号から決まるクォーターと時間割表のクォーターの両方を認める
function expectedQuarters(name) {
    const expected = new Set(SEED_CELLS.filter((c) => c.subject === name).map((c) => c.quarter));
    const english = name.match(/^Academic English (Communication|Literacy) ([AB])([12])$/);
    if (english) expected.add((english[2] === 'A' ? 0 : 2) + Number(english[3]));
    const numbered = name.match(/^(微分積分|線形代数|フランス語初級[AB])([1-4])$/);
    if (numbered) expected.add(Number(numbered[2]));
    return expected.size ? expected : null;
}
function quarterWarning(name, quarter) {
    const subject = normalizeName(name);
    if (/^AcademicEnglish/.test(subject) && !/^AcademicEnglish(Communication|Literacy)[AB][12]$/.test(subject)) {
        return 'Academic English は A1(1Q)・A2(2Q)・B1(3Q)・B2(4Q) の4つだけです';
    }
    const expected = expectedQuarters(name);
    if (!expected || expected.has(quarter)) return '';
    return `この科目は ${[...expected].sort().map((q) => `${q}Q`).join('・')} の授業です`;
}
function findQuarterMistakes() {
    const mistakes = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const m = key.match(/^cell-(\d)-(\d)-(.+)-(.+)-subject$/);
        if (!m) continue;
        const name = (localStorage.getItem(key) || '').trim();
        if (!name || (subjects[name] && subjects[name].major === '予定')) continue;
        const warning = quarterWarning(name, Number(m[2]));
        if (warning) mistakes.push(`${m[1]}年${m[2]}Q ${m[3]}${m[3] === EXTRA_DAY ? '' : '曜'}：${name}（${warning}）`);
    }
    return mistakes;
}

function loadSubjects() {
    const saved = localStorage.getItem('subjects');
    return saved ? JSON.parse(saved) : {};
}
function saveSubjects(subjects) {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}
const subjects = loadSubjects();

function cellKey(year, quarter, day, period, field) {
    return `cell-${year}-${quarter}-${day}-${period}-${field}`;
}
function readCell(year, quarter, day, period) {
    const cell = {};
    FIELDS.forEach((field) => {
        cell[field] = (localStorage.getItem(cellKey(year, quarter, day, period, field)) || '').trim();
    });
    return cell;
}

// 表示中の学年・クォーター(前回の表示を覚えておく)
function guessQuarter() {
    const month = new Date().getMonth() + 1;
    if (month >= 4 && month <= 5) return 1;
    if (month >= 6 && month <= 9) return 2;
    if (month >= 10 && month <= 11) return 3;
    return 4;
}
function loadView() {
    const saved = localStorage.getItem('view');
    if (saved) return JSON.parse(saved);
    return { year: 1, quarter: guessQuarter() };
}
const view = loadView();
function setView(year, quarter) {
    view.year = year;
    view.quarter = quarter;
    localStorage.setItem('view', JSON.stringify(view));
    renderTabs();
    renderTimetable();
}

function renderTabs() {
    const yearTabs = document.getElementById('year-tabs');
    yearTabs.innerHTML = '';
    YEARS.forEach((year) => {
        yearTabs.appendChild(makeTab(`${year}年`, year === view.year, () => setView(year, view.quarter)));
    });
    const quarterTabs = document.getElementById('quarter-tabs');
    quarterTabs.innerHTML = '';
    QUARTERS.forEach((quarter) => {
        quarterTabs.appendChild(makeTab(`${quarter}Q`, quarter === view.quarter, () => setView(view.year, quarter)));
    });
}
function makeTab(label, active, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = active ? 'tab active' : 'tab';
    btn.addEventListener('click', onClick);
    return btn;
}

function isFailed(name) {
    return Boolean(subjects[name] && subjects[name].failed);
}
// 落単は人に見られたくないので、トグルをオンにしたときだけ表示する(初期値はオフ)
function showFailed() {
    return localStorage.getItem('showFailed') === '1';
}
function isFailedShown(name) {
    return showFailed() && isFailed(name);
}

function categoryClass(name) {
    const info = subjects[name];
    if (!info) return 'cat-none';
    if (info.major === '予定') return 'cat-plan';
    return CATEGORY_CLASS[info.minor] || 'cat-other';
}

function buildCell(year, quarter, day, period) {
    const td = document.createElement('td');
    const cell = readCell(year, quarter, day, period);
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('aria-label', `${day}曜${period}${typeof period === 'number' ? '限' : ''} ${cell.subject || '空き'}`);
    if (cell.subject) {
        btn.classList.add(categoryClass(cell.subject));
        if (isFailedShown(cell.subject)) btn.classList.add('failed');
        const name = document.createElement('span');
        name.className = 'cell-subject';
        // 「線形代数3」の数字だけが次の行に送られないよう、末尾の番号は直前の1文字とくっつける
        const match = cell.subject.match(/^(.*?)(.[0-9A-Za-zⅠⅡⅢⅣ]+)$/);
        if (match) {
            name.appendChild(document.createTextNode(match[1]));
            const tail = document.createElement('span');
            tail.className = 'nowrap';
            tail.textContent = match[2];
            name.appendChild(tail);
        } else {
            name.textContent = cell.subject;
        }
        btn.appendChild(name);
        if (cell.room) {
            const room = document.createElement('span');
            room.className = 'cell-room';
            room.textContent = cell.room;
            btn.appendChild(room);
        }
    } else {
        btn.classList.add('empty');
    }
    btn.addEventListener('click', () => openCellDialog(year, quarter, day, period));
    td.appendChild(btn);
    return td;
}

function renderTimetable() {
    const table = document.getElementById('timetable');
    table.innerHTML = '';
    const today = DAYS[new Date().getDay() - 1];

    // 見出し行(曜日)
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    DAYS.forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
        if (day === today) th.className = 'today';
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 時限ごとの行(時刻も一緒に表示)
    PERIODS.forEach((period, index) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.className = 'period';
        const label = document.createElement('span');
        label.className = 'period-label';
        label.textContent = typeof period === 'number' ? period : '放課後';
        const time = document.createElement('span');
        time.className = 'period-time';
        time.textContent = `${DEFAULT_TIMES[index].start}\n${DEFAULT_TIMES[index].end}`;
        th.appendChild(label);
        th.appendChild(time);
        tr.appendChild(th);

        DAYS.forEach((day) => {
            const td = buildCell(view.year, view.quarter, day, period);
            if (day === today) td.classList.add('today');
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    renderExtra();
}

function renderExtra() {
    const list = document.getElementById('extra-list');
    list.innerHTML = '';
    extraEntries(view.year, view.quarter).forEach((entry) => {
        const cell = readCell(view.year, view.quarter, EXTRA_DAY, entry.period);
        const btn = document.createElement('button');
        btn.className = `extra-item ${categoryClass(cell.subject)}${isFailedShown(cell.subject) ? ' failed' : ''}`;
        const name = document.createElement('span');
        name.className = 'extra-subject';
        name.textContent = cell.subject;
        const sub = document.createElement('span');
        sub.className = 'extra-sub';
        sub.textContent = [cell.teacher, cell.room].filter((s) => s).join(' ・ ');
        btn.appendChild(name);
        btn.appendChild(sub);
        btn.addEventListener('click', () => openCellDialog(view.year, view.quarter, EXTRA_DAY, entry.period));
        list.appendChild(btn);
    });
}
document.getElementById('extra-add').addEventListener('click', () => {
    openCellDialog(view.year, view.quarter, EXTRA_DAY, nextExtraPeriod(view.year, view.quarter));
});

// 編集ダイアログ
const dialog = document.getElementById('cell-dialog');
const subjectInput = document.getElementById('dialog-subject');
const roomInput = document.getElementById('dialog-room');
const teacherInput = document.getElementById('dialog-teacher');
const majorSelect = document.getElementById('dialog-major');
const minorSelect = document.getElementById('dialog-minor');
const creditsInput = document.getElementById('dialog-credits');
const allQuartersInput = document.getElementById('dialog-all-quarters');
const failedInput = document.getElementById('dialog-failed');
let editing = null;   // いま編集中のコマ { year, quarter, day, period }

// 予定は単位を数えないので単位欄と落単の欄を隠す
function updateCreditsVisibility() {
    const isPlan = majorSelect.value === '予定';
    document.getElementById('dialog-credits-label').hidden = isPlan;
    document.getElementById('dialog-failed-label').hidden = isPlan;
    document.getElementById('dialog-note').textContent = isPlan
        ? '予定は単位の合計には入りません'
        : '区分と単位は同じ科目名のコマすべてに反映されます';
}

function fillOptions(select, items) {
    select.innerHTML = '';
    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });
}
fillOptions(majorSelect, Object.keys(CATEGORIES));
majorSelect.addEventListener('change', () => {
    fillOptions(minorSelect, CATEGORIES[majorSelect.value]);
    updateCreditsVisibility();
});

function showSubjectInfo(name, defaults) {
    const info = subjects[name] || defaults || { major: '専門', minor: '選択', credits: 1 };
    majorSelect.value = info.major;
    fillOptions(minorSelect, CATEGORIES[info.major]);
    minorSelect.value = info.minor;
    creditsInput.value = info.credits;
    failedInput.checked = Boolean(info.failed);
    updateCreditsVisibility();
}
// 登録済みの科目名を選んだら区分・単位も合わせる
subjectInput.addEventListener('change', () => {
    const name = subjectInput.value.trim();
    if (subjects[name]) showSubjectInfo(name);
});
// 入力中の科目が別のクォーターの授業なら、その場で注意を出す
function updateQuarterWarning() {
    const warning = document.getElementById('dialog-warning');
    const name = subjectInput.value.trim();
    const text = name && editing ? quarterWarning(name, editing.quarter) : '';
    warning.textContent = text ? `⚠ ${text}` : '';
    warning.hidden = !text;
}
subjectInput.addEventListener('input', updateQuarterWarning);

function fillSubjectList() {
    const list = document.getElementById('subject-list');
    list.innerHTML = '';
    collectSubjectNames().forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        list.appendChild(option);
    });
}

function openCellDialog(year, quarter, day, period) {
    editing = { year, quarter, day, period };
    const cell = readCell(year, quarter, day, period);
    const isExtra = day === EXTRA_DAY;
    const periodLabel = typeof period === 'number' ? `${period}限` : period;
    document.getElementById('dialog-slot').textContent = isExtra
        ? `${year}年 ${quarter}Q ・ 時間外`
        : `${year}年 ${quarter}Q ・ ${day}曜 ${periodLabel}`;
    subjectInput.value = cell.subject;
    roomInput.value = cell.room;
    teacherInput.value = cell.teacher;
    // 放課後の空きコマは部活などの予定を入れることが多いので、予定を初期値にする
    const defaults = period === '放課後' ? { major: '予定', minor: '部活', credits: 0 } : null;
    showSubjectInfo(cell.subject, defaults);
    allQuartersInput.checked = false;
    document.getElementById('dialog-all-quarters-label').hidden = isExtra;
    fillSubjectList();
    updateQuarterWarning();
    dialog.showModal();
}

function saveCell(year, quarter, day, period, values) {
    FIELDS.forEach((field) => {
        localStorage.setItem(cellKey(year, quarter, day, period, field), values[field].trim());
    });
}

document.getElementById('cell-form').addEventListener('submit', () => {
    const { year, quarter, day, period } = editing;
    const values = { subject: subjectInput.value, room: roomInput.value, teacher: teacherInput.value };
    saveCell(year, quarter, day, period, values);
    // 同じ学年の他のクォーターの、同じ曜日・時限の空きコマにも入れる
    if (allQuartersInput.checked && day !== EXTRA_DAY) {
        QUARTERS.forEach((q) => {
            if (q !== quarter && !readCell(year, q, day, period).subject) saveCell(year, q, day, period, values);
        });
    }
    const name = values.subject.trim();
    if (name) {
        const isPlan = majorSelect.value === '予定';
        subjects[name] = {
            major: majorSelect.value,
            minor: minorSelect.value,
            credits: isPlan ? 0 : Number(creditsInput.value),
            failed: !isPlan && failedInput.checked
        };
        saveSubjects(subjects);
    }
    refresh();
});
document.getElementById('dialog-clear').addEventListener('click', () => {
    const { year, quarter, day, period } = editing;
    FIELDS.forEach((field) => {
        localStorage.removeItem(cellKey(year, quarter, day, period, field));
    });
    dialog.close();
    refresh();
});
document.getElementById('dialog-cancel').addEventListener('click', () => {
    dialog.close();
});
// ダイアログの外側をタップしたら閉じる
dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
});

// 単位の集計
function collectSubjectNames() {
    const names = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cell-') && key.endsWith('-subject')) {
            const name = localStorage.getItem(key).trim();
            if (name) names.add(name);
        }
    }
    return names;
}

// 時間割に入っている科目は単位を取れたものとして数える(落とした科目と予定は除く)
function collectCredits() {
    const earned = {};          // 区分ごとの取れた単位
    const earnedNames = new Set();
    const failed = [];
    const unclassified = [];
    collectSubjectNames().forEach((name) => {
        const info = subjects[name];
        if (!info) {
            unclassified.push(name);
            return;
        }
        if (info.major === '予定') return;
        if (info.failed) {
            failed.push({ name, ...info });
            return;
        }
        earned[info.minor] = (earned[info.minor] || 0) + info.credits;
        earnedNames.add(name);
    });
    return { earned, earnedNames, failed, unclassified };
}

// 学生便覧 機械工学科「履修上の注意」(令和8年度入学者)の卒業要件と卒業研究の着手条件
function calcRequirements({ earned, earnedNames }) {
    const sum = (...minors) => minors.reduce((s, m) => s + (earned[m] || 0), 0);
    const hisshu = sum('必修◎');
    const maru = sum('選択必修○');
    const sankaku = sum('選択必修△');
    const commonRequired = sum('共通専門基礎(必修)');
    const kikai = hisshu + maru + sankaku + sum('選択');
    const senmon = kikai + commonRequired + sum('共通専門基礎(選択)', '専門基礎', '外国語中級(選択)');

    const kyoyo = [
        { label: '教養 基盤系', value: sum('基盤系'), need: 4 },
        {
            label: '教養 人文・社会・自然・総合系',
            note: '自然系と総合系は合わせて4単位まで',
            value: sum('人文系', '社会系') + Math.min(sum('自然系', '総合系'), 4),
            need: 12
        },
        { label: '外国語第Ⅰ（英語）', value: sum('外国語第Ⅰ'), need: 4 },
        { label: '外国語第Ⅱ', value: sum('外国語第Ⅱ'), need: 4 },
        { label: '健康・スポーツ科学系', value: sum('健康・スポーツ'), need: 1 }
    ];
    const graduation = [
        ...kyoyo,
        { label: '専門科目＋全学共通の選択科目', value: senmon, need: 102 },
        { label: '共通専門基礎の必修', value: commonRequired, need: 4, depth: 1 },
        { label: '機械工学科専門科目', value: kikai, need: 83, depth: 1 },
        { label: '必修◎（卒業研究10単位を含む）', value: hisshu, need: 38, depth: 2 },
        { label: '選択必修○', value: maru, need: 12, depth: 2 },
        { label: '選択必修△', value: sankaku, need: 4, depth: 2 }
    ];
    const total = graduation.filter((r) => !r.depth).reduce((s, r) => s + Math.min(r.value, r.need), 0);

    const labMissing = LAB_REQUIRED.filter((name) => !earnedNames.has(name));
    const thesis = [
        {
            label: '教養科目の卒業に必要な単位をすべて',
            value: kyoyo.reduce((s, r) => s + Math.min(r.value, r.need), 0),
            need: kyoyo.reduce((s, r) => s + r.need, 0)
        },
        {
            label: '実験・実習・演習区分の必修科目をすべて',
            value: LAB_REQUIRED.length - labMissing.length,
            need: LAB_REQUIRED.length,
            unit: '科目',
            note: labMissing.length ? `未修得: ${labMissing.join('、')}` : ''
        },
        { label: '必修◎', note: '共通専門基礎の必修を含む', value: hisshu + commonRequired, need: 28 },
        {
            label: '必修◎＋選択必修○△',
            note: '○は12単位、△は4単位まで',
            value: hisshu + commonRequired + Math.min(maru, 12) + Math.min(sankaku, 4),
            need: 42
        },
        { label: '機械工学科専門科目', value: kikai, need: 61 },
        { label: '専門科目＋全学共通の選択科目', value: senmon, need: 78 }
    ];
    return { graduation, total, thesis };
}

// 工学部規則第6条 履修科目の登録の上限
const CAP_PER_YEAR = 54;
const CAP_EXEMPT = ['グローバルチャレンジ実習'];

// その学年に登録している単位(同じ科目は1回だけ数える。落とした科目も登録はしているので数える)
function registeredCredits(year) {
    const names = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith(`cell-${year}-`) || !key.endsWith('-subject')) continue;
        const name = (localStorage.getItem(key) || '').trim();
        if (name) names.add(name);
    }
    let total = 0;
    names.forEach((name) => {
        const info = subjects[name];
        if (!info || info.major === '予定' || CAP_EXEMPT.some((x) => name.startsWith(x))) return;
        total += info.credits;
    });
    return total;
}

function makeRequirementRow(row) {
    const div = document.createElement('div');
    const done = row.value >= row.need;
    div.className = `req-row depth-${row.depth || 0}${done ? ' done' : ''}`;
    const top = document.createElement('div');
    top.className = 'req-top';
    const label = document.createElement('span');
    label.textContent = `${done ? '✓ ' : ''}${row.label}`;
    const value = document.createElement('span');
    value.className = 'req-value';
    value.textContent = `${row.value} / ${row.need}${row.unit || '単位'}`;
    top.appendChild(label);
    top.appendChild(value);
    div.appendChild(top);
    const bar = document.createElement('div');
    bar.className = 'req-bar';
    const fill = document.createElement('div');
    fill.style.width = `${Math.min(100, (row.value / row.need) * 100)}%`;
    bar.appendChild(fill);
    div.appendChild(bar);
    if (row.note) {
        const note = document.createElement('div');
        note.className = 'req-note';
        note.textContent = row.note;
        div.appendChild(note);
    }
    return div;
}

function makeSection(title, description) {
    const section = document.createElement('section');
    section.className = 'req-section';
    const h = document.createElement('h3');
    h.textContent = title;
    section.appendChild(h);
    if (description) {
        const p = document.createElement('p');
        p.className = 'req-desc';
        p.textContent = description;
        section.appendChild(p);
    }
    return section;
}

function renderSummary() {
    const container = document.getElementById('summary');
    container.innerHTML = '';

    const credits = collectCredits();
    const { graduation, total, thesis } = calcRequirements(credits);

    const grad = makeSection(`卒業要件　${total} / 127単位`,
        '時間割の科目は単位を取れたものとして数えています（落とした科目は除く）');
    graduation.forEach((row) => grad.appendChild(makeRequirementRow(row)));
    container.appendChild(grad);

    const cap = makeSection(`履修登録の上限（CAP）　1年間${CAP_PER_YEAR}単位`,
        '工学部規則第6条。落とした科目・取り消した科目も登録した単位に入ります（予定とグローバルチャレンジ実習は除く）');
    YEARS.forEach((year) => {
        const registered = registeredCredits(year);
        const row = makeRequirementRow({ label: `${year}年`, value: registered, need: CAP_PER_YEAR });
        // CAPは超えてはいけない上限なので、達成表示ではなく超過したときだけ警告にする
        row.classList.remove('done');
        row.querySelector('.req-top span').textContent = registered > CAP_PER_YEAR ? `⚠ ${year}年 上限超過` : `${year}年`;
        if (registered > CAP_PER_YEAR) row.classList.add('over');
        cap.appendChild(row);
    });
    container.appendChild(cap);

    const th = makeSection('4年で卒業研究に着手する条件',
        '機械工学科内規。2年・3年への進級条件は学生便覧にはありません');
    thesis.forEach((row) => th.appendChild(makeRequirementRow(row)));
    container.appendChild(th);

    const fail = makeSection(showFailed()
        ? `落とした単位　${credits.failed.reduce((s, f) => s + f.credits, 0)}単位`
        : '落とした単位');
    const toggle = document.createElement('button');
    toggle.className = 'toggle';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(showFailed()));
    toggle.textContent = showFailed() ? '表示中（タップで隠す）' : '隠しています（タップで表示）';
    toggle.addEventListener('click', () => {
        localStorage.setItem('showFailed', showFailed() ? '0' : '1');
        refresh();
    });
    fail.appendChild(toggle);
    // 隠しているときは一覧を出さない(時間割の赤い印も isFailedShown で消える)
    if (showFailed() && credits.failed.length) {
        credits.failed.forEach((f) => {
            const row = document.createElement('div');
            row.className = 'summary-row failed-row';
            const name = document.createElement('span');
            name.textContent = f.name;
            const value = document.createElement('span');
            value.textContent = `${f.major}・${f.minor}　${f.credits}単位`;
            row.appendChild(name);
            row.appendChild(value);
            fail.appendChild(row);
        });
    } else if (showFailed()) {
        const none = document.createElement('p');
        none.className = 'req-desc';
        none.textContent = 'なし（コマの編集画面で「単位を落とした」にチェックすると、ここに出ます）';
        fail.appendChild(none);
    }
    container.appendChild(fail);

    const mistakes = findQuarterMistakes();
    if (mistakes.length) {
        const warn = makeSection(`⚠ 入れるクォーターが違う可能性がある科目　${mistakes.length}件`);
        warn.classList.add('warning-section');
        mistakes.forEach((text) => {
            const p = document.createElement('p');
            p.className = 'req-desc';
            p.textContent = text;
            warn.appendChild(p);
        });
        container.prepend(warn);
    }
    const overCap = YEARS.some((year) => registeredCredits(year) > CAP_PER_YEAR);
    document.getElementById('summary-toggle').classList.toggle('has-warning', mistakes.length > 0 || overCap);

    if (credits.unclassified.length) {
        const un = makeSection('区分が未設定の科目（単位に数えていません）', credits.unclassified.join('、'));
        container.appendChild(un);
    }

    document.getElementById('total-credits').textContent = total;
}

const summaryToggle = document.getElementById('summary-toggle');
summaryToggle.addEventListener('click', () => {
    const summary = document.getElementById('summary');
    summary.hidden = !summary.hidden;
    summaryToggle.setAttribute('aria-expanded', String(!summary.hidden));
});

function renderLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    LEGEND.forEach(([label, className]) => {
        const item = document.createElement('span');
        item.className = `legend-item ${className}`;
        item.textContent = label;
        legend.appendChild(item);
    });
}

// 左右スワイプでクォーターを切り替える(4Qの次は次の学年の1Q)
let touchStart = null;
const main = document.getElementById('main');
main.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
main.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const index = (view.year - 1) * 4 + (view.quarter - 1) + (dx < 0 ? 1 : -1);
    if (index < 0 || index >= YEARS.length * QUARTERS.length) return;
    setView(Math.floor(index / 4) + 1, (index % 4) + 1);
});

function refresh() {
    renderTimetable();
    renderSummary();
}

renderTabs();
renderLegend();
refresh();
