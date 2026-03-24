'use client';

import React, { useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';

interface MapSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function MapSearchBar({ onSearch, isLoading }: MapSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="map-search-bar">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
      >
        <div className="pl-4 pr-2 text-blue-500">
          <MapPin className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="주소, 장소, 업체명 검색"
          className="flex-1 py-3 px-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          type="submit"
          disabled={isLoading}
          className="p-3 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          title="검색"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-t-blue-600 border-blue-100 rounded-full animate-spin" />
          ) : (
            <Search className="w-6 h-6" />
          )}
        </button>
      </form>
    </div>
  );
}
