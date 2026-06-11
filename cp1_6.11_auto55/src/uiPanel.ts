import type { CatalogEntry } from './ocrParser';
import type { BookShelf } from './bookShelf';

type BgStyle = 'wood' | 'black' | 'blue';

export class UIPanel {
  private tableWrapper: HTMLElement;
  private tablePlaceholder: HTMLElement;
  private ocrStatus: HTMLElement;
  private layerSlider: HTMLInputElement;
  private spacingSlider: HTMLInputElement;
  private layerValue: HTMLElement;
  private spacingValue: HTMLElement;
  private bgOptions: NodeListOf<HTMLElement>;
  private bookShelf: BookShelf;
  private onEntryEdit: ((entries: CatalogEntry[]) => void) | null = null;
  private entries: CatalogEntry[] = [];

  constructor(bookShelf: BookShelf) {
    this.bookShelf = bookShelf;
    this.tableWrapper = document.getElementById('ocr-table-wrapper')!;
    this.tablePlaceholder = document.getElementById('table-placeholder')!;
    this.ocrStatus = document.getElementById('ocr-status')!;
    this.layerSlider = document.getElementById('layer-slider') as HTMLInputElement;
    this.spacingSlider = document.getElementById('spacing-slider') as HTMLInputElement;
    this.layerValue = document.getElementById('layer-value')!;
    this.spacingValue = document.getElementById('spacing-value')!;
    this.bgOptions = document.querySelectorAll('.bg-option');

    this.bindControls();
  }

  setOnEntryEdit(cb: (entries: CatalogEntry[]) => void) {
    this.onEntryEdit = cb;
  }

  setStatus(text: string) {
    this.ocrStatus.textContent = text;
  }

  renderTable(entries: CatalogEntry[]) {
    this.entries = entries;
    this.tablePlaceholder.style.display = 'none';

    const existingTable = this.tableWrapper.querySelector('table');
    if (existingTable) existingTable.remove();

    const table = document.createElement('table');
    table.className = 'ocr-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width:50px">层级</th>
        <th>标题</th>
        <th style="width:60px">页码</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (const entry of entries) {
      const tr = document.createElement('tr');
      tr.dataset.entryId = String(entry.id);

      const levelTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `level-badge level-${entry.level}`;
      badge.textContent = `L${entry.level}`;
      levelTd.appendChild(badge);
      tr.appendChild(levelTd);

      const titleTd = document.createElement('td');
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'editable-cell';
      titleInput.value = entry.title;
      titleInput.dataset.field = 'title';
      titleInput.dataset.id = String(entry.id);
      titleTd.appendChild(titleInput);
      tr.appendChild(titleTd);

      const pageTd = document.createElement('td');
      const pageInput = document.createElement('input');
      pageInput.type = 'text';
      pageInput.className = 'page-input';
      pageInput.value = entry.page;
      pageInput.dataset.field = 'page';
      pageInput.dataset.id = String(entry.id);
      pageTd.appendChild(pageInput);
      tr.appendChild(pageTd);

      tr.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        this.bookShelf.focusSpine(entry.id);
        tbody.querySelectorAll('tr').forEach((row) => row.classList.remove('active-row'));
        tr.classList.add('active-row');
      });

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    this.tableWrapper.appendChild(table);

    this.bindTableEdits();
  }

  private bindTableEdits() {
    const inputs = this.tableWrapper.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        const id = parseInt(input.dataset.id!);
        const field = input.dataset.field as 'title' | 'page';
        const value = input.value;

        this.entries = this.entries.map((e) => {
          if (e.id === id) {
            return { ...e, [field]: value };
          }
          return e;
        });

        if (this.onEntryEdit) {
          this.onEntryEdit(this.entries);
        }
      });
    });
  }

  highlightRow(entryId: number) {
    const tbody = this.tableWrapper.querySelector('tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((row) => row.classList.remove('active-row'));
    const targetRow = tbody.querySelector(`tr[data-entry-id="${entryId}"]`);
    if (targetRow) {
      targetRow.classList.add('active-row');
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  private bindControls() {
    this.layerSlider.addEventListener('input', () => {
      const val = parseInt(this.layerSlider.value);
      this.layerValue.textContent = String(val);
      this.bookShelf.setLayers(val);
    });

    this.spacingSlider.addEventListener('input', () => {
      const val = parseInt(this.spacingSlider.value);
      this.spacingValue.textContent = String(val);
      this.bookShelf.setSpacing(val);
    });

    this.bgOptions.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.bgOptions.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const bg = btn.dataset.bg as BgStyle;
        this.bookShelf.setBgStyle(bg);
      });
    });
  }

  reset() {
    this.entries = [];
    this.ocrStatus.textContent = '';
    this.tablePlaceholder.style.display = 'block';
    const existingTable = this.tableWrapper.querySelector('table');
    if (existingTable) existingTable.remove();
    this.layerSlider.value = '5';
    this.spacingSlider.value = '8';
    this.layerValue.textContent = '5';
    this.spacingValue.textContent = '8';
    this.bgOptions.forEach((b) => b.classList.remove('active'));
    this.bgOptions[0].classList.add('active');
  }
}
