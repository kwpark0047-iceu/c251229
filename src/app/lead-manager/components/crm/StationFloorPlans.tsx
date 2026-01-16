import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FloorPlan } from '../../types';

interface StationFloorPlansProps {
    floorPlans: FloorPlan[];
}

export default function StationFloorPlans({ floorPlans }: StationFloorPlansProps) {
    const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);

    if (floorPlans.length === 0) return null;

    return (
        <>
            <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    역사 도면 ({floorPlans.length})
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {floorPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className="flex-shrink-0 w-40 h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500 transition-all relative group"
                            onClick={() => setSelectedFloorPlan(plan)}
                        >
                            <img
                                src={plan.thumbnailUrl || plan.imageUrl}
                                alt={`${plan.stationName} ${plan.floorName || ''}`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs font-medium truncate">
                                {plan.floorName || '도면'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 도면 확대 모달 */}
            {selectedFloorPlan && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedFloorPlan(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h3 className="font-semibold text-lg">{selectedFloorPlan.stationName} {selectedFloorPlan.floorName}</h3>
                            <button onClick={() => setSelectedFloorPlan(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-1 bg-slate-100 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center">
                            <img
                                src={selectedFloorPlan.imageUrl}
                                alt={`${selectedFloorPlan.stationName} ${selectedFloorPlan.floorName}`}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
