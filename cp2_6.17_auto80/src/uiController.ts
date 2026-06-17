import { Plant, GardenPlant, WateringRecord, addPlant, deletePlant, recordWatering } from './apiService';
import { createPlantThumbnail } from './plantModel';
import { SceneManager } from './sceneManager';

const COLOR_PALETTE = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1',
  '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e',
  '#6d4c41', '#757575', '#546e7a', '#455a64', '#795548', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
  '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#e91e63', '#66bb6a'
];

export class UIController {
  private sceneManager: SceneManager;
  private plants: Plant[] = [];
  private selectedPlant: GardenPlant | null = null;
  
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private modal: HTMLElement;
  private fpsIndicator: HTMLElement;
  private zoomIndicator: HTMLElement;
  private colorPickerPanel: HTMLElement;
  private previewTooltip: HTMLElement;
  private confirmDialog: HTMLElement;
  
  private currentColor: string = '#8B4513';
  private isPlacing: boolean = false;
  private pendingPlantId: string | null = null;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    
    this.leftPanel = this.createLeftPanel();
    this.rightPanel = this.createRightPanel();
    this.modal = this.createModal();
    this.fpsIndicator = this.createFpsIndicator();
    this.zoomIndicator = this.createZoomIndicator();
    this.colorPickerPanel = this.createColorPickerPanel();
    this.previewTooltip = this.createPreviewTooltip();
    this.confirmDialog = this.createConfirmDialog();
    
    this.setupSceneCallbacks();
    this.setupEventListeners();
  }

  private createLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'left-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '240px',
      height: '100%',
      backgroundColor: '#16213e',
      padding: '20px 16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: '100',
      borderRight: '1px solid #0f3460'
    });

    const title = document.createElement('h2');
    title.textContent = '植物库';
    Object.assign(title.style, {
      color: '#fff',
      fontSize: '18px',
      marginBottom: '16px',
      fontWeight: '600'
    });
    panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = '选择植物开始创建你的花园';
    Object.assign(subtitle.style, {
      color: '#78909c',
      fontSize: '12px',
      marginBottom: '20px'
    });
    panel.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.className = 'plant-grid';
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px'
    });
    panel.appendChild(grid);

    document.body.appendChild(panel);
    return panel;
  }

  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'right-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      right: '-360px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '320px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      boxSizing: 'border-box',
      zIndex: '100',
      transition: 'right 0.3s ease',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
    });
    panel.setAttribute('data-visible', 'false');
    document.body.appendChild(panel);
    return panel;
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    Object.assign(modal.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '1000'
    });

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    Object.assign(modalContent.style, {
      width: '400px',
      height: '280px',
      backgroundColor: '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxSizing: 'border-box',
      transform: 'scale(0.8)',
      opacity: '0',
      transition: 'transform 300ms ease-out, opacity 300ms ease-out'
    });

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    return modal;
  }

  private createFpsIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'fps-indicator';
    Object.assign(indicator.style, {
      position: 'fixed',
      top: '16px',
      right: '20px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#4caf50',
      zIndex: '200',
      boxShadow: '0 0 8px rgba(76, 175, 80, 0.5)'
    });
    document.body.appendChild(indicator);
    return indicator;
  }

  private createZoomIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'zoom-indicator';
    Object.assign(indicator.style, {
      position: 'fixed',
      top: '16px',
      left: '260px',
      fontSize: '14px',
      color: '#78909c',
      zIndex: '200',
      fontWeight: '500'
    });
    indicator.textContent = '缩放: 1.0x';
    document.body.appendChild(indicator);
    return indicator;
  }

  private createColorPickerPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'color-picker-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      display: 'none',
      width: '240px',
      padding: '16px',
      backgroundColor: '#16213e',
      borderRadius: '12px',
      zIndex: '300',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    });

    const title = document.createElement('h3');
    title.textContent = '选择花盆颜色';
    Object.assign(title.style, {
      color: '#fff',
      fontSize: '14px',
      marginBottom: '12px',
      fontWeight: '500'
    });
    panel.appendChild(title);

    const colorGrid = document.createElement('div');
    colorGrid.className = 'color-grid';
    Object.assign(colorGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '8px',
      justifyItems: 'center'
    });

    COLOR_PALETTE.forEach((color, index) => {
      const colorBtn = document.createElement('div');
      colorBtn.className = 'color-swatch';
      colorBtn.setAttribute('data-color', color);
      Object.assign(colorBtn.style, {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: color,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative'
      });

      colorBtn.addEventListener('mouseenter', () => {
        colorBtn.style.transform = 'scale(1.3)';
        colorBtn.title = color;
      });
      colorBtn.addEventListener('mouseleave', () => {
        colorBtn.style.transform = 'scale(1)';
      });
      colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectColor(color);
      });

      colorGrid.appendChild(colorBtn);
    });

    panel.appendChild(colorGrid);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认选择';
    Object.assign(confirmBtn.style, {
      width: '100%',
      marginTop: '16px',
      padding: '10px',
      backgroundColor: '#2196f3',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.backgroundColor = '#1976d2';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.backgroundColor = '#2196f3';
    });
    confirmBtn.addEventListener('click', () => {
      this.confirmColorSelection();
    });
    panel.appendChild(confirmBtn);

    document.body.appendChild(panel);
    return panel;
  }

  private createPreviewTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'plant-preview-tooltip';
    Object.assign(tooltip.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '500',
      opacity: '0.5',
      display: 'none'
    });

    const img = document.createElement('img');
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.borderRadius = '50%';
    tooltip.appendChild(img);

    document.body.appendChild(tooltip);
    return tooltip;
  }

  private createConfirmDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-overlay';
    Object.assign(dialog.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2000'
    });

    const dialogContent = document.createElement('div');
    dialogContent.className = 'confirm-dialog';
    Object.assign(dialogContent.style, {
      width: '320px',
      backgroundColor: '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxSizing: 'border-box',
      textAlign: 'center'
    });

    const title = document.createElement('h3');
    title.textContent = '确认删除';
    Object.assign(title.style, {
      fontSize: '18px',
      color: '#333',
      marginBottom: '12px'
    });
    dialogContent.appendChild(title);

    const message = document.createElement('p');
    message.textContent = '确定要删除这株植物吗？此操作无法撤销。';
    Object.assign(message.style, {
      fontSize: '14px',
      color: '#666',
      marginBottom: '20px',
      lineHeight: '1.5'
    });
    dialogContent.appendChild(message);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      padding: '10px 24px',
      backgroundColor: '#e0e0e0',
      color: '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'transform 0.2s ease'
    });
    cancelBtn.addEventListener('click', () => {
      this.hideConfirmDialog();
    });
    btnContainer.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '删除';
    Object.assign(confirmBtn.style, {
      padding: '10px 24px',
      backgroundColor: '#ef5350',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.backgroundColor = '#c62828';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.backgroundColor = '#ef5350';
    });
    confirmBtn.addEventListener('click', () => {
      this.confirmDelete();
    });
    btnContainer.appendChild(confirmBtn);

    dialogContent.appendChild(btnContainer);
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    return dialog;
  }

  private setupSceneCallbacks(): void {
    this.sceneManager.handleGroundClick((position) => {
      if (this.pendingPlantId) {
        this.addPlantToScene(this.pendingPlantId, position, this.currentColor);
        this.pendingPlantId = null;
        this.hidePreviewTooltip();
      }
    });
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelPlacement();
        this.hideModal();
        this.hideColorPicker();
        this.hideConfirmDialog();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPlacing) {
        this.updatePreviewPosition(e.clientX, e.clientY);
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.colorPickerPanel.contains(target) && 
          !target.closest('.plant-card') &&
          !target.closest('.color-picker-trigger')) {
        this.hideColorPicker();
      }
    });

    window.addEventListener('resize', () => {
      this.adjustLayout();
    });
  }

  private adjustLayout(): void {
    const width = window.innerWidth;
    const minWidth = 1024;
    
    if (width < minWidth) {
      this.leftPanel.style.width = '200px';
      this.rightPanel.style.width = '280px';
      this.zoomIndicator.style.left = '220px';
    } else {
      this.leftPanel.style.width = '240px';
      this.rightPanel.style.width = '320px';
      this.zoomIndicator.style.left = '260px';
    }
  }

  setPlants(plants: Plant[]): void {
    this.plants = plants;
    this.renderPlantGrid();
  }

  private renderPlantGrid(): void {
    const grid = this.leftPanel.querySelector('.plant-grid');
    if (!grid) return;
    
    grid.innerHTML = '';

    this.plants.forEach((plant) => {
      const card = this.createPlantCard(plant);
      grid.appendChild(card);
    });
  }

  private createPlantCard(plant: Plant): HTMLElement {
    const card = document.createElement('div');
    card.className = 'plant-card';
    card.setAttribute('data-plant-id', plant.id);
    Object.assign(card.style, {
      width: '100px',
      height: '120px',
      borderRadius: '8px',
      backgroundColor: '#16213e',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px',
      boxSizing: 'border-box',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });

    const thumbContainer = document.createElement('div');
    Object.assign(thumbContainer.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      overflow: 'hidden',
      marginBottom: '8px',
      backgroundColor: '#0f3460'
    });

    const thumb = document.createElement('img');
    thumb.src = createPlantThumbnail(plant.id);
    thumb.alt = plant.name;
    Object.assign(thumb.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    });
    thumbContainer.appendChild(thumb);
    card.appendChild(thumbContainer);

    const name = document.createElement('div');
    name.textContent = plant.name;
    Object.assign(name.style, {
      color: '#fff',
      fontSize: '13px',
      marginBottom: '4px',
      fontWeight: '500'
    });
    card.appendChild(name);

    const tag = document.createElement('span');
    const lightLabels: Record<string, string> = {
      sunny: '喜阳',
      shady: '喜阴',
      neutral: '中性'
    };
    const lightColors: Record<string, string> = {
      sunny: '#ffb74d',
      shady: '#81d4fa',
      neutral: '#ce93d8'
    };
    tag.textContent = lightLabels[plant.lightPreference] || plant.lightPreference;
    Object.assign(tag.style, {
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: lightColors[plant.lightPreference] || '#9e9e9e',
      color: '#fff',
      fontWeight: '500'
    });
    card.appendChild(tag);

    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = '#0f3460';
      card.style.transform = 'scale(1.05)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = '#16213e';
      card.style.transform = 'scale(1)';
    });

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showColorPicker(plant.id, card);
    });

    return card;
  }

  private showColorPicker(plantId: string, triggerElement: HTMLElement): void {
    const rect = triggerElement.getBoundingClientRect();
    this.colorPickerPanel.style.display = 'block';
    this.colorPickerPanel.style.left = `${rect.left}px`;
    this.colorPickerPanel.style.top = `${rect.bottom + 10}px`;
    
    this.pendingPlantId = plantId;
  }

  private hideColorPicker(): void {
    this.colorPickerPanel.style.display = 'none';
  }

  private selectColor(color: string): void {
    this.currentColor = color;
    
    const swatches = this.colorPickerPanel.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      const el = swatch as HTMLElement;
      if (el.getAttribute('data-color') === color) {
        el.style.boxShadow = `0 0 0 3px #fff, 0 0 0 5px ${color}`;
      } else {
        el.style.boxShadow = 'none';
      }
    });
  }

  private confirmColorSelection(): void {
    if (this.pendingPlantId) {
      this.startPlacingPlant(this.pendingPlantId);
      this.hideColorPicker();
    }
  }

  private startPlacingPlant(plantId: string): void {
    this.isPlacing = true;
    this.sceneManager.startPlacingPlant(plantId, this.currentColor);
    
    const img = this.previewTooltip.querySelector('img');
    if (img) {
      img.src = createPlantThumbnail(plantId);
    }
    this.previewTooltip.style.display = 'block';
  }

  private cancelPlacement(): void {
    this.isPlacing = false;
    this.pendingPlantId = null;
    this.sceneManager.cancelPlacingPlant();
    this.hidePreviewTooltip();
  }

  private updatePreviewPosition(x: number, y: number): void {
    this.previewTooltip.style.left = `${x - 30}px`;
    this.previewTooltip.style.top = `${y - 30}px`;
  }

  private hidePreviewTooltip(): void {
    this.previewTooltip.style.display = 'none';
  }

  private async addPlantToScene(plantId: string, position: { x: number; z: number }, potColor: string): Promise<void> {
    const result = await addPlant(plantId, position, potColor);
    if (result) {
      this.sceneManager.addPlant(result);
    }
  }

  showPlantDetails(plant: GardenPlant): void {
    this.selectedPlant = plant;
    this.renderRightPanel(plant);
    this.rightPanel.style.right = '20px';
    this.rightPanel.setAttribute('data-visible', 'true');
  }

  hidePlantDetails(): void {
    this.selectedPlant = null;
    this.rightPanel.style.right = '-360px';
    this.rightPanel.setAttribute('data-visible', 'false');
  }

  private renderRightPanel(plant: GardenPlant): void {
    this.rightPanel.innerHTML = '';

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px'
    });

    const titleSection = document.createElement('div');
    
    const plantName = document.createElement('h3');
    plantName.textContent = plant.name;
    Object.assign(plantName.style, {
      fontSize: '20px',
      color: '#333',
      marginBottom: '8px',
      fontWeight: '600'
    });
    titleSection.appendChild(plantName);

    const lightStatus = document.createElement('div');
    lightStatus.className = 'light-status';
    Object.assign(lightStatus.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: '#666'
    });

    const lightDot = document.createElement('span');
    Object.assign(lightDot.style, {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: plant.lightPreference === 'sunny' ? '#4caf50' : '#ff9800',
      display: 'inline-block'
    });
    lightStatus.appendChild(lightDot);

    const lightLabels: Record<string, string> = {
      sunny: '光照充足',
      shady: '需要遮阴',
      neutral: '光照适中'
    };
    const lightText = document.createElement('span');
    lightText.textContent = lightLabels[plant.lightPreference] || plant.lightPreference;
    lightStatus.appendChild(lightText);
    titleSection.appendChild(lightStatus);

    header.appendChild(titleSection);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    Object.assign(closeBtn.style, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      color: '#666',
      fontSize: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s ease'
    });
    closeBtn.addEventListener('click', () => {
      this.hidePlantDetails();
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    });
    header.appendChild(closeBtn);

    this.rightPanel.appendChild(header);

    const infoGrid = document.createElement('div');
    Object.assign(infoGrid.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
    });

    const heightInfo = document.createElement('div');
    const heightLabel = document.createElement('div');
    heightLabel.textContent = '当前高度';
    Object.assign(heightLabel.style, {
      fontSize: '12px',
      color: '#999',
      marginBottom: '4px'
    });
    const heightValue = document.createElement('div');
    heightValue.textContent = `${plant.currentHeight.toFixed(1)} cm`;
    Object.assign(heightValue.style, {
      fontSize: '18px',
      color: '#333',
      fontWeight: '600'
    });
    heightInfo.appendChild(heightLabel);
    heightInfo.appendChild(heightValue);
    infoGrid.appendChild(heightInfo);

    const dateInfo = document.createElement('div');
    const dateLabel = document.createElement('div');
    dateLabel.textContent = '添加日期';
    Object.assign(dateLabel.style, {
      fontSize: '12px',
      color: '#999',
      marginBottom: '4px'
    });
    const dateValue = document.createElement('div');
    dateValue.textContent = plant.addedDate;
    Object.assign(dateValue.style, {
      fontSize: '14px',
      color: '#333',
      fontWeight: '500'
    });
    dateInfo.appendChild(dateLabel);
    dateInfo.appendChild(dateValue);
    infoGrid.appendChild(dateInfo);

    this.rightPanel.appendChild(infoGrid);

    const wateringTitle = document.createElement('h4');
    wateringTitle.textContent = '浇水记录';
    Object.assign(wateringTitle.style, {
      fontSize: '15px',
      color: '#333',
      marginBottom: '12px',
      fontWeight: '600'
    });
    this.rightPanel.appendChild(wateringTitle);

    const recordsContainer = document.createElement('div');
    recordsContainer.className = 'watering-records';
    Object.assign(recordsContainer.style, {
      maxHeight: '150px',
      overflowY: 'auto',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });

    const recentRecords = plant.wateringRecords.slice(0, 3);
    if (recentRecords.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.textContent = '暂无浇水记录';
      Object.assign(emptyText.style, {
        fontSize: '13px',
        color: '#999',
        textAlign: 'center',
        padding: '20px 0'
      });
      recordsContainer.appendChild(emptyText);
    } else {
      recentRecords.forEach((record) => {
        const card = this.createWateringRecordCard(record);
        recordsContainer.appendChild(card);
      });
    }

    this.rightPanel.appendChild(recordsContainer);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '10px'
    });

    const waterBtn = document.createElement('button');
    waterBtn.textContent = '记录浇水';
    Object.assign(waterBtn.style, {
      flex: '1',
      padding: '12px',
      backgroundColor: '#42a5f5',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    waterBtn.addEventListener('mouseenter', () => {
      waterBtn.style.backgroundColor = '#2196f3';
      waterBtn.style.transform = 'scale(1.05)';
    });
    waterBtn.addEventListener('mouseleave', () => {
      waterBtn.style.backgroundColor = '#42a5f5';
      waterBtn.style.transform = 'scale(1)';
    });
    waterBtn.addEventListener('mousedown', () => {
      waterBtn.style.transform = 'scale(0.95)';
    });
    waterBtn.addEventListener('mouseup', () => {
      waterBtn.style.transform = 'scale(1.05)';
    });
    waterBtn.addEventListener('click', () => {
      this.showWateringModal();
    });
    btnContainer.appendChild(waterBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    Object.assign(deleteBtn.style, {
      padding: '12px 20px',
      backgroundColor: '#ef5350',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.backgroundColor = '#c62828';
      deleteBtn.style.transform = 'scale(1.05)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.backgroundColor = '#ef5350';
      deleteBtn.style.transform = 'scale(1)';
    });
    deleteBtn.addEventListener('mousedown', () => {
      deleteBtn.style.transform = 'scale(0.95)';
    });
    deleteBtn.addEventListener('mouseup', () => {
      deleteBtn.style.transform = 'scale(1.05)';
    });
    deleteBtn.addEventListener('click', () => {
      this.showConfirmDialog();
    });
    btnContainer.appendChild(deleteBtn);

    this.rightPanel.appendChild(btnContainer);
  }

  private createWateringRecordCard(record: WateringRecord): HTMLElement {
    const card = document.createElement('div');
    card.className = 'watering-record-card';
    Object.assign(card.style, {
      width: '280px',
      height: '60px',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: '10px 12px',
      boxSizing: 'border-box',
      borderLeft: '4px solid #42a5f5',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    });

    const dateText = document.createElement('div');
    dateText.textContent = record.date;
    Object.assign(dateText.style, {
      fontSize: '12px',
      color: '#999',
      marginBottom: '4px'
    });
    card.appendChild(dateText);

    const contentText = document.createElement('div');
    const noteText = record.note.length > 20 ? record.note.substring(0, 20) + '...' : record.note;
    contentText.textContent = `${record.amount}ml - ${noteText || '无备注'}`;
    Object.assign(contentText.style, {
      fontSize: '13px',
      color: '#333',
      fontWeight: '500',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    });
    card.appendChild(contentText);

    return card;
  }

  private showWateringModal(): void {
    const modalContent = this.modal.querySelector('.modal-content');
    if (!modalContent) return;

    modalContent.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '记录浇水';
    Object.assign(title.style, {
      fontSize: '20px',
      color: '#333',
      marginBottom: '20px',
      fontWeight: '600'
    });
    modalContent.appendChild(title);

    const amountLabel = document.createElement('label');
    amountLabel.textContent = '浇水量 (ml)';
    Object.assign(amountLabel.style, {
      display: 'block',
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px'
    });
    modalContent.appendChild(amountLabel);

    const sliderContainer = document.createElement('div');
    Object.assign(sliderContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    });

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '50';
    slider.max = '500';
    slider.step = '10';
    slider.value = '200';
    Object.assign(slider.style, {
      flex: '1',
      cursor: 'pointer'
    });
    sliderContainer.appendChild(slider);

    const amountValue = document.createElement('span');
    amountValue.textContent = '200ml';
    Object.assign(amountValue.style, {
      fontSize: '16px',
      fontWeight: '600',
      color: '#42a5f5',
      minWidth: '60px',
      textAlign: 'right'
    });
    sliderContainer.appendChild(amountValue);

    slider.addEventListener('input', () => {
      amountValue.textContent = `${slider.value}ml`;
    });

    modalContent.appendChild(sliderContainer);

    const noteLabel = document.createElement('label');
    noteLabel.textContent = '备注';
    Object.assign(noteLabel.style, {
      display: 'block',
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px'
    });
    modalContent.appendChild(noteLabel);

    const noteInput = document.createElement('textarea');
    noteInput.maxLength = 100;
    noteInput.placeholder = '添加备注（选填）';
    Object.assign(noteInput.style, {
      width: '100%',
      height: '60px',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      resize: 'none',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s ease'
    });
    noteInput.addEventListener('input', () => {
      charCount.textContent = `${noteInput.value.length}/100`;
      if (noteInput.value.length >= 100) {
        noteInput.style.borderColor = '#f44336';
        charCount.style.color = '#f44336';
      } else {
        noteInput.style.borderColor = '#ddd';
        charCount.style.color = '#999';
      }
    });
    modalContent.appendChild(noteInput);

    const charCount = document.createElement('div');
    charCount.textContent = '0/100';
    Object.assign(charCount.style, {
      textAlign: 'right',
      fontSize: '12px',
      color: '#999',
      marginBottom: '16px'
    });
    modalContent.appendChild(charCount);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      padding: '10px 24px',
      backgroundColor: '#e0e0e0',
      color: '#333',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.transform = 'scale(1.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.transform = 'scale(1)';
    });
    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });
    btnContainer.appendChild(cancelBtn);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = '提交';
    Object.assign(submitBtn.style, {
      padding: '10px 24px',
      backgroundColor: '#42a5f5',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
    submitBtn.addEventListener('mouseenter', () => {
      submitBtn.style.backgroundColor = '#2196f3';
      submitBtn.style.transform = 'scale(1.05)';
    });
    submitBtn.addEventListener('mouseleave', () => {
      submitBtn.style.backgroundColor = '#42a5f5';
      submitBtn.style.transform = 'scale(1)';
    });
    submitBtn.addEventListener('click', async () => {
      if (this.selectedPlant) {
        const result = await recordWatering(
          this.selectedPlant.id,
          parseInt(slider.value),
          noteInput.value
        );
        if (result) {
          this.selectedPlant.wateringRecords.unshift(result);
          this.showPlantDetails(this.selectedPlant);
          this.sceneManager.updatePlantData(this.selectedPlant);
        }
        this.hideModal();
      }
    });
    btnContainer.appendChild(submitBtn);

    modalContent.appendChild(btnContainer);

    this.modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modalContent.style.transform = 'scale(1)';
      modalContent.style.opacity = '1';
    });
  }

  private hideModal(): void {
    const modalContent = this.modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.transform = 'scale(0.8)';
      modalContent.style.opacity = '0';
    }
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  private showConfirmDialog(): void {
    this.confirmDialog.style.display = 'flex';
  }

  private hideConfirmDialog(): void {
    this.confirmDialog.style.display = 'none';
  }

  private async confirmDelete(): Promise<void> {
    if (this.selectedPlant) {
      const success = await deletePlant(this.selectedPlant.id);
      if (success) {
        this.sceneManager.removePlant(this.selectedPlant.id);
        this.hidePlantDetails();
      }
    }
    this.hideConfirmDialog();
  }

  updateFps(fps: number): void {
    if (fps < 30) {
      this.fpsIndicator.style.backgroundColor = '#f44336';
      this.fpsIndicator.style.animation = 'blink 1s infinite';
    } else {
      this.fpsIndicator.style.backgroundColor = '#4caf50';
      this.fpsIndicator.style.animation = 'none';
    }
  }

  updateZoom(zoom: number): void {
    this.zoomIndicator.textContent = `缩放: ${zoom.toFixed(1)}x`;
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  
  * {
    cursor: default;
  }
  
  .plant-card,
  .color-swatch,
  button,
  .fps-indicator,
  input[type="range"],
  textarea {
    cursor: pointer;
  }
  
  textarea {
    cursor: text;
  }
`;
document.head.appendChild(style);
