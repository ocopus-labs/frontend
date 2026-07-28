// Search & Filter Components
// A unified set of components for search and filtering UX

import SearchInput from './search-input.svelte';
import FilterChip from './filter-chip.svelte';
import FilterBar from './filter-bar.svelte';
import FilterDropdown from './filter-dropdown.svelte';
import FilterSheet from './filter-sheet.svelte';
import CommandSearch from './command-search.svelte';

// Type exports
export type { Filter } from './filter-bar.svelte';
export type { FilterOption, FilterGroup } from './filter-dropdown.svelte';
export type { FilterConfig, FilterValues } from './filter-sheet.svelte';
export type { SearchResult, SearchGroup } from './command-search.svelte';

// Variant exports
export { searchInputVariants, type SearchInputSize } from './search-input.svelte';
export { filterChipVariants, type FilterChipVariant } from './filter-chip.svelte';

export { SearchInput, FilterChip, FilterBar, FilterDropdown, FilterSheet, CommandSearch };
