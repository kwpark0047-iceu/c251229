/**
 * 지역 필터 컴포넌트
 * 서울/경기 지역 선택 및 필터링
 */

'use client';

import React from 'react';
import { Check, MapPin } from 'lucide-react';
import { RegionCode, REGIONS, getRegionOptions } from '../region-utils';

interface RegionFilterProps {
  selectedRegions: RegionCode[];
  onRegionChange: (regions: RegionCode[]) => void;
  className?: string;
  disabled?: boolean;
}

export default function RegionFilter({ 
  selectedRegions, 
  onRegionChange, 
  className = '',
  disabled = false
}: RegionFilterProps) {
  const regionOptions = getRegionOptions();

  const handleRegionToggle = (regionCode: RegionCode) => {
    if (disabled) return;

    const newSelection = selectedRegions.includes(regionCode)
      ? selectedRegions.filter(code => code !== regionCode)
      : [...selectedRegions, regionCode];

    onRegionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onRegionChange(Object.keys(REGIONS) as RegionCode[]);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onRegionChange([]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">지역 필터</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전체
          </button>
          <button
            onClick={handleClearAll}
            disabled={disabled}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {regionOptions.map((region) => {
          const isSelected = selectedRegions.includes(region.code);
          const regionInfo = REGIONS[region.code];

          return (
            <button
              key={region.code}
              onClick={() => handleRegionToggle(region.code)}
              disabled={disabled}
              className={`
                inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-200 border
                ${isSelected
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                ...(isSelected && { borderColor: regionInfo.color })
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: regionInfo.color }}
              />
              <span>{region.name}</span>
              {isSelected && (
                <Check className="w-3 h-3" />
              )}
            </button>
          );
        })}
      </div>

      {selectedRegions.length > 0 && (
        <div className="text-xs text-gray-500">
          선택된 지역: {selectedRegions.map(code => REGIONS[code]?.name).join(', ')}
        </div>
      )}

      {selectedRegions.length === 0 && (
        <div className="text-xs text-gray-400 italic">
          지역을 선택하여 필터링하세요
        </div>
      )}
    </div>
  );
}

/**
 * 지역 통계 컴포넌트
 */
interface RegionStatsProps {
  addresses: string[];
  className?: string;
}

export function RegionStats({ addresses, className = '' }: RegionStatsProps) {
  const regionCounts = new Map<RegionCode, number>();

  addresses.forEach(address => {
    for (const [code, region] of Object.entries(REGIONS)) {
      if (region.prefixes.some(prefix => address.includes(prefix))) {
        regionCounts.set(code as RegionCode, (regionCounts.get(code as RegionCode) || 0) + 1);
        break;
      }
    }
  });

  const total = addresses.length;

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">지역별 분포</h4>
      
      <div className="space-y-1">
        {Object.entries(REGIONS).map(([code, region]) => {
          const count = regionCounts.get(code as RegionCode) || 0;
          const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';

          return (
            <div key={code} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: region.color }}
                />
                <span className="text-gray-600">{region.name}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{count.toLocaleString()}</span>
                <span className="text-gray-400">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <div className="text-xs text-gray-400 italic text-center py-2">
          데이터가 없습니다
        </div>
      )}
    </div>
  );
}

/**
 * 지역 선택 드롭다운 컴포넌트
 */
interface RegionDropdownProps {
  selectedRegions: RegionCode[];
  onRegionChange: (regions: RegionCode[]) => void;
  className?: string;
  disabled?: boolean;
}

export function RegionDropdown({ 
  selectedRegions, 
  onRegionChange, 
  className = '',
  disabled = false
}: RegionDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const regionOptions = getRegionOptions();

  const handleRegionToggle = (regionCode: RegionCode) => {
    if (disabled) return;

    const newSelection = selectedRegions.includes(regionCode)
      ? selectedRegions.filter(code => code !== regionCode)
      : [...selectedRegions, regionCode];

    onRegionChange(newSelection);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm
          ${disabled 
            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
          }
        `}
      >
        <MapPin className="w-4 h-4" />
        <span>
          {selectedRegions.length === 0 
            ? '지역 선택' 
            : `${selectedRegions.length}개 지역`
          }
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-1">
              {regionOptions.map((region) => {
                const isSelected = selectedRegions.includes(region.code);
                const regionInfo = REGIONS[region.code];

                return (
                  <button
                    key={region.code}
                    onClick={() => {
                      handleRegionToggle(region.code);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md
                      ${isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: regionInfo.color }}
                    />
                    <span>{region.name}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
