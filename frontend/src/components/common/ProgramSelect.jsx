import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Search, ChevronDown, Check, X } from 'lucide-react';

export const ProgramSelect = ({
  programs = [],
  value = '',
  onChange,
  required = false,
  placeholder = 'Select an accredited degree program...',
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedProgram = programs.find((p) => p._id === value);

  const filteredPrograms = programs.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(query);
    const codeMatch = p.code?.toLowerCase().includes(query);
    const deptMatch = p.department?.toLowerCase().includes(query);
    const degreeMatch = p.degree?.toLowerCase().includes(query);
    return nameMatch || codeMatch || deptMatch || degreeMatch;
  });

  const handleSelect = (programId) => {
    if (onChange) {
      onChange(programId);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input for native form validation if required */}
      <input
        type="text"
        required={required}
        value={value || ''}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-2.5 text-left text-xs rounded-xl border transition-all flex items-center justify-between gap-2 ${
          isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white shadow-sm'
            : error
            ? 'border-rose-300 bg-rose-50/50 hover:bg-white'
            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
          {selectedProgram ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {selectedProgram.name}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {selectedProgram.code}
              </span>
              {selectedProgram.tuitionFee && (
                <span className="shrink-0 text-slate-500 text-[11px] hidden sm:inline">
                  • ₹{selectedProgram.tuitionFee?.toLocaleString('en-IN')}/yr
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedProgram && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              title="Clear selection"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
          {/* Search Filter Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programs by name, code, or department..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Programs List with Custom Scrollbar */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
            {filteredPrograms.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-500">
                <BookOpen className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                <p className="font-semibold text-slate-600">No programs found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try a different search query
                </p>
              </div>
            ) : (
              filteredPrograms.map((program) => {
                const isSelected = program._id === value;
                return (
                  <button
                    key={program._id}
                    type="button"
                    onClick={() => handleSelect(program._id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-brand-50/80 border border-brand-200 text-brand-900'
                        : 'hover:bg-slate-50 border border-transparent text-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {program.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {program.code}
                        </span>
                        {program.durationYears && (
                          <span className="text-[11px] text-slate-400">
                            ({program.durationYears} Years)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {program.tuitionFee != null && (
                          <span>
                            Fee:{' '}
                            <strong className="text-slate-700">
                              ₹{program.tuitionFee.toLocaleString('en-IN')}
                            </strong>
                            /yr
                          </span>
                        )}
                        {program.eligibilityCriteria?.minTwelfthMarks != null && (
                          <span>
                            Min 12th:{' '}
                            <strong className="text-slate-700">
                              {program.eligibilityCriteria.minTwelfthMarks}%
                            </strong>
                          </span>
                        )}
                        {program.eligibilityCriteria?.minTenthMarks != null && (
                          <span>
                            Min 10th:{' '}
                            <strong className="text-slate-700">
                              {program.eligibilityCriteria.minTenthMarks}%
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] font-medium text-slate-400 flex items-center justify-between">
            <span>
              {filteredPrograms.length} of {programs.length} degree programs
            </span>
            <span className="text-[10px] text-slate-400">Scroll to view all</span>
          </div>
        </div>
      )}
    </div>
  );
};
