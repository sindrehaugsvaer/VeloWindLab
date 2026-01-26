'use client';

import { useGPX } from '@/context/GPXContext';
import { getClimbCategoryLabel, getClimbCategoryColor } from '@/lib/calculations/climbs';
import Accordion from './Accordion';

export default function ClimbsList() {
  const { data, lapCount, selectedClimbIndex, setSelectedClimbIndex } = useGPX();

  if (!data || data.climbs.length === 0) {
    return null;
  }

  const totalClimbs = data.climbs.length * lapCount;
  const badgeText = lapCount > 1 ? `${data.climbs.length} × ${lapCount} = ${totalClimbs}` : data.climbs.length;

  const handleClimbClick = (index: number) => {
    if (selectedClimbIndex === index) {
      setSelectedClimbIndex(null);
    } else {
      setSelectedClimbIndex(index);
    }
  };

  return (
    <Accordion title="Climbs" badge={badgeText} defaultOpen={false}>
      <div className="space-y-3">
        {data.climbs.map((climb, index) => {
          const isSelected = selectedClimbIndex === index;
          return (
            <div
              key={index}
              onClick={() => handleClimbClick(index)}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Climb {index + 1}
                </span>
                <span
                  className="px-2 py-1 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: getClimbCategoryColor(climb.category) }}
                >
                  {getClimbCategoryLabel(climb.category)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Distance</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{(climb.distance / 1000).toFixed(2)} km</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Elevation</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(climb.elevationGain)} m</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Avg Grade</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{climb.avgGrade.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Max grade: {climb.maxGrade.toFixed(1)}% | 
                {' '}Start: {(climb.startDistance / 1000).toFixed(2)} km
              </div>
            </div>
          );
        })}
      </div>
    </Accordion>
  );
}
