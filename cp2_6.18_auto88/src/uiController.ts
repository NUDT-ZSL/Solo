import { PlantData, GardenPlant, apiService } from './apiService';
import { PlantModelManager } from './plantModel';
import { SceneManager } from './sceneManager';

const COLOR_PALETTE = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#000000',
  '#d32f2f', '#c2185b', '#7b1fa2', '#512da8', '#303f9f',
  '#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c',
  '#689f38', '#afb42b', '#fbc02d', '#ffa000', '#f57c00',
  '#e64a19', '#5d4037', '#616161', '#455a64', '#ffffff'
];

const LIGHT_PREFERENCE_LABELS: Record<string, { text: string; color: string }> = {
  sunny: { text: '喜阳', color: '#ffb74d' },
  shady: { text: '喜阴', color: '#81d4fa' },
  neutral: { text: '中性', color: '#ce93d8' }
};

export class UIController {
  private container: HTMLElement;
  private plantModelManager: PlantModelManager;
  private sceneManager: SceneManager;
  private plantDataList: PlantData[] = [];
  private selectedPlantForPlacement: string | null = null;
  private selectedGardenPlant: GardenPlant | null = null;

  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private colorPickerOverlay!: HTMLElement;
  private wateringModalOverlay!: HTMLElement;
  private confirmDialogOverlay!: HTMLElement;
  private fpsIndicator!: HTMLElement;
  private zoomIndicator!: HTMLElement;
  private placementPreview!: HTMLElement;

  private pendingPosition: { x: number; y: number; z: number } | null = null;
  private pendingPlantId: string | null = null;

  constructor(container: HTMLElement, plantModelManager: PlantModelManager, sceneManager: SceneManager) {
    this.container = container;
    this.plantModelManager = plantModelManager;
    this.sceneManager = sceneManager;

    this.createUI();
    this.setupCallbacks();
    this.loadPlantData();
  }

  private createUI(): void {
    this.createZoomIndicator();
    this.createFPSIndicator();
    this.createLeftPanel();
    this.createRightPanel();
    this.createColorPicker();
    this.createWateringModal();
    this.createConfirmDialog();
    this.createPlacementPreview();
    this.createStyles();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
      }
      
      .interactive {
        cursor: pointer;
        transition: transform 0.2s ease-out;
      }
      
      .interactive:hover {
        transform: scale(1.05);
      }
      
      .interactive:active {
        transform: scale(0.95);
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      .fps-blinking {
        animation: pulse 1s infinite;
      }
      
      @keyframes scaleIn {
        from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      
      .modal-animate {
        animation: scaleIn 0.3s ease-out forwards;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .overlay-animate {
        animation: fadeIn 0.2s ease-out forwards;
      }
      
      .watering-card {
        width: 280px;
        height: 60px;
        border-radius: 8px;
        background: #f5f5f5;
        margin-bottom: 8px;
        padding: 8px 12px;
        border-left: 4px solid #42a5f5;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
      }
      
      .watering-date {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .watering-content {
        font-size: 13px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .plant-thumb {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        margin-bottom: 8px;
      }
      
      .light-tag {
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;
        color: #fff;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }

  private createZoomIndicator(): void {
    this.zoomIndicator = document.createElement('div');
    Object.assign(this.zoomIndicator.style, {
      position: 'fixed',
      top: '20px',
      left: '260px',
      fontSize: '14px',
      color: '#78909c',
      zIndex: '100',
      fontFamily: 'inherit'
    });
    this.zoomIndicator.textContent = '缩放: 1.0x';
    this.container.appendChild(this.zoomIndicator);
  }

  private createFPSIndicator(): void {
    this.fpsIndicator = document.createElement('div');
    Object.assign(this.fpsIndicator.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: '#4caf50',
      zIndex: '100',
      transition: 'background-color 0.3s'
    });
    this.container.appendChild(this.fpsIndicator);
  }

  private createLeftPanel(): void {
    this.leftPanel = document.createElement('div');
    Object.assign(this.leftPanel.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '240px',
      height: '100%',
      backgroundColor: '#16213e',
      padding: '20px 10px',
      overflowY: 'auto',
      zIndex: '50',
      boxShadow: '2px 0 10px rgba(0,0,0,0.3)'
    });

    const title = document.createElement('h2');
    title.textContent = '植物库';
    Object.assign(title.style, {
      color: '#fff',
      fontSize: '18px',
      marginBottom: '16px',
      textAlign: 'center',
      fontWeight: '600'
    });
    this.leftPanel.appendChild(title);

    const grid = document.createElement('div');
    grid.id = 'plant-grid';
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
      justifyItems: 'center'
    });
    this.leftPanel.appendChild(grid);

    this.container.appendChild(this.leftPanel);
  }

  private createRightPanel(): void {
    this.rightPanel = document.createElement('div');
    Object.assign(this.rightPanel.style, {
      position: 'fixed',
      right: '-340px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '320px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      zIndex: '50',
      transition: 'right 0.3s ease-out',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      maxHeight: '80vh',
      overflowY: 'auto'
    });
    this.rightPanel.id = 'detail-panel';
    this.container.appendChild(this.rightPanel);
  }

  private createColorPicker(): void {
    this.colorPickerOverlay = document.createElement('div');
    Object.assign(this.colorPickerOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '200',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center'
    });
    this.colorPickerOverlay.addEventListener('click', (e) => {
      if (e.target === this.colorPickerOverlay) {
        this.hideColorPicker();
      }
    });

    const pickerContainer = document.createElement('div');
    Object.assign(pickerContainer.style, {
      backgroundColor: '#16213e',
      borderRadius: '20px',
      padding: '24px',
      width: '340px'
    });

    const title = document.createElement('h3');
    title.textContent = '选择花盆颜色';
    Object.assign(title.style, {
      color: '#fff',
      fontSize: '16px',
      marginBottom: '16px',
      textAlign: 'center'
    });
    pickerContainer.appendChild(title);

    const colorGrid = document.createElement('div');
    Object.assign(colorGrid.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'center',
      marginBottom: '16px'
    });

    COLOR_PALETTE.forEach((color) => {
      const colorSwatch = document.createElement('div');
      Object.assign(colorSwatch.style, {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: color,
        cursor: 'pointer',
        transition: 'transform 0.2s ease-out',
        border: color === '#ffffff' ? '1px solid #bdbdbd' : 'none',
        position: 'relative'
      });
      colorSwatch.classList.add('interactive');
      colorSwatch.dataset.color = color;

      const tooltip = document.createElement('div');
      tooltip.textContent = color;
      Object.assign(tooltip.style, {
        position: 'absolute',
        bottom: '-24px',
        left: '50%',
        transform: 'translateX(-50%) scale(0.8)',
        backgroundColor: '#323232',
        color: '#fff',
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        opacity: '0',
        transition: 'opacity 0.2s, transform 0.2s',
        pointerEvents: 'none',
        zIndex: '10'
      });
      colorSwatch.appendChild(tooltip);

      colorSwatch.addEventListener('mouseenter', () => {
        colorSwatch.style.transform = 'scale(1.3)';
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateX(-50%) scale(1)';
      });
      colorSwatch.addEventListener('mouseleave', () => {
        colorSwatch.style.transform = 'scale(1)';
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateX(-50%) scale(0.8)';
      });
      colorSwatch.addEventListener('click', () => this.onColorSelected(color));

      colorGrid.appendChild(colorSwatch);
    });
    pickerContainer.appendChild(colorGrid);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      width: '100%',
      padding: '10px',
      backgroundColor: '#616161',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    });
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.backgroundColor = '#424242';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.backgroundColor = '#616161';
    });
    cancelBtn.addEventListener('click', () => this.hideColorPicker());
    pickerContainer.appendChild(cancelBtn);

    this.colorPickerOverlay.appendChild(pickerContainer);
    this.container.appendChild(this.colorPickerOverlay);
  }

  private createWateringModal(): void {
    this.wateringModalOverlay = document.createElement('div');
    Object.assign(this.wateringModalOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '300',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center'
    });

    const modal = document.createElement('div');
    modal.id = 'watering-modal';
    Object.assign(modal.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '400px',
      height: '280px',
      backgroundColor: '#fff',
      borderRadius: '20px',
      padding: '24px',
      transform: 'translate(-50%, -50%) scale(0.5)',
      opacity: '0'
    });

    const title = document.createElement('h3');
    title.textContent = '记录浇水';
    Object.assign(title.style, {
      fontSize: '18px',
      marginBottom: '20px',
      color: '#333'
    });
    modal.appendChild(title);

    const amountLabel = document.createElement('label');
    amountLabel.textContent = '浇水量 (ml):';
    Object.assign(amountLabel.style, {
      display: 'block',
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px'
    });
    modal.appendChild(amountLabel);

    const amountContainer = document.createElement('div');
    Object.assign(amountContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    });

    const amountSlider = document.createElement('input');
    amountSlider.type = 'range';
    amountSlider.min = '50';
    amountSlider.max = '500';
    amountSlider.step = '10';
    amountSlider.value = '200';
    amountSlider.id = 'water-amount-slider';
    Object.assign(amountSlider.style, {
      flex: '1',
      accentColor: '#42a5f5'
    });
    amountContainer.appendChild(amountSlider);

    const amountValue = document.createElement('span');
    amountValue.textContent = '200 ml';
    amountValue.id = 'water-amount-value';
    Object.assign(amountValue.style, {
      fontSize: '14px',
      fontWeight: '600',
      color: '#42a5f5',
      minWidth: '60px',
      textAlign: 'right'
    });
    amountContainer.appendChild(amountValue);

    amountSlider.addEventListener('input', () => {
      amountValue.textContent = `${amountSlider.value} ml`;
    });
    modal.appendChild(amountContainer);

    const noteLabel = document.createElement('label');
    noteLabel.textContent = '备注:';
    Object.assign(noteLabel.style, {
      display: 'block',
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px'
    });
    modal.appendChild(noteLabel);

    const noteInput = document.createElement('textarea');
    noteInput.placeholder = '输入备注信息（最多100字）';
    noteInput.maxLength = 100;
    noteInput.id = 'water-note-input';
    Object.assign(noteInput.style, {
      width: '100%',
      height: '60px',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      resize: 'none',
      outline: 'none',
      transition: 'border-color 0.2s',
      fontFamily: 'inherit'
    });
    noteInput.addEventListener('input', () => {
      if (noteInput.value.length > 100) {
        noteInput.style.borderColor = '#f44336';
      } else {
        noteInput.style.borderColor = '#ddd';
      }
      charCount.textContent = `${noteInput.value.length}/100`;
    });
    modal.appendChild(noteInput);

    const charCount = document.createElement('div');
    charCount.textContent = '0/100';
    charCount.id = 'char-count';
    Object.assign(charCount.style, {
      fontSize: '12px',
      color: '#999',
      textAlign: 'right',
      marginTop: '4px',
      marginBottom: '16px'
    });
    modal.appendChild(charCount);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '12px'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      flex: '1',
      padding: '10px',
      backgroundColor: '#e0e0e0',
      color: '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    });
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.backgroundColor = '#bdbdbd';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.backgroundColor = '#e0e0e0';
    });
    cancelBtn.addEventListener('click', () => this.hideWateringModal());
    btnContainer.appendChild(cancelBtn);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = '提交';
    Object.assign(submitBtn.style, {
      flex: '1',
      padding: '10px',
      backgroundColor: '#42a5f5',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    });
    submitBtn.addEventListener('mouseenter', () => {
      submitBtn.style.backgroundColor = '#1e88e5';
    });
    submitBtn.addEventListener('mouseleave', () => {
      submitBtn.style.backgroundColor = '#42a5f5';
    });
    submitBtn.addEventListener('click', () => this.submitWatering());
    btnContainer.appendChild(submitBtn);

    modal.appendChild(btnContainer);
    this.wateringModalOverlay.appendChild(modal);
    this.container.appendChild(this.wateringModalOverlay);
  }

  private createConfirmDialog(): void {
    this.confirmDialogOverlay = document.createElement('div');
    Object.assign(this.confirmDialogOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '400',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center'
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      backgroundColor: '#fff',
      borderRadius: '16px',
      padding: '24px',
      width: '300px',
      textAlign: 'center'
    });

    const message = document.createElement('p');
    message.textContent = '确定要删除这株植物吗？';
    message.id = 'confirm-message';
    Object.assign(message.style, {
      fontSize: '16px',
      color: '#333',
      marginBottom: '20px'
    });
    dialog.appendChild(message);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '12px'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      flex: '1',
      padding: '10px',
      backgroundColor: '#e0e0e0',
      color: '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    });
    cancelBtn.addEventListener('click', () => this.hideConfirmDialog());
    btnContainer.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定删除';
    confirmBtn.id = 'confirm-delete-btn';
    Object.assign(confirmBtn.style, {
      flex: '1',
      padding: '10px',
      backgroundColor: '#ef5350',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s'
    });
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.backgroundColor = '#c62828';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.backgroundColor = '#ef5350';
    });
    confirmBtn.addEventListener('click', () => this.confirmDelete());
    btnContainer.appendChild(confirmBtn);

    dialog.appendChild(btnContainer);
    this.confirmDialogOverlay.appendChild(dialog);
    this.container.appendChild(this.confirmDialogOverlay);
  }

  private createPlacementPreview(): void {
    this.placementPreview = document.createElement('div');
    Object.assign(this.placementPreview.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '150',
      display: 'none',
      opacity: '0.5',
      fontSize: '32px',
      transform: 'translate(-30px, -30px)'
    });
    this.container.appendChild(this.placementPreview);
  }

  private setupCallbacks(): void {
    this.sceneManager.setSelectionCallback((plant) => this.onPlantSelected(plant));
    this.sceneManager.setFPSUpdateCallback((fps) => this.onFPSUpdate(fps));

    document.addEventListener('mousemove', (e) => {
      if (this.sceneManager.isInPlacementMode()) {
        this.placementPreview.style.left = `${e.clientX}px`;
        this.placementPreview.style.top = `${e.clientY}px`;
      }
    });

    setInterval(() => {
      this.zoomIndicator.textContent = `缩放: ${this.sceneManager.getCurrentZoom().toFixed(1)}x`;
    }, 100);
  }

  private async loadPlantData(): void {
    this.plantDataList = await this.plantModelManager.loadPlantData();
    this.renderPlantCards();
  }

  private getPlantEmoji(plantId: string): string {
    const emojiMap: Record<string, string> = {
      succulent: '🌵',
      fern: '🌿',
      monstera: '🍃',
      cactus: '🌵',
      rose: '🌹',
      lavender: '💜'
    };
    return emojiMap[plantId] || '🌱';
  }

  private renderPlantCards(): void {
    const grid = this.leftPanel.querySelector('#plant-grid') as HTMLElement;
    grid.innerHTML = '';

    this.plantDataList.forEach((plant) => {
      const card = document.createElement('div');
      card.classList.add('interactive');
      Object.assign(card.style, {
        width: '100px',
        height: '120px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'background-color 0.2s, transform 0.2s ease-out'
      });
      card.addEventListener('mouseenter', () => {
        card.style.backgroundColor = '#0f3460';
      });
      card.addEventListener('mouseleave', () => {
        card.style.backgroundColor = '#16213e';
      });
      card.addEventListener('click', () => this.onPlantCardClick(plant.id));

      const thumb = document.createElement('div');
      thumb.className = 'plant-thumb';
      thumb.style.backgroundColor = plant.color + '40';
      thumb.textContent = this.getPlantEmoji(plant.id);
      card.appendChild(thumb);

      const name = document.createElement('div');
      name.textContent = plant.name;
      Object.assign(name.style, {
        color: '#fff',
        fontSize: '13px',
        marginBottom: '4px'
      });
      card.appendChild(name);

      const lightTag = document.createElement('span');
      lightTag.className = 'light-tag';
      const pref = LIGHT_PREFERENCE_LABELS[plant.lightPreference];
      lightTag.textContent = pref.text;
      lightTag.style.backgroundColor = pref.color;
      card.appendChild(lightTag);

      grid.appendChild(card);
    });
  }

  private onPlantCardClick(plantId: string): void {
    if (this.sceneManager.isInPlacementMode()) {
      this.sceneManager.cancelPlacement();
    }

    this.selectedPlantForPlacement = plantId;
    const plant = this.plantModelManager.getPlantDataById(plantId);
    if (plant) {
      this.placementPreview.textContent = this.getPlantEmoji(plantId);
      this.placementPreview.style.display = 'block';
    }

    this.sceneManager.startPlacement(plantId, (position) => {
      this.pendingPosition = position;
      this.pendingPlantId = plantId;
      this.placementPreview.style.display = 'none';
      this.showColorPicker();
    });
  }

  private showColorPicker(): void {
    this.colorPickerOverlay.style.display = 'flex';
    this.colorPickerOverlay.classList.add('overlay-animate');
  }

  private hideColorPicker(): void {
    this.colorPickerOverlay.style.display = 'none';
    this.colorPickerOverlay.classList.remove('overlay-animate');
    this.pendingPosition = null;
    this.pendingPlantId = null;
  }

  private async onColorSelected(color: string): Promise<void> {
    if (!this.pendingPosition || !this.pendingPlantId) return;

    this.hideColorPicker();
    const newPlant = await this.sceneManager.addPlant(
      this.pendingPlantId,
      this.pendingPosition,
      color
    );

    this.pendingPosition = null;
    this.pendingPlantId = null;
    this.selectedPlantForPlacement = null;
  }

  private onPlantSelected(plant: GardenPlant | null): void {
    this.selectedGardenPlant = plant;
    this.updateRightPanel();
  }

  private updateRightPanel(): void {
    if (!this.selectedGardenPlant) {
      this.rightPanel.style.right = '-340px';
      return;
    }

    const plantData = this.plantModelManager.getPlantDataById(this.selectedGardenPlant.plantId);
    if (!plantData) return;

    this.rightPanel.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '16px',
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666',
      transition: 'color 0.2s'
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#333';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#666';
    });
    closeBtn.addEventListener('click', () => {
      this.selectedGardenPlant = null;
      this.updateRightPanel();
    });
    this.rightPanel.appendChild(closeBtn);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    });

    const icon = document.createElement('div');
    icon.textContent = this.getPlantEmoji(this.selectedGardenPlant.plantId);
    Object.assign(icon.style, {
      fontSize: '40px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: plantData.color + '30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    header.appendChild(icon);

    const nameAndLight = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = plantData.name;
    Object.assign(name.style, {
      fontSize: '18px',
      color: '#333',
      margin: '0 0 4px 0'
    });
    nameAndLight.appendChild(name);

    const lightTag = document.createElement('span');
    lightTag.className = 'light-tag';
    const pref = LIGHT_PREFERENCE_LABELS[plantData.lightPreference];
    lightTag.textContent = pref.text;
    lightTag.style.backgroundColor = pref.color;
    nameAndLight.appendChild(lightTag);
    header.appendChild(nameAndLight);
    this.rightPanel.appendChild(header);

    const infoGrid = document.createElement('div');
    Object.assign(infoGrid.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '20px'
    });

    const heightItem = this.createInfoItem('当前高度', `${this.selectedGardenPlant.currentHeight.toFixed(1)} cm`);
    const dateItem = this.createInfoItem('添加日期', this.selectedGardenPlant.addedDate);
    infoGrid.appendChild(heightItem);
    infoGrid.appendChild(dateItem);

    const lightStatus = this.createLightStatusItem(plantData.lightPreference);
    Object.assign(lightStatus.style, {
      gridColumn: '1 / -1'
    });
    infoGrid.appendChild(lightStatus);
    this.rightPanel.appendChild(infoGrid);

    const wateringHeader = document.createElement('div');
    Object.assign(wateringHeader.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    });

    const wateringTitle = document.createElement('h4');
    wateringTitle.textContent = '最近浇水记录';
    Object.assign(wateringTitle.style, {
      fontSize: '14px',
      color: '#333',
      margin: '0'
    });
    wateringHeader.appendChild(wateringTitle);

    const recordBtn = document.createElement('button');
    recordBtn.textContent = '+ 记录浇水';
    recordBtn.classList.add('interactive');
    Object.assign(recordBtn.style, {
      padding: '6px 12px',
      backgroundColor: '#42a5f5',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer'
    });
    recordBtn.addEventListener('click', () => this.showWateringModal());
    wateringHeader.appendChild(recordBtn);
    this.rightPanel.appendChild(wateringHeader);

    const recordsContainer = document.createElement('div');
    recordsContainer.id = 'watering-records';
    const records = this.selectedGardenPlant.wateringRecords || [];
    if (records.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.textContent = '暂无浇水记录';
      Object.assign(emptyText.style, {
        color: '#999',
        fontSize: '13px',
        textAlign: 'center',
        padding: '20px 0'
      });
      recordsContainer.appendChild(emptyText);
    } else {
      records.slice(0, 3).forEach((record) => {
        const card = this.createWateringCard(record);
        recordsContainer.appendChild(card);
      });
    }
    this.rightPanel.appendChild(recordsContainer);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除植物';
    deleteBtn.classList.add('interactive');
    Object.assign(deleteBtn.style, {
      width: '100%',
      padding: '12px',
      backgroundColor: '#ef5350',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer',
      marginTop: '16px',
      transition: 'background-color 0.2s'
    });
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.backgroundColor = '#c62828';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.backgroundColor = '#ef5350';
    });
    deleteBtn.addEventListener('click', () => this.showConfirmDialog());
    this.rightPanel.appendChild(deleteBtn);

    this.rightPanel.style.right = '20px';
  }

  private createInfoItem(label: string, value: string): HTMLElement {
    const item = document.createElement('div');
    Object.assign(item.style, {
      backgroundColor: '#f5f5f5',
      padding: '12px',
      borderRadius: '8px'
    });

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      fontSize: '12px',
      color: '#999',
      marginBottom: '4px'
    });
    item.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.textContent = value;
    Object.assign(valueEl.style, {
      fontSize: '16px',
      color: '#333',
      fontWeight: '600'
    });
    item.appendChild(valueEl);

    return item;
  }

  private createLightStatusItem(preference: string): HTMLElement {
    const item = document.createElement('div');
    Object.assign(item.style, {
      backgroundColor: '#f5f5f5',
      padding: '12px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    const dot = document.createElement('div');
    Object.assign(dot.style, {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#4caf50'
    });
    item.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = '光照状态：';
    Object.assign(label.style, {
      fontSize: '13px',
      color: '#666'
    });
    item.appendChild(label);

    const value = document.createElement('span');
    value.textContent = preference === 'sunny' ? '充足' : preference === 'shady' ? '正常' : '正常';
    Object.assign(value.style, {
      fontSize: '13px',
      color: '#333',
      fontWeight: '500'
    });
    item.appendChild(value);

    return item;
  }

  private createWateringCard(record: { date: string; amount: number; note: string }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'watering-card';

    const date = document.createElement('div');
    date.className = 'watering-date';
    date.textContent = record.date;
    card.appendChild(date);

    const content = document.createElement('div');
    content.className = 'watering-content';
    const noteText = record.note.length > 20 ? record.note.substring(0, 20) + '...' : record.note;
    content.textContent = `${record.amount}ml${noteText ? ' - ' + noteText : ''}`;
    card.appendChild(content);

    return card;
  }

  private showWateringModal(): void {
    const modal = this.wateringModalOverlay.querySelector('#watering-modal') as HTMLElement;
    const slider = this.wateringModalOverlay.querySelector('#water-amount-slider') as HTMLInputElement;
    const value = this.wateringModalOverlay.querySelector('#water-amount-value') as HTMLElement;
    const note = this.wateringModalOverlay.querySelector('#water-note-input') as HTMLTextAreaElement;
    const charCount = this.wateringModalOverlay.querySelector('#char-count') as HTMLElement;

    slider.value = '200';
    value.textContent = '200 ml';
    note.value = '';
    note.style.borderColor = '#ddd';
    charCount.textContent = '0/100';

    this.wateringModalOverlay.style.display = 'flex';
    this.wateringModalOverlay.classList.add('overlay-animate');

    modal.classList.remove('modal-animate');
    void modal.offsetWidth;
    modal.classList.add('modal-animate');
  }

  private hideWateringModal(): void {
    this.wateringModalOverlay.style.display = 'none';
    this.wateringModalOverlay.classList.remove('overlay-animate');
  }

  private async submitWatering(): Promise<void> {
    if (!this.selectedGardenPlant) return;

    const slider = this.wateringModalOverlay.querySelector('#water-amount-slider') as HTMLInputElement;
    const note = this.wateringModalOverlay.querySelector('#water-note-input') as HTMLTextAreaElement;

    const amount = parseInt(slider.value);
    const noteText = note.value.trim();

    if (noteText.length > 100) return;

    const record = await apiService.recordWatering(this.selectedGardenPlant.id, amount, noteText);
    if (record) {
      this.sceneManager.addWateringRecord(this.selectedGardenPlant.id, record);
      this.sceneManager.updatePlantHeight(
        this.selectedGardenPlant.id,
        this.selectedGardenPlant.currentHeight + 0.5
      );
      this.hideWateringModal();
      this.updateRightPanel();
    }
  }

  private showConfirmDialog(): void {
    this.confirmDialogOverlay.style.display = 'flex';
    this.confirmDialogOverlay.classList.add('overlay-animate');
  }

  private hideConfirmDialog(): void {
    this.confirmDialogOverlay.style.display = 'none';
    this.confirmDialogOverlay.classList.remove('overlay-animate');
  }

  private async confirmDelete(): Promise<void> {
    if (!this.selectedGardenPlant) return;

    const success = await this.sceneManager.deletePlant(this.selectedGardenPlant.id);
    if (success) {
      this.selectedGardenPlant = null;
      this.hideConfirmDialog();
      this.updateRightPanel();
    }
  }

  private onFPSUpdate(fps: number): void {
    if (fps < 30) {
      this.fpsIndicator.style.backgroundColor = '#f44336';
      this.fpsIndicator.classList.add('fps-blinking');
    } else {
      this.fpsIndicator.style.backgroundColor = '#4caf50';
      this.fpsIndicator.classList.remove('fps-blinking');
    }
  }

  public dispose(): void {
    this.leftPanel.remove();
    this.rightPanel.remove();
    this.colorPickerOverlay.remove();
    this.wateringModalOverlay.remove();
    this.confirmDialogOverlay.remove();
    this.fpsIndicator.remove();
    this.zoomIndicator.remove();
    this.placementPreview.remove();
  }
}
