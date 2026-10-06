const YEARS =[1,2,3,4];
const QUARTERS = [1,2,3,4];
const DAYS = ['月','火','水','木','金'];
const PERIODS = [1,2,3,4,5,'放課後'];
const DEFAULT_TIMES = [
    { start: '08:50', end: '10:20'},
    { start: '10:40', end: '12:10'},
    { start: '13:20', end: '14:50'},
    { start: '15:10', end: '16:40'},
    { start: '17:00', end: '18:30'},
    { start: '17:30', end: '20:30'}
];
const FIELDS = ['subject', 'room', 'teacher'];

function loadPeriodTimes(){
    const saved = localStorage.getItem('periodTimes');
    //if (saved) {
    //    return JSON.parse(saved);
    //}
    return DEFAULT_TIMES;
}

function renderPeriodTimeInputs(times) {
    const container = document.getElementById('period-time-inputs');
    PERIODS.forEach((period, index) => {
        const time = times[index];
        const label = typeof period === 'number' ? `${period}限` : period;
        const p = document.createElement('p');
        p.textContent = `${label}: ${time.start}〜${time.end}`;
        container.appendChild(p);
    });
}
function buildCell(year, quarter, day, period) {
    const td = document.createElement('td');
    FIELDS.forEach((field) => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        div.className = field === 'subject' ? 'field-subject' : 'field-sub';
        const key = `cell-${year}-${quarter}-${day}-${period}-${field}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            div.textContent = saved;
        }
        div.addEventListener('input', () => {
            localStorage.setItem(key, div.textContent);
            if (field === 'subject') renderSummary();
        });
        td.appendChild(div);
    });
    const btn = document.createElement('button');
    btn.textContent = '⚙';
    btn.addEventListener('click', () => {
        const name = td.querySelector('.field-subject').textContent.trim();
        if (name) openSubjectDialog(name);
    });
    td.appendChild(btn);
    return td;
}
function buildQuarterTable(year, quarter, times) {
    const table = document.createElement('table');

    const caption = document.createElement('caption');
    caption.textContent = `${year}年 第${quarter}クォーター`;
    table.appendChild(caption);

    // 見出し行(曜日)
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // 左上の空セル
    DAYS.forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 時限ごとの行
    PERIODS.forEach((period, index) => {
        const tr = document.createElement('tr');

        const th = document.createElement('th');
        th.textContent = typeof period === 'number' ? `${period}限` : period;
        tr.appendChild(th);

        DAYS.forEach((day) => {
            const td = buildCell(year, quarter, day, period);
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    return table;
}
function renderTimetables(times) {
    const container = document.getElementById('timetables');
    YEARS.forEach((year) => {
        QUARTERS.forEach((quarter) => {
            const table = buildQuarterTable(year, quarter, times);
            container.appendChild(table);
        });
    });
}

const periodTimes = loadPeriodTimes();
renderPeriodTimeInputs(periodTimes);
renderTimetables(periodTimes);

const CATEGORIES = {
    '専門':['共通専門','必修','選択必修','その他'],
    '教養':['人文社会','総合系']
};

function loadSubjects() {
    const saved = localStorage.getItem('subjects');
    return saved ? JSON.parse(saved) : {};
}
function saveSubjects(subjects) {
    localStorage.setItem('subjects', JSON.stringify(subjects));
}
const subjects = loadSubjects();

const majorSelect = document.getElementById('dialog-major');
const minorSelect = document.getElementById('dialog-minor');

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

let editingSubject = null;   // いま編集中の科目名

function openSubjectDialog(name) {
    editingSubject = name;
    document.getElementById('dialog-title').textContent = name;

    const info = subjects[name] || { major: '専門', minor: '共通専門', credits: 1 };
    majorSelect.value = info.major;
    fillOptions(minorSelect, CATEGORIES[info.major]);
    minorSelect.value = info.minor;
    document.getElementById('dialog-credits').value = info.credits;

    document.getElementById('subject-dialog').showModal();
}



document.getElementById('dialog-save').addEventListener('click', () => {
    subjects[editingSubject] = {
        major: majorSelect.value,
        minor: minorSelect.value,
        credits: Number(document.getElementById('dialog-credits').value)
    };
    saveSubjects(subjects);
    renderSummary();
    document.getElementById('subject-dialog').close();
});
document.getElementById('dialog-cancel').addEventListener('click', () => {
    document.getElementById('subject-dialog').close();
});

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
        const p = document.createElement('p');
        p.textContent = `${label}: ${totals[label]}単位`;
        container.appendChild(p);
        sum += totals[label];
    });

    const total = document.createElement('p');
    total.textContent = `合計: ${sum}単位`;
    container.appendChild(total);
}

renderSummary();

