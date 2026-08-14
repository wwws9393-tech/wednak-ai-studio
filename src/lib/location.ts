export const formatAreaWithCity = (location?: string | null, city?: string | null) => {
  const area = (location || '').trim();
  const governorate = (city || '').trim();

  if (!area && !governorate) return 'العراق';
  if (!area) return governorate;
  if (!governorate) return area;

  const normalizedArea = area.replace(/\s+/g, ' ').toLocaleLowerCase('ar-IQ');
  const normalizedGovernorate = governorate.replace(/\s+/g, ' ').toLocaleLowerCase('ar-IQ');
  if (normalizedArea === normalizedGovernorate || normalizedArea.includes(normalizedGovernorate)) return area;

  return `${area} - ${governorate}`;
};
