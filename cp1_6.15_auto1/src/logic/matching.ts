import { Caregiver, FilterCriteria, MatchResult, ServiceType, PetType } from '../types';
import { api } from '../data/api';

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function isDateAvailable(caregiver: Caregiver, dateStr: string): boolean {
  return !caregiver.bookedDates.includes(dateStr);
}

function findNearestAvailableDate(caregiver: Caregiver, fromDate?: string): string {
  const today = fromDate ? new Date(fromDate) : new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (isDateAvailable(caregiver, dateStr)) {
      return dateStr;
    }
  }
  return '';
}

function calculateScore(
  caregiver: Caregiver,
  criteria: FilterCriteria,
  requestedDates: string[]
): { score: number; matchedServices: ServiceType[] } {
  let score = 0;
  const matchedServices: ServiceType[] = [];

  score += caregiver.rating * 20;
  score += Math.min(caregiver.servedCount / 10, 20);

  if (criteria.petType) {
    if (caregiver.acceptedPets.includes(criteria.petType)) {
      score += 25;
    } else {
      return { score: -1, matchedServices: [] };
    }
  }

  if (criteria.serviceType) {
    const service = caregiver.services.find(s => s.type === criteria.serviceType);
    if (service) {
      score += 25;
      matchedServices.push(criteria.serviceType);
    } else {
      return { score: -1, matchedServices: [] };
    }
  } else {
    matchedServices.push(...caregiver.services.map(s => s.type));
  }

  if (requestedDates.length > 0) {
    let allAvailable = true;
    for (const date of requestedDates) {
      if (!isDateAvailable(caregiver, date)) {
        allAvailable = false;
        break;
      }
    }
    if (allAvailable) {
      score += 30;
    } else {
      score -= 20;
    }
  }

  if (criteria.minRating !== undefined && caregiver.rating < criteria.minRating) {
    score -= 50;
  }

  return { score, matchedServices };
}

export async function matchCaregivers(criteria: FilterCriteria): Promise<MatchResult[]> {
  const caregivers = await api.getCaregivers();

  const requestedDates: string[] = [];
  if (criteria.startDate && criteria.endDate) {
    requestedDates.push(...getDateRange(criteria.startDate, criteria.endDate));
  }

  const results: MatchResult[] = [];

  for (const caregiver of caregivers) {
    const { score, matchedServices } = calculateScore(caregiver, criteria, requestedDates);

    if (score >= 0 && (matchedServices.length > 0 || !criteria.serviceType)) {
      if (criteria.petType && !caregiver.acceptedPets.includes(criteria.petType)) {
        continue;
      }
      if (criteria.minRating !== undefined && caregiver.rating < criteria.minRating) {
        continue;
      }

      results.push({
        caregiver,
        score,
        nearestAvailableDate: findNearestAvailableDate(caregiver, criteria.startDate),
        matchedServices
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}

export function getServicePrice(caregiver: Caregiver, serviceType: ServiceType): number | null {
  const service = caregiver.services.find(s => s.type === serviceType);
  return service ? service.price : null;
}

export function filterByPetType(caregivers: Caregiver[], petType: PetType): Caregiver[] {
  return caregivers.filter(c => c.acceptedPets.includes(petType));
}
