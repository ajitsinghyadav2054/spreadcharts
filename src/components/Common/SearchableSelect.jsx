import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = "Select an option...",
    disabled = false,
    label
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Filter options based on search
    const filteredOptions = options.filter(opt => {
        const text = typeof opt === 'string' ? opt : opt.name;
        return text.toLowerCase().includes(search.toLowerCase());
    });

    const selectedOption = options.find(opt => {
        const val = typeof opt === 'string' ? opt : opt.id;
        return val === value;
    });

    const displayText = selectedOption
        ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.name)
        : "";

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        const val = typeof opt === 'string' ? opt : opt.id;
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={containerRef} className="relative w-full" style={{ marginBottom: label ? '0' : '0' }}>
            {label && (
                <label className="block mb-2 font-semibold text-[13px] text-gray-400">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between px-3 py-2 rounded border text-[13px] transition-all cursor-pointer
                    ${disabled ? 'bg-[#111] border-[#2a2a4a] text-[#666] cursor-not-allowed' : 'bg-[#16213e] border-[#2a2a4a] text-white hover:border-[#4a90d9]'}
                    ${isOpen ? 'border-[#4a90d9] ring-1 ring-[#4a90d9]/20' : ''}
                `}
            >
                <span className={!displayText ? 'text-gray-500' : ''}>
                    {displayText || placeholder}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-[#1e1e3a] border border-[#2a2a4a] rounded shadow-2xl animate-fade-in max-h-[300px] overflow-hidden flex flex-column">
                    <div className="p-2 border-b border-[#2a2a4a]">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#16213e] border border-[#2a2a4a] rounded px-2 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#4a90d9]"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const val = typeof opt === 'string' ? opt : opt.id;
                                const text = typeof opt === 'string' ? opt : opt.name;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelect(opt)}
                                        className={`
                                            px-3 py-2 text-[13px] cursor-pointer transition-colors
                                            ${val === value ? 'bg-[#4a90d9] text-white' : 'text-gray-300 hover:bg-[#252547] hover:text-white'}
                                        `}
                                    >
                                        {text}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-gray-500 text-[13px]">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
