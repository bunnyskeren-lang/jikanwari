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
            div.addEventListener('input', () => {
            localStorage.setItem(key, div.textContent);
                    td.appendChild(div);
    });

    return td;
}
        });
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
