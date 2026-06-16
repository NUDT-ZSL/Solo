import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CoffeeBean, RoastBatch, FilterOptions, CreateBatchRequest, StatsData } from './types';
import { BeanManager } from './beans/BeanManager';
import { apiClient } from './api/client';
import Sidebar from './components/Sidebar';
import BeanList from './components/BeanList';
import BatchForm from './components/BatchForm';
import BatchList from './components/BatchList';
import StatsCharts from './components/StatsCharts';
import InventoryAlert, { type InventoryAlertItem } from './components/InventoryAlert';

const App: React.FC = () => {
  const [beans, setBeans] = useState<CoffeeBean[]>([]);
  const [batches, setBatches] = useState<RoastBatch[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [preselectedBeanId, setPreselectedBeanId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    roastLevels: [],
    startDate: null,
    endDate: null,
    searchTerm: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [beansData, batchesData, statsData] = await Promise.all([
        apiClient.getBeans(),
        apiClient.getBatches(),
        apiClient.getStats(),
      ]);
      setBeans(beansData);
      setBatches(batchesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inventoryAlerts: InventoryAlertItem[] = useMemo(() => {
    return BeanManager.checkInventory(beans).map(alert => ({
      beanId: alert.beanId,
      beanName: alert.beanName,
      currentStock: alert.currentStock,
      message: alert.message,
    }));
  }, [beans]);

  const handleOpenNewBatchForm = useCallback((beanId?: string) => {
    if (beanId) {
      setPreselectedBeanId(beanId);
    } else {
      setPreselectedBeanId(null);
    }
    setIsBatchFormOpen(true);
  }, []);

  const handleCloseBatchForm = useCallback(() => {
    setIsBatchFormOpen(false);
    setPreselectedBeanId(null);
  }, []);

  const handleSubmitBatch = useCallback(async (data: CreateBatchRequest) => {
    try {
      const startTime = performance.now();
      await apiClient.createBatch(data);
      const [beansData, batchesData, statsData] = await Promise.all([
        apiClient.getBeans(),
        apiClient.getBatches(),
        apiClient.getStats(),
      ]);
      setBeans(beansData);
      setBatches(batchesData);
      setStats(statsData);
      const endTime = performance.now();
      console.log(`Batch list updated in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to create batch:', error);
    }
  }, []);

  const handleAlertClick = useCallback((beanId: string) => {
    console.log('Navigating to bean:', beanId);
  }, []);

  return (
    <div className="app-container">
      <Sidebar onNewBatch={() => handleOpenNewBatchForm()} />

      <main className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">加载数据中...</div>
          </div>
        ) : (
          <>
            <BeanList
              beans={beans}
              onNewBatch={handleOpenNewBatchForm}
            />

            <BatchList
              batches={batches}
              filters={filters}
              onFilterChange={setFilters}
            />

            <StatsCharts stats={stats} />
          </>
        )}
      </main>

      <InventoryAlert
        alerts={inventoryAlerts}
        onAlertClick={handleAlertClick}
      />

      <BatchForm
        isOpen={isBatchFormOpen}
        beans={beans}
        preselectedBeanId={preselectedBeanId}
        onClose={handleCloseBatchForm}
        onSubmit={handleSubmitBatch}
      />
    </div>
  );
};

export default App;
