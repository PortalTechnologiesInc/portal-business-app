import { Frequency } from "./models/Subscription";

// Convert cents to dollars by dividing by 100 and fix to 2 decimal places
export function formatCentsToCurrency(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return dollars;
}

// Format date to display relative time (e.g., "1 hour ago", "in 5 days")
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMilliseconds = date.getTime() - now.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Past
  if (diffInMilliseconds < 0) {
    if (diffInMinutes > -60) {
      return `${Math.abs(diffInMinutes)} ${Math.abs(diffInMinutes) === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInHours > -24) {
      return `${Math.abs(diffInHours)} ${Math.abs(diffInHours) === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDays > -7) {
      return `${Math.abs(diffInDays)} ${Math.abs(diffInDays) === 1 ? 'day' : 'days'} ago`;
    }
  }
  // Future
  else {
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Tomorrow';
    } else if (diffInDays < 7) {
      return `in ${diffInDays} days`;
    } else if (diffInDays < 14) {
      return `in 1 week`;
    } else if (diffInDays < 30) {
      return `in ${Math.floor(diffInDays / 7)} weeks`;
    } else if (diffInDays < 60) {
      return `in 1 month`;
    } else {
      return `in ${Math.floor(diffInDays / 30)} months`;
    }
  }

  // Default format for dates far in past or future
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format day of week and date (e.g., "Monday 21/04/2025")
export function formatDayAndDate(date: Date): string {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${dayOfWeek} ${day}/${month}/${year}`;
}

export function getNextRecurrenceDay(
  startDate: Date,
  freq: Frequency,
  today: Date = new Date()
): string {
  // Clone to avoid mutating inputs
  let next = new Date(startDate);

  // bump until strictly after today
  const advance = () => {
    switch (freq) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  };

  // If the start date is already past, advance until it's > today
  while (next <= today) {
    advance();
  }

  // compute raw difference in milliseconds
  const diffMs = next.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const unit = diffDays === 1 ? 'day' : 'days';

  return `${diffDays} ${unit}`;
}

export function getRemainingRecurrenceCount(
  startDate: Date,
  freq: Frequency,
  recurrenceCount: number,
  today: Date = new Date()
): number {
  // Clone to avoid mutating inputs
  let next = new Date(startDate);

  // bump until strictly after today
  const advance = () => {
    switch (freq) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  };

  var pastRecurrenceCount = 0;
  // If the start date is already past, advance until it's > today
  while (next <= today) {
    advance();
    pastRecurrenceCount++
  }

  return recurrenceCount - pastRecurrenceCount;
}