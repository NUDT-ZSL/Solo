import { DataSource } from './fetchData';
import { saveLayout, loadLayout, DashLayout } from './storageUtils';

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function saveOrderToStorage(dataSources: DataSource[]): void {
  const layout: DashLayout = {
    order: dataSources.map(ds => ds.id)
  };
  saveLayout(layout);
}

export function loadOrderFromStorage(dataSources: DataSource[]): DataSource[] {
  const layout = loadLayout();
  if (!layout || !layout.order || layout.order.length === 0) {
    return dataSources;
  }
  
  const ordered: DataSource[] = [];
  const remaining = [...dataSources];
  
  for (const id of layout.order) {
    const index = remaining.findIndex(ds => ds.id === id);
    if (index !== -1) {
      ordered.push(remaining[index]);
      remaining.splice(index, 1);
    }
  }
  
  return [...ordered, ...remaining];
}
