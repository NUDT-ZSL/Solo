import { HabitData } from './garden';
import { getStreakColor } from './crystal';
import './style.css';

const COLOR_THEMES = [
  { name: 'purple', value: '#7c3aed', label: '紫' },
  { name: 'blue', value: '#3b82f6', label: '蓝' },
  { name: 'cyan', value: '#06b6d4', label: '青' },
  { name: 'green', value: '#22c55e', label: '绿' },
  { name: 'yellow', value: '#eab308', label: '黄' },
  { name: 'orange', value: '#f97316', label: '橙' },
  { name: 'pink', value: '#ec4899', label: '粉' },
  { name: 'red', value: '#ef4444', label: '红' },
];

const ICONS = ['📚', '🏃', '💧', '🧘', '💪', '✍️', '🎯', '🌱', '🎵', '💤', '🥗', '🧠'];

interface UIOptions {
  onCheckIn: (habitId: string) => void;
  onAddHabit: (data: { name: string; colorTheme: string; icon: string }) => void;
  onFocusHabit?: (habitId: string | null) => void;
}

export class UIManager {
  private cardsContainer: HTMLDivElement;
  private blessingContainer: HTMLDivElement;
  private addBtn: HTMLButtonElement;
  private modal: HTMLDivElement;
  private nameInput: HTMLInputElement;
  private colorPicker: HTMLDivElement;
  private iconPicker: HTMLDivElement;
  private modalCancel: HTMLButtonElement;
  private modalConfirm: HTMLButtonElement;
  private cards: Map<string, HTMLDivElement> = new Map();
  private selectedColor: string = COLOR_THEMES[0]!.value;
  private selectedIcon: string = ICONS[0]!;
  private options: UIOptions;

  constructor(options: UIOptions) {
    this.options = options;
    this.cardsContainer = document.getElementById('habit-cards') as HTMLDivElement;
    this.blessingContainer = document.getElementById('blessing-container') as HTMLDivElement;
    this.addBtn = document.getElementById('add-habit-btn') as HTMLButtonElement;
    this.modal = document.getElementById('add-modal') as HTMLDivElement;
    this.nameInput = document.getElementById('habit-name-input') as HTMLInputElement;
    this.colorPicker = document.getElementById('color-picker') as HTMLDivElement;
    this.iconPicker = document.getElementById('icon-picker') as HTMLDivElement;
    this.modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;
    this.modalConfirm = document.getElementById('modal-confirm') as HTMLButtonElement;

    this.buildPickerOptions();
    this.bindModalEvents();
    this.bindAddButton();
  }

  private buildPickerOptions(): void {
    COLOR_THEMES.forEach((theme, index) => {
      const opt = document.createElement('div');
      opt.className = 'color-option' + (index === 0 ? ' selected' : '');
      opt.style.background = theme.value;
      opt.dataset.value = theme.value;
      opt.addEventListener('click', () => {
        this.selectedColor = theme.value;
        this.colorPicker
          .querySelectorAll('.color-option')
          .forEach((el) => el.classList.remove('selected'));
        opt.classList.add('selected');
      });
      this.colorPicker.appendChild(opt);
    });

    ICONS.forEach((icon, index) => {
      const opt = document.createElement('div');
      opt.className = 'icon-option' + (index === 0 ? ' selected' : '');
      opt.textContent = icon;
      opt.dataset.value = icon;
      opt.addEventListener('click', () => {
        this.selectedIcon = icon;
        this.iconPicker
          .querySelectorAll('.icon-option')
          .forEach((el) => el.classList.remove('selected'));
        opt.classList.add('selected');
      });
      this.iconPicker.appendChild(opt);
    });
  }

  private bindModalEvents(): void {
    this.modalCancel.addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });
    this.modalConfirm.addEventListener('click', () => {
      const name = this.nameInput.value.trim();
      if (name.length === 0) {
        this.nameInput.focus();
        this.nameInput.style.borderColor = '#ef4444';
        setTimeout(() => {
          this.nameInput.style.borderColor = '';
        }, 1500);
        return;
      }
      this.options.onAddHabit({
        name,
        colorTheme: this.selectedColor,
        icon: this.selectedIcon,
      });
      this.closeModal();
    });
  }

  private bindAddButton(): void {
    this.addBtn.addEventListener('click', () => this.openModal());
  }

  private openModal(): void {
    this.modal.classList.remove('hidden');
    this.nameInput.value = '';
    setTimeout(() => this.nameInput.focus(), 150);
  }

  private closeModal(): void {
    this.modal.classList.add('hidden');
  }

  addHabitCard(habit: HabitData): void {
    const card = this.createHabitCard(habit);
    this.cards.set(habit.id, card);
    this.cardsContainer.appendChild(card);
  }

  updateHabitCard(habit: HabitData): void {
    const card = this.cards.get(habit.id);
    if (!card) return;
    const streakEl = card.querySelector('.streak-number') as HTMLDivElement;
    const streakLabelEl = card.querySelector('.streak-day') as HTMLSpanElement;
    const progressFill = card.querySelector('.mini-progress-fill') as HTMLDivElement;
    const checkinBtn = card.querySelector('.checkin-btn') as HTMLButtonElement;
    const streakColor = getStreakColor(habit.streak);

    streakEl.textContent = String(habit.streak);
    streakLabelEl.textContent = habit.streak === 1 ? '天' : '天';
    streakEl.style.color = streakColor;

    if (habit.todayDone) {
      progressFill.classList.add('done');
      checkinBtn.classList.add('checked');
      checkinBtn.textContent = '✓';
    } else {
      progressFill.classList.remove('done');
      checkinBtn.classList.remove('checked');
      checkinBtn.textContent = '+';
    }
  }

  private createHabitCard(habit: HabitData): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.dataset.id = habit.id;
    const streakColor = getStreakColor(habit.streak);

    card.innerHTML = `
      <div class="card-top">
        <div class="habit-icon" style="background: ${habit.colorTheme}22; border: 1px solid ${habit.colorTheme}44;">
          ${habit.icon}
        </div>
        <div class="habit-info">
          <div class="habit-name">${this.escapeHtml(habit.name)}</div>
          <div class="habit-streak">连续 <span class="streak-day">${habit.streak === 1 ? '天' : '天'}</span></div>
        </div>
        <div style="text-align: right;">
          <div class="streak-number" style="color: ${streakColor};">${habit.streak}</div>
          <div class="streak-label">天数</div>
        </div>
      </div>
      <div class="card-bottom">
        <div class="mini-progress">
          <div class="mini-progress-fill ${habit.todayDone ? 'done' : ''}" style="width: ${habit.todayDone ? '100%' : '0%'};"></div>
        </div>
        <button class="checkin-btn ${habit.todayDone ? 'checked' : ''}" aria-label="打卡">
          ${habit.todayDone ? '✓' : '+'}
        </button>
      </div>
    `;

    const checkinBtn = card.querySelector('.checkin-btn') as HTMLButtonElement;
    checkinBtn.addEventListener('click', (e) => {
      if (habit.todayDone) return;
      this.triggerRipple(checkinBtn, e);
      this.options.onCheckIn(habit.id);
      habit.todayDone = true;
      this.updateHabitCard(habit);
    });

    card.addEventListener('mouseenter', () => {
      this.options.onFocusHabit?.(habit.id);
    });
    card.addEventListener('mouseleave', () => {
      this.options.onFocusHabit?.(null);
    });

    return card;
  }

  private triggerRipple(btn: HTMLButtonElement, ev: Event): void {
    const rect = btn.getBoundingClientRect();
    const clickEv = ev as MouseEvent;
    const cx = (clickEv.clientX ?? rect.left + rect.width / 2) - rect.left;
    const cy = (clickEv.clientY ?? rect.top + rect.height / 2) - rect.top;
    const size = Math.max(rect.width, rect.height);

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = cx - size / 2 + 'px';
    ripple.style.top = cy - size / 2 + 'px';
    btn.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 420);
  }

  showBlessing(text: string): void {
    const tag = document.createElement('div');
    tag.className = 'blessing-tag';
    tag.textContent = text;
    this.blessingContainer.appendChild(tag);

    requestAnimationFrame(() => {
      tag.classList.add('show');
    });

    setTimeout(() => {
      tag.classList.remove('show');
      tag.classList.add('fade-out');
    }, 3500);

    setTimeout(() => {
      tag.remove();
    }, 4100);
  }

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  focusHabit(habitId: string | null): void {
    this.cards.forEach((card, id) => {
      if (habitId && id === habitId) {
        card.style.borderColor = 'var(--accent)';
        card.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.25)';
      } else {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }
    });
  }
}
