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
    '選択必修△': 'cat-elective-b',
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
    ['共通専門基礎・専門基礎', 'cat-common'], ['必修◎', 'cat-required'], ['選択必修○', 'cat-elective'],
    ['選択必修△', 'cat-elective-b'],
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

// 便覧の教養科目一覧などから科目の区分を引く(全角・半角の違いは無視)
function lookupInfo(name, subjects) {
    if (subjects && subjects[name]) return subjects[name];
    if (SEED_SUBJECTS[name]) return SEED_SUBJECTS[name];
    const kyoyo = SEED_KYOYO[normalizeName(name)];
    return kyoyo ? { major: '教養', minor: kyoyo[0], credits: kyoyo[1] } : null;
}
function findOffering(name, quarter, day, period) {
    return (SEED_OFFERINGS[name] || []).find((o) => o[0] === quarter && o[1] === day && o[2] === period);
}

// 保存済みのデータを直す(一度だけ)
// ・1年1Qを履修登録どおりにする(1〜5限。放課後の予定と時間外はそのまま)
// ・科目ではない「機械系オンライン」を消し、「生活社会と法」を正しい名前「社会生活と法」に直す
// ・便覧の教養科目は全角・半角を正しい名前にそろえて区分を付け、開講しているコマなら教員・教室も入れる
// ・2Qの健康・スポーツ科学講義A・社会と人権B(オンデマンド)を入れ、線形代数3・4は2年の再履修クラスにする
function migrateV13() {
    if (localStorage.getItem('migratedV13')) return;
    if (typeof SEED_KYOYO === 'undefined') return;   // 古い seed.js が読み込まれたときは次回に回す
    const subjects = JSON.parse(localStorage.getItem('subjects') || '{}');
    const RENAME = { '生活社会と法': '社会生活と法' };
    const REMOVE = ['機械系オンライン'];

    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    keys.filter((k) => /^cell-.*-subject$/.test(k)).forEach((key) => {
        const prefix = key.slice(0, -'subject'.length);
        const name = (localStorage.getItem(key) || '').trim();
        if (!name) return;
        if (REMOVE.includes(normalizeName(name))) {
            FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
            return;
        }
        let fixed = RENAME[normalizeName(name)] || name;
        if (!SEED_SUBJECTS[fixed] && SEED_KYOYO[normalizeName(fixed)]) fixed = normalizeName(fixed);
        if (fixed !== name) localStorage.setItem(key, fixed);
        if (!subjects[fixed]) {
            const info = lookupInfo(fixed, null);
            if (info) subjects[fixed] = { ...info, failed: subjects[name] && subjects[name].failed };
        }
        const m = key.match(/^cell-(\d)-(\d)-(.+)-(.+)-subject$/);
        const offering = m && findOffering(fixed, Number(m[2]), m[3], Number(m[4]));
        if (offering) {
            if (!(localStorage.getItem(prefix + 'teacher') || '').trim()) localStorage.setItem(prefix + 'teacher', offering[3]);
            if (!(localStorage.getItem(prefix + 'room') || '').trim()) localStorage.setItem(prefix + 'room', offering[4]);
        }
    });
    REMOVE.forEach((name) => delete subjects[name]);
    Object.keys(RENAME).forEach((name) => delete subjects[name]);

    // 1年1Qは履修登録画面と同じにする(登録していないコマに入っている授業は消す。予定は残す)
    DAYS.forEach((day) => {
        [1, 2, 3, 4, 5].forEach((period) => {
            const prefix = `cell-1-1-${day}-${period}-`;
            const official = SEED_CELLS.find((c) => c.year === 1 && c.quarter === 1 && c.day === day && c.period === period);
            const current = (localStorage.getItem(prefix + 'subject') || '').trim();
            if (official) {
                FIELDS.forEach((field) => localStorage.setItem(prefix + field, official[field]));
                if (!subjects[official.subject]) subjects[official.subject] = SEED_SUBJECTS[official.subject];
            } else if (current && !(subjects[current] && subjects[current].major === '予定')) {
                FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
            }
        });
    });

    // 2Qの健康・スポーツ科学講義A、2年の線形代数3・4(再履修)は教養教育院の時間割どおりに上書きする
    SEED_CELLS.filter((c) => c.day !== EXTRA_DAY && (c.subject === '健康・スポーツ科学講義A'
        || (c.year === 2 && ['線形代数3', '線形代数4'].includes(c.subject)))).forEach((cell) => {
        const prefix = `cell-${cell.year}-${cell.quarter}-${cell.day}-${cell.period}-`;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    SEED_CELLS.filter((c) => c.day === EXTRA_DAY && c.subject === '社会と人権B').forEach((cell) => {
        if (extraEntries(cell.year, cell.quarter).some((e) => normalizeName(e.subject).startsWith('社会と人権'))) return;
        const prefix = `cell-${cell.year}-${cell.quarter}-${EXTRA_DAY}-${nextExtraPeriod(cell.year, cell.quarter)}-`;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    ['健康・スポーツ科学講義A', '社会と人権B', '初年次セミナー（機械工学）'].forEach((name) => {
        subjects[name] = { ...SEED_SUBJECTS[name], failed: subjects[name] && subjects[name].failed };
    });
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('migratedV13', '1');
}
migrateV13();

// 線形代数3・4の再履修クラスはオンデマンドなので、2年の木曜5限から時間外へ移す(一度だけ)
function migrateV14() {
    if (localStorage.getItem('migratedV14')) return;
    const retake = SEED_CELLS.filter((c) => c.year === 2 && c.day === EXTRA_DAY && ['線形代数3', '線形代数4'].includes(c.subject));
    if (retake.length < 2) return;   // 古い seed.js が読み込まれたときは次回に回す
    retake.forEach((cell) => {
        DAYS.forEach((day) => {
            PERIODS.forEach((period) => {
                const prefix = `cell-2-${cell.quarter}-${day}-${period}-`;
                if (normalizeName(localStorage.getItem(prefix + 'subject') || '') === cell.subject) {
                    FIELDS.forEach((field) => localStorage.removeItem(prefix + field));
                }
            });
        });
        if (extraEntries(2, cell.quarter).some((e) => normalizeName(e.subject) === cell.subject)) return;
        const prefix = `cell-2-${cell.quarter}-${EXTRA_DAY}-${nextExtraPeriod(2, cell.quarter)}-`;
        FIELDS.forEach((field) => localStorage.setItem(prefix + field, cell[field]));
    });
    localStorage.setItem('migratedV14', '1');
}
migrateV14();

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
function quarterWarning(name, quarter, day, period) {
    const subject = normalizeName(name);
    if (/^AcademicEnglish/.test(subject) && !/^AcademicEnglish(Communication|Literacy)[AB][12]$/.test(subject)) {
        return 'Academic English は A1(1Q)・A2(2Q)・B1(3Q)・B2(4Q) の4つだけです';
    }
    // 開講コマが分かっている教養科目は、曜日・時限まで合っているかを見る
    const offerings = SEED_OFFERINGS[subject];
    if (offerings && day !== EXTRA_DAY && !findOffering(subject, quarter, day, Number(period))) {
        return `この時間には開講されていません（開講: ${offerings.map((o) => `${o[0]}Q${o[1]}${o[2]}`).join('・')}）`;
    }
    const expected = expectedQuarters(name);
    if (!expected || expected.has(quarter)) return '';
    return `この科目は ${[...expected].sort().map((q) => `${q}Q`).join('・')} の授業です`;
}

// 区分が分からない科目名に、便覧・時間割表の似た科目名を出す(2文字ずつの重なりで比べる)
function similarNames(name) {
    const pairs = (s) => new Set([...Array(Math.max(s.length - 1, 1)).keys()].map((i) => s.slice(i, i + 2)));
    const a = pairs(normalizeName(name));
    return [...new Set([...Object.keys(SEED_KYOYO), ...Object.keys(SEED_SUBJECTS)])]
        .map((candidate) => {
            const b = pairs(candidate);
            const common = [...a].filter((p) => b.has(p)).length;
            return { candidate, score: (2 * common) / (a.size + b.size) };
        })
        .filter((c) => c.score >= 0.4)
        .sort((x, y) => y.score - x.score)
        .slice(0, 3)
        .map((c) => c.candidate);
}
function findQuarterMistakes() {
    const mistakes = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const m = key.match(/^cell-(\d)-(\d)-(.+)-(.+)-subject$/);
        if (!m) continue;
        const name = (localStorage.getItem(key) || '').trim();
        if (!name || (subjects[name] && subjects[name].major === '予定')) continue;
        const warning = quarterWarning(name, Number(m[2]), m[3], m[4]);
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

// 便覧の印(◎必修・○△選択必修)をコマの右上に出す
const CATEGORY_MARK = { '共通専門基礎(必修)': '◎', '必修◎': '◎', '選択必修○': '○', '選択必修△': '△' };
function makeMark(name) {
    const info = subjects[name];
    const mark = info && CATEGORY_MARK[info.minor];
    if (!mark) return null;
    const span = document.createElement('span');
    span.className = 'cell-mark';
    span.textContent = mark;
    return span;
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
        const mark = makeMark(cell.subject);
        if (mark) btn.appendChild(mark);
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
        if (cell.teacher) {
            const teacher = document.createElement('span');
            teacher.className = 'cell-teacher';
            teacher.textContent = cell.teacher;
            btn.appendChild(teacher);
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

    // 見出し行(曜日)
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    DAYS.forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
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
            tr.appendChild(buildCell(view.year, view.quarter, day, period));
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
        const mark = makeMark(cell.subject);
        if (mark) btn.appendChild(mark);
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
    const info = lookupInfo(name, subjects) || defaults || { major: '専門', minor: '選択', credits: 1 };
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
    if (lookupInfo(name, subjects)) showSubjectInfo(name);
});
// 入力中の科目が別のクォーターの授業なら、その場で注意を出す
function updateQuarterWarning() {
    const warning = document.getElementById('dialog-warning');
    const name = subjectInput.value.trim();
    const text = name && editing ? quarterWarning(name, editing.quarter, editing.day, editing.period) : '';
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
        { label: '基盤系', value: sum('基盤系'), need: 4 },
        {
            label: '人文・社会・自然・総合系',
            value: sum('人文系', '社会系') + Math.min(sum('自然系', '総合系'), 4),
            need: 12
        },
        { label: '外国語第Ⅰ（英語）', value: sum('外国語第Ⅰ'), need: 4 },
        { label: '外国語第Ⅱ', value: sum('外国語第Ⅱ'), need: 4 },
        { label: '健康・スポーツ科学系', value: sum('健康・スポーツ'), need: 1 }
    ];
    const graduation = [
        ...kyoyo,
        { label: '専門＋全学共通の選択', value: senmon, need: 102 },
        { label: '共通専門基礎の必修', value: commonRequired, need: 4, depth: 1 },
        { label: '機械工学科専門科目', value: kikai, need: 83, depth: 1 },
        { label: '必修◎（卒業研究を含む）', value: hisshu, need: 38, depth: 2 },
        { label: '選択必修○', value: maru, need: 12, depth: 2 },
        { label: '選択必修△', value: sankaku, need: 4, depth: 2 }
    ];
    const total = graduation.filter((r) => !r.depth).reduce((s, r) => s + Math.min(r.value, r.need), 0);

    const labMissing = LAB_REQUIRED.filter((name) => !earnedNames.has(name));
    const thesis = [
        {
            label: '教養の卒業要件をすべて',
            value: kyoyo.reduce((s, r) => s + Math.min(r.value, r.need), 0),
            need: kyoyo.reduce((s, r) => s + r.need, 0)
        },
        {
            label: '実験・実習・演習の必修',
            value: LAB_REQUIRED.length - labMissing.length,
            need: LAB_REQUIRED.length,
            unit: '科目',
            note: labMissing.length ? `未修得: ${labMissing.join('、')}` : ''
        },
        { label: '必修◎（共通専門基礎を含む）', value: hisshu + commonRequired, need: 28 },
        {
            label: '必修◎＋選択必修○△',
            value: hisshu + commonRequired + Math.min(maru, 12) + Math.min(sankaku, 4),
            need: 42
        },
        { label: '機械工学科専門科目', value: kikai, need: 61 },
        { label: '専門＋全学共通の選択', value: senmon, need: 78 }
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

// 1行分: 「✓/●」「項目名」「取った / 必要」「あと○」を1行に続けて並べる
// (左右の端に分けると視線が行き来し、バーを付けると縦に長くなるので、どちらもしない)
function makeRequirementRow(row) {
    const unit = row.unit || '単位';
    const done = row.value >= row.need;
    const div = document.createElement('div');
    div.className = `req-row depth-${row.depth || 0}${done ? ' done' : ''}`;
    [
        ['req-icon', done ? '✓' : '●'],
        ['req-label', row.label],
        ['req-value', `${row.value}/${row.need}`],
        ['req-badge', done ? '' : `あと${row.need - row.value}${unit === '単位' ? '' : unit}`]
    ].forEach(([cls, text]) => {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        div.appendChild(span);
    });
    if (row.note) {
        const note = document.createElement('div');
        note.className = 'req-note';
        note.textContent = row.note;
        div.appendChild(note);
    }
    return div;
}

// 開け閉めできるカード。見出しの右に状態(「✓ すべて達成」「2項目が未達成」など)を出す
function makeCard(title, status, open, statusClass) {
    const card = document.createElement('details');
    card.className = 'req-card';
    card.open = open;
    const summary = document.createElement('summary');
    const h = document.createElement('span');
    h.className = 'req-card-title';
    h.textContent = title;
    summary.appendChild(h);
    if (status) {
        const s = document.createElement('span');
        s.className = `req-card-status ${statusClass || ''}`;
        s.textContent = status;
        summary.appendChild(s);
    }
    card.appendChild(summary);
    return card;
}
function makeGroupTitle(text) {
    const p = document.createElement('p');
    p.className = 'req-group';
    p.textContent = text;
    return p;
}
function makeFootnote(text) {
    const p = document.createElement('p');
    p.className = 'req-desc';
    p.textContent = text;
    return p;
}
function renderSummary() {
    const container = document.getElementById('summary');
    container.innerHTML = '';

    const credits = collectCredits();
    const { graduation, total, thesis } = calcRequirements(credits);
    const mistakes = findQuarterMistakes();
    const overCap = YEARS.some((year) => registeredCredits(year) > CAP_PER_YEAR);

    if (mistakes.length) {
        const warn = makeCard('⚠ 入れる場所が違うかもしれない科目', `${mistakes.length}件`, true, 'bad');
        mistakes.forEach((text) => warn.appendChild(makeFootnote(text)));
        container.appendChild(warn);
    }

    if (credits.unclassified.length) {
        const un = makeCard('区分が分からない科目', `${credits.unclassified.length}件`, true, 'bad');
        credits.unclassified.forEach((name) => {
            const similar = similarNames(name);
            un.appendChild(makeFootnote(similar.length ? `${name} → もしかして: ${similar.join('・')}` : name));
        });
        un.appendChild(makeFootnote('科目名が便覧と違うと区分が分からず、単位に数えません'));
        container.appendChild(un);
    }

    // 卒業要件: 教養と専門に分けて並べる
    const gradLeft = graduation.filter((r) => r.value < r.need).length;
    const grad = makeCard('卒業要件', gradLeft ? `${gradLeft}項目が未達成` : '✓ すべて達成', true, gradLeft ? '' : 'good');
    const senmonStart = graduation.findIndex((r) => r.label.startsWith('専門'));
    grad.appendChild(makeGroupTitle('教養'));
    graduation.slice(0, senmonStart).forEach((row) => grad.appendChild(makeRequirementRow(row)));
    grad.appendChild(makeGroupTitle('専門'));
    graduation.slice(senmonStart).forEach((row) => grad.appendChild(makeRequirementRow(row)));
    grad.appendChild(makeFootnote('時間割の科目は単位を取れたものとして数えています（落とした科目は除く）。自然系と総合系は合わせて4単位まで'));
    container.appendChild(grad);

    const cap = makeCard(`履修登録の上限（1年間${CAP_PER_YEAR}単位）`, overCap ? '⚠ 超過あり' : '✓ 上限内', false, overCap ? 'bad' : 'good');
    YEARS.forEach((year) => {
        const registered = registeredCredits(year);
        const row = makeRequirementRow({ label: `${year}年`, value: registered, need: CAP_PER_YEAR });
        // CAPは超えてはいけない上限なので、残りか超過を出す
        row.classList.remove('done');
        row.querySelector('.req-icon').textContent = registered > CAP_PER_YEAR ? '⚠' : '';
        row.querySelector('.req-badge').textContent = registered > CAP_PER_YEAR
            ? `${registered - CAP_PER_YEAR}オーバー` : `あと${CAP_PER_YEAR - registered}`;
        if (registered > CAP_PER_YEAR) row.classList.add('over');
        cap.appendChild(row);
    });
    cap.appendChild(makeFootnote('工学部規則第6条。落とした科目・取り消した科目も入ります（予定とグローバルチャレンジ実習は除く）'));
    container.appendChild(cap);

    const thesisLeft = thesis.filter((r) => r.value < r.need).length;
    const th = makeCard('4年で卒業研究に着手する条件', thesisLeft ? `${thesisLeft}項目が未達成` : '✓ すべて達成', false, thesisLeft ? '' : 'good');
    thesis.forEach((row) => th.appendChild(makeRequirementRow(row)));
    th.appendChild(makeFootnote('機械工学科内規。○は12単位、△は4単位まで数える'));
    container.appendChild(th);

    // 落とした単位は人に見られたくないので、トグルをオンにしたときだけ中身を出す
    const fail = makeCard('落とした単位', showFailed()
        ? `${credits.failed.reduce((s, f) => s + f.credits, 0)}単位` : '非表示', false);
    fail.classList.add('fail-card');
    const toggle = document.createElement('button');
    toggle.className = 'toggle';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(showFailed()));
    toggle.textContent = showFailed() ? '表示中（タップで隠す）' : '隠しています（タップで表示）';
    toggle.addEventListener('click', () => {
        localStorage.setItem('showFailed', showFailed() ? '0' : '1');
        refresh();
        document.querySelector('.fail-card').open = true;
    });
    fail.appendChild(toggle);
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
        fail.appendChild(makeFootnote('なし（コマの編集画面で「単位を落とした」にチェックすると、ここに出ます）'));
    }
    container.appendChild(fail);

    document.getElementById('summary-toggle').classList.toggle('has-warning', mistakes.length > 0 || overCap);
    document.getElementById('total-credits').textContent = total;
}

const summaryDialog = document.getElementById('summary-dialog');
document.getElementById('summary-toggle').addEventListener('click', () => {
    renderSummary();
    summaryDialog.showModal();
    document.getElementById('summary').scrollTop = 0;
});
document.getElementById('summary-close').addEventListener('click', () => summaryDialog.close());

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

// 保存している時間割を JSON に書き出す(PC の tools\phone-import が録音の振り分けに使う)
function collectAllCells() {
    const cells = [];
    for (let i = 0; i < localStorage.length; i++) {
        const m = localStorage.key(i).match(/^cell-(\d)-(\d)-(.+)-(.+)-subject$/);
        if (!m) continue;
        const [, year, quarter, day, period] = m;
        const cell = readCell(year, quarter, day, period);
        if (!cell.subject) continue;
        cells.push({ year: Number(year), quarter: Number(quarter), day,
            period: /^\d+$/.test(period) ? Number(period) : period, ...cell });
    }
    return cells.sort((a, b) => a.year - b.year || a.quarter - b.quarter
        || DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || String(a.period).localeCompare(String(b.period)));
}
document.getElementById('export-button').addEventListener('click', async () => {
    const data = { app: 'jikanwari', exportedAt: new Date().toISOString(), cells: collectAllCells(), subjects };
    const file = new File([JSON.stringify(data, null, 1)], '時間割.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch (e) { /* 共有をキャンセルしたとき */ }
        return;
    }
    // 共有できないブラウザ(PC など)はダウンロードにする
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
});

function refresh() {
    renderTimetable();
    renderSummary();
}

renderTabs();
renderLegend();
refresh();
