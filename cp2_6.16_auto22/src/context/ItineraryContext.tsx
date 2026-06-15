import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Activity {
  id: string;
  time: string;
  name: string;
  location: string;
  cost: number;
  lat: number;
  lng: number;
  period: string;
}

export interface DayItinerary {
  day: number;
  date: string;
  totalBudget: number;
  actualCost: number;
  accommodationCost: number;
  transportCost: number;
  activities: Activity[];
}

export interface ItineraryData {
  id: string;
  budget: number;
  days: number;
  preference: string;
  totalCost: number;
  itineraries: DayItinerary[];
}

interface ItineraryContextType {
  itinerary: ItineraryData | null;
  selectedDay: number;
  expandedDays: number[];
  setItinerary: (data: ItineraryData | null) => void;
  setSelectedDay: (day: number) => void;
  toggleDayExpanded: (day: number) => void;
  deleteActivity: (dayIndex: number, activityId: string) => void;
  reorderDays: (fromIndex: number, toIndex: number) => void;
  reorderActivities: (dayIndex: number, fromIndex: number, toIndex: number) => void;
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

export const ItineraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  const toggleDayExpanded = useCallback((day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }, []);

  const deleteActivity = useCallback((dayIndex: number, activityId: string) => {
    setItinerary(prev => {
      if (!prev) return null;
      const newItineraries = [...prev.itineraries];
      const day = { ...newItineraries[dayIndex] };
      const activityToDelete = day.activities.find(a => a.id === activityId);
      day.activities = day.activities.filter(a => a.id !== activityId);
      if (activityToDelete) {
        day.actualCost = Math.round((day.actualCost - activityToDelete.cost) * 100) / 100;
      }
      newItineraries[dayIndex] = day;
      
      const totalCost = newItineraries.reduce((sum, d) => sum + d.actualCost, 0);
      
      return {
        ...prev,
        itineraries: newItineraries,
        totalCost: Math.round(totalCost * 100) / 100
      };
    });
  }, []);

  const reorderDays = useCallback((fromIndex: number, toIndex: number) => {
    setItinerary(prev => {
      if (!prev) return null;
      const newItineraries = [...prev.itineraries];
      const [removed] = newItineraries.splice(fromIndex, 1);
      newItineraries.splice(toIndex, 0, removed);
      
      newItineraries.forEach((day, index) => {
        day.day = index + 1;
        day.date = `第${index + 1}天`;
      });
      
      return {
        ...prev,
        itineraries: newItineraries
      };
    });
  }, []);

  const reorderActivities = useCallback((dayIndex: number, fromIndex: number, toIndex: number) => {
    setItinerary(prev => {
      if (!prev) return null;
      const newItineraries = [...prev.itineraries];
      const day = { ...newItineraries[dayIndex] };
      const activities = [...day.activities];
      const [removed] = activities.splice(fromIndex, 1);
      activities.splice(toIndex, 0, removed);
      day.activities = activities;
      newItineraries[dayIndex] = day;
      
      return {
        ...prev,
        itineraries: newItineraries
      };
    });
  }, []);

  return (
    <ItineraryContext.Provider
      value={{
        itinerary,
        selectedDay,
        expandedDays,
        setItinerary,
        setSelectedDay,
        toggleDayExpanded,
        deleteActivity,
        reorderDays,
        reorderActivities
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
};

export const useItinerary = (): ItineraryContextType => {
  const context = useContext(ItineraryContext);
  if (!context) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
};
