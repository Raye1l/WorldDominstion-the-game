export const getCountryColor = (colorClass: string): string => {
  if (colorClass.includes('bg-blue-600')) return '#3b82f6';
  if (colorClass.includes('bg-red-600')) return '#ef4444';
  if (colorClass.includes('bg-yellow-500')) return '#eab308';
  if (colorClass.includes('bg-indigo-800')) return '#4f46e5';
  if (colorClass.includes('bg-stone-800')) return '#57534e';
  if (colorClass.includes('bg-blue-400')) return '#60a5fa';
  if (colorClass.includes('bg-white')) return '#f87171';
  if (colorClass.includes('bg-red-500')) return '#f43f5e';
  if (colorClass.includes('bg-teal-600')) return '#14b8a6';
  if (colorClass.includes('bg-red-800')) return '#991b1b';
  if (colorClass.includes('bg-cyan-700')) return '#0ea5e9';
  if (colorClass.includes('bg-yellow-400')) return '#facc15';
  if (colorClass.includes('bg-red-700')) return '#b91c1c';
  return '#9ca3af';
};
