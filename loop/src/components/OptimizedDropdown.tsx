import React, { useState, useRef, useEffect } from 'react';

export const OptimizedDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  className = ""
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full dropdown-trigger px-3 py-2 flex items-center justify-between"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={selectedOption ? 'ink-strong' : 'dropdown-placeholder'}>
          {selectedOption || placeholder || 'Select option...'}
        </span>
        <span className="dropdown-icon ml-2">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 dropdown-menu max-h-60">
          {options.length > 5 && (
            <div className="p-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full dropdown-search px-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer dropdown-option ${
                    option === value ? 'is-active' : ''
                  }`}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm dropdown-empty">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
