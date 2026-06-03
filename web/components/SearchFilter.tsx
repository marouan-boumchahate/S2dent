'use client';
import { useState, useCallback, useEffect } from 'react';

export interface FilterKey {
  label: string;   // Display label, e.g. "Name"
  value: string;   // The object key to filter on, e.g. "name"
}

export interface SearchFilterProps {
  /** Placeholder text inside the search input */
  placeholder?: string;
  /** The fields the user can filter by. Pass [] to hide pills and search all keys. */
  filterKeys: FilterKey[];
  /**
   * Called on every keystroke or pill change.
   * @param query  - the current search string
   * @param active - the currently selected FilterKey, or null = search all
   */
  onSearch: (query: string, active: FilterKey | null) => void;
  /** Optional extra className on the wrapper */
  className?: string;
}

/**
 * SearchFilter — drop this above any data table.
 *
 * Usage:
 *   <SearchFilter
 *     placeholder="Search students…"
 *     filterKeys={[
 *       { label: 'Name',       value: 'name' },
 *       { label: 'Email',      value: 'email' },
 *       { label: 'Department', value: 'department' },
 *       { label: 'Status',     value: 'status' },
 *     ]}
 *     onSearch={(query, activeKey) => {
 *       // filter your data here
 *     }}
 *   />
 *
 * Helper hook  →  useSearchFilter(data, transform?)  (exported below)
 * lets you filter an array of objects in one line.
 * Pass an optional `transform` to flatten/reshape items before indexing
 * (e.g. joining firstName + lastName into a single `name` field).
 */
export default function SearchFilter({
  placeholder = 'Search…',
  filterKeys,
  onSearch,
  className = '',
}: SearchFilterProps) {
  const [query, setQuery] = useState('');
  const [activeKey, setActiveKey] = useState<FilterKey | null>(null);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      onSearch(q, activeKey);
    },
    [activeKey, onSearch],
  );

  const handlePillClick = useCallback(
    (key: FilterKey | null) => {
      setActiveKey(key);
      onSearch(query, key);
    },
    [query, onSearch],
  );

  const handleClear = () => {
    setQuery('');
    setActiveKey(null);
    onSearch('', null);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* ── Search bar ── */}
      <div className="relative flex items-center">
        {/* Search icon */}
        <span className="absolute left-3 text-textMuted pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={placeholder}
          className="
            w-full pl-9 pr-9 py-2.5
            bg-surface border border-borderLine
            rounded-xl text-sm text-textLight
            placeholder:text-textMuted
            focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
            transition-all duration-200
          "
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-textMuted hover:text-textLight transition-colors"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Filter pills ── */}
      {filterKeys.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-textMuted font-medium">Filter by:</span>

          {/* "All" pill */}
          <button
            onClick={() => handlePillClick(null)}
            className={`
              px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150
              ${
                activeKey === null
                  ? 'bg-mint text-navy border-mint shadow-sm shadow-mint/20'
                  : 'bg-surface text-textMuted border-borderLine hover:border-mint hover:text-mint'
              }
            `}
          >
            All
          </button>

          {filterKeys.map((key) => (
            <button
              key={key.value}
              onClick={() => handlePillClick(key)}
              className={`
                px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150
                ${
                  activeKey?.value === key.value
                    ? 'bg-mint text-navy border-mint shadow-sm shadow-mint/20'
                    : 'bg-surface text-textMuted border-borderLine hover:border-mint hover:text-mint'
                }
              `}
            >
              {key.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useSearchFilter — optional helper hook
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Keeps filtered data in sync with what the user types / selects.
 * Automatically re-syncs when `data` changes (e.g. after a fetch) —
 * no manual syncData call or useEffect needed in the parent.
 *
 * Pass an optional `transform` to flatten / reshape items before indexing.
 * This replaces the inline `.map()` + separate `syncData` useEffect pattern
 * that was previously needed in the page.
 *
 * @example — basic
 *   const { filtered, handleSearch } = useSearchFilter(students);
 *
 * @example — with transform (flatten name fields)
 *   const { filtered, handleSearch } = useSearchFilter(students, (s) => ({
 *     ...s,
 *     name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
 *   }));
 *
 *   <SearchFilter ... onSearch={handleSearch} />
 *   {filtered.map(s => <Row key={s.id} data={s} />)}
 */
export function useSearchFilter<T extends Record<string, unknown>>(
  data: T[],
  transform?: (item: T) => T,
) {
  const mapped = transform ? data.map(transform) : data;

  const [filtered, setFiltered] = useState<T[]>(mapped);
  const [activeSearch, setActiveSearch] = useState<{
    query: string;
    key: FilterKey | null;
  }>({ query: '', key: null });

  // Auto-sync filtered results whenever source data changes (e.g. after fetch).
  // Preserves the current query/filter so results stay accurate.
  useEffect(() => {
    const { query, key } = activeSearch;
    if (!query.trim()) {
      setFiltered(mapped);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      mapped.filter((item) => {
        if (key) return String(item[key.value] ?? '').toLowerCase().includes(q);
        return Object.values(item).some((val) =>
          String(val ?? '').toLowerCase().includes(q),
        );
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleSearch = useCallback(
    (query: string, activeKey: FilterKey | null) => {
      setActiveSearch({ query, key: activeKey });
      if (!query.trim()) {
        setFiltered(mapped);
        return;
      }
      const q = query.toLowerCase();
      setFiltered(
        mapped.filter((item) => {
          if (activeKey) {
            return String(item[activeKey.value] ?? '').toLowerCase().includes(q);
          }
          return Object.values(item).some((val) =>
            String(val ?? '').toLowerCase().includes(q),
          );
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return { filtered, handleSearch };
}