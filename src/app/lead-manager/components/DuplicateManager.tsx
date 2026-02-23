/**
 * 중복 데이터 관리 컴포넌트
 * 중복 통계 표시 및 관리 기능
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { generateDuplicateStats, groupDuplicateLeads, mergeDuplicateLeads } from '../deduplication-utils';
import { AlertTriangle, CheckCircle, BarChart3, RefreshCw, Download } from 'lucide-react';

interface DuplicateManagerProps {
  leads: Lead[];
  onMergeDuplicates?: (mergedLeads: Lead[]) => void;
  onRemoveDuplicates?: (duplicateIds: string[]) => void;
}

export default function DuplicateManager({
  leads,
  onMergeDuplicates,
  onRemoveDuplicates
}: DuplicateManagerProps) {
  const [stats, setStats] = useState<ReturnType<typeof generateDuplicateStats> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (leads.length > 0) {
      setIsLoading(true);
      const statsResult = generateDuplicateStats(leads);
      setStats(statsResult);
      setIsLoading(false);
    }
  }, [leads]);

  const handleMergeAll = async () => {
    if (!stats || !onMergeDuplicates) return;

    setIsLoading(true);
    const mergedLeads = stats.duplicateGroups.map(group =>
      mergeDuplicateLeads(group.leads)
    );

    // 중복되지 않은 리드들과 병합된 리드들 합치기
    const uniqueNonDuplicateLeads = leads.filter(lead =>
      !stats.duplicateGroups.some(group =>
        group.leads.some(duplicate => duplicate.id === lead.id)
      )
    );

    const finalLeads = [...uniqueNonDuplicateLeads, ...mergedLeads];
    onMergeDuplicates(finalLeads);
    setIsLoading(false);
  };

  const handleRemoveAll = async () => {
    if (!stats || !onRemoveDuplicates) return;

    setIsLoading(true);
    const duplicateIds = stats.duplicateGroups.flatMap(group =>
      group.leads.slice(1).map(lead => lead.id) // 각 그룹에서 첫 번째를 제외한 나머지 제거
    );

    onRemoveDuplicates(duplicateIds);
    setIsLoading(false);
  };

  const toggleGroupSelection = (groupIndex: number) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupIndex)) {
      newSelected.delete(groupIndex);
    } else {
      newSelected.add(groupIndex);
    }
    setSelectedGroups(newSelected);
  };

  const handleMergeSelected = async () => {
    if (!stats || !onMergeDuplicates) return;

    const selectedGroupsData = stats.duplicateGroups.filter((_, index) =>
      selectedGroups.has(index)
    );

    const mergedLeads = selectedGroupsData.map(group =>
      mergeDuplicateLeads(group.leads)
    );

    // 선택된 그룹의 중복 리드들 제외
    const remainingLeads = leads.filter(lead =>
      !selectedGroupsData.some(group =>
        group.leads.some(duplicate => duplicate.id === lead.id)
      )
    );

    const finalLeads = [...remainingLeads, ...mergedLeads];
    onMergeDuplicates(finalLeads);
    setSelectedGroups(new Set());
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">중복 데이터 분석 중...</p>
      </div>
    );
  }

  if (!stats) return null;

  if (stats.duplicates === 0) {
    return (
      <div className="p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">중복 데이터 없음</h3>
        <p className="text-gray-600">총 {stats.total.toLocaleString()}개의 데이터 중 중복이 발견되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 요약 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900">중복 데이터 통계</h3>
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{stats.total.toLocaleString()}</div>
            <div className="text-sm text-blue-700">전체 데이터</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.unique.toLocaleString()}</div>
            <div className="text-sm text-green-700">고유 데이터</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.duplicates.toLocaleString()}</div>
            <div className="text-sm text-orange-700">중복 데이터</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{(stats.duplicateRate * 100).toFixed(1)}%</div>
            <div className="text-sm text-red-700">중복율</div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleMergeAll}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          전체 병합
        </button>

        <button
          onClick={handleRemoveAll}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          중복 제거
        </button>

        {selectedGroups.size > 0 && (
          <button
            onClick={handleMergeSelected}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            선택한 그룹 병합 ({selectedGroups.size})
          </button>
        )}
      </div>

      {/* 중복 그룹 목록 */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">중복 그룹 목록</h4>

        <div className="space-y-3">
          {stats.duplicateGroups.map((group, index) => (
            <div
              key={index}
              className={`
                border rounded-lg p-4 cursor-pointer transition-colors
                ${selectedGroups.has(index)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => toggleGroupSelection(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    id={`duplicate-group-${index}`}
                    name={`duplicateGroup-${index}`}
                    type="checkbox"
                    checked={selectedGroups.has(index)}
                    onChange={() => { }}
                    aria-label={`그룹 ${index + 1} 선택`}
                    className="w-4 h-4 text-blue-600 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div>
                    <div className="font-medium text-gray-900">
                      {group.representative}
                    </div>
                    <div className="text-sm text-gray-500">
                      {group.count}개 중복
                    </div>
                  </div>
                </div>

                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>

              {/* 그룹 상세 정보 */}
              {selectedGroups.has(index) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    {group.leads.map((lead, leadIndex) => (
                      <div
                        key={lead.id}
                        className={`
                          p-3 rounded border
                          ${leadIndex === 0
                            ? 'border-green-300 bg-green-50'
                            : 'border-orange-300 bg-orange-50'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {lead.bizName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {lead.roadAddress}
                            </div>
                            {lead.bizId && (
                              <div className="text-xs text-gray-500">
                                사업자 ID: {lead.bizId}
                              </div>
                            )}
                          </div>

                          {leadIndex === 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              대표
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
