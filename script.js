const cells =
document.querySelectorAll('td[contenteditable="true"]');

cells.forEach((cell, index) => {
    const saved = localStorage.getItem('cell-' + index);
    if (saved) {
        cell.textContent = saved;
    }
    cell.addEventListener('input', () => {
        localStorage.setItem('cell-' + index, cell.textContent);

    });
});
