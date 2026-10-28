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

const CATEGORIES = {
    '専門': ['共通専門', '必修', '選択必修', 'その他'],
    '教養': ['人文社会', '総合系']
};
// 分類ごとの色(style.css の .cat-xxx)
const CATEGORY_CLASS = {
    '共通専門': 'cat-common',
    '必修': 'cat-required',
    '選択必修': 'cat-elective',
    'その他': 'cat-other',
    '人文社会': 'cat-liberal',
    '総合系': 'cat-general'
};

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

function buildCell(year, quarter, day, period) {
    const td = document.createElement('td');
    const cell = readCell(year, quarter, day, period);
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('aria-label', `${day}曜${period}${typeof period === 'number' ? '限' : ''} ${cell.subject || '空き'}`);
    if (cell.subject) {
        const info = subjects[cell.subject];
        btn.classList.add(info ? CATEGORY_CLASS[info.minor] || 'cat-other' : 'cat-none');
        const name = document.createElement('span');
        name.className = 'cell-subject';
        name.textContent = cell.subject;
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
}

// 編集ダイアログ
const dialog = document.getElementById('cell-dialog');
const subjectInput = document.getElementById('dialog-subject');
const roomInput = document.getElementById('dialog-room');
const teacherInput = document.getElementById('dialog-teacher');
const majorSelect = document.getElementById('dialog-major');
const minorSelect = document.getElementById('dialog-minor');
const creditsInput = document.getElementById('dialog-credits');
let editing = null;   // いま編集中のコマ { year, quarter, day, period }

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
});

function showSubjectInfo(name) {
    const info = subjects[name] || { major: '専門', minor: '共通専門', credits: 1 };
    majorSelect.value = info.major;
    fillOptions(minorSelect, CATEGORIES[info.major]);
    minorSelect.value = info.minor;
    creditsInput.value = info.credits;
}
// 登録済みの科目名を選んだら区分・単位も合わせる
subjectInput.addEventListener('change', () => {
    const name = subjectInput.value.trim();
    if (subjects[name]) showSubjectInfo(name);
});

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
    const periodLabel = typeof period === 'number' ? `${period}限` : period;
    document.getElementById('dialog-slot').textContent = `${year}年 ${quarter}Q ・ ${day}曜 ${periodLabel}`;
    subjectInput.value = cell.subject;
    roomInput.value = cell.room;
    teacherInput.value = cell.teacher;
    showSubjectInfo(cell.subject);
    fillSubjectList();
    dialog.showModal();
}

document.getElementById('cell-form').addEventListener('submit', () => {
    const { year, quarter, day, period } = editing;
    const values = { subject: subjectInput.value, room: roomInput.value, teacher: teacherInput.value };
    FIELDS.forEach((field) => {
        localStorage.setItem(cellKey(year, quarter, day, period, field), values[field].trim());
    });
    const name = values.subject.trim();
    if (name) {
        subjects[name] = {
            major: majorSelect.value,
            minor: minorSelect.value,
            credits: Number(creditsInput.value)
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

function calcTotals() {
    const totals = {};
    collectSubjectNames().forEach((name) => {
        const info = subjects[name];
        const label = info ? `${info.major}・${info.minor}` : '未分類';
        const credits = info ? info.credits : 1;
        totals[label] = (totals[label] || 0) + credits;
    });
    return totals;
}

function renderSummary() {
    const container = document.getElementById('summary');
    container.innerHTML = '';

    const totals = calcTotals();
    let sum = 0;
    Object.keys(totals).forEach((label) => {
        const row = document.createElement('div');
        row.className = 'summary-row';
        const name = document.createElement('span');
        name.textContent = label;
        const value = document.createElement('span');
        value.textContent = `${totals[label]}単位`;
        row.appendChild(name);
        row.appendChild(value);
        container.appendChild(row);
        sum += totals[label];
    });
    document.getElementById('total-credits').textContent = sum;
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
    Object.keys(CATEGORY_CLASS).forEach((minor) => {
        const item = document.createElement('span');
        item.className = `legend-item ${CATEGORY_CLASS[minor]}`;
        item.textContent = minor;
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
