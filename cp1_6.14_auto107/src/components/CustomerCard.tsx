import React, { useState, useEffect } from 'react';
import { customerApi } from '../http';
import type { Customer, PointLog, CustomerLevel } from '../types';

interface CustomerCardProps {
  customer: Customer;
  onConsume?: (customerId: string, amount: number) => void;
}

const levelConfig: Record<
  CustomerLevel,
  { label: string; color: string; bgColor: string }
> = {
  bronze: { label: '青铜', color: '#fff', bgColor: '#e67e22' },
  silver: { label: '白银', color: '#fff', bgColor: '#3498db' },
  gold: { label: '黄金', color: '#fff', bgColor: '#f1c40f' },
  diamond: { label: '钻石', color: '#fff', bgColor: '#bdc3c7' },
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '暂无消费';
  const date = new Date(dateStr);
  const now = new Date();
  const diff =