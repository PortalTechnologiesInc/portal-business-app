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
    } else if (diffInDays < 30) {
      return `in ${Math.floor(diffInDays / 7)} weeks`;
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
