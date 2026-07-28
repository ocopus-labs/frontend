<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const searchInputVariants = tv({
		base: 'relative flex items-center w-full',
		variants: {
			size: {
				default: '',
				sm: '',
				lg: ''
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type SearchInputSize = VariantProps<typeof searchInputVariants>['size'];
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { Kbd } from '$lib/components/ui/kbd';

	type Props = Omit<HTMLInputAttributes, 'type' | 'size'> & {
		value?: string;
		size?: 'default' | 'sm' | 'lg';
		loading?: boolean;
		showClear?: boolean;
		showShortcut?: boolean;
		shortcut?: string;
		resultCount?: number | null;
		onClear?: () => void;
		debounceMs?: number;
	};

	let {
		value = $bindable(''),
		size = 'default' as 'default' | 'sm' | 'lg',
		loading = false,
		showClear = true,
		showShortcut = false,
		shortcut = '/',
		resultCount = null,
		onClear,
		debounceMs = 0,
		placeholder = 'Search...',
		class: className,
		...restProps
	}: Props = $props();

	let inputRef: HTMLInputElement | null = $state(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let internalValue = $state(value);

	const sizeClasses = $derived({
		wrapper: {
			default: '',
			sm: '',
			lg: ''
		}[size ?? 'default'],
		input: {
			default: 'h-10 pl-10 pr-10 text-sm',
			sm: 'h-8 pl-8 pr-8 text-xs',
			lg: 'h-12 pl-12 pr-12 text-base'
		}[size ?? 'default'],
		icon: {
			default: 'h-4 w-4 left-3',
			sm: 'h-3.5 w-3.5 left-2.5',
			lg: 'h-5 w-5 left-4'
		}[size ?? 'default'],
		clearBtn: {
			default: 'right-3 h-4 w-4',
			sm: 'right-2.5 h-3.5 w-3.5',
			lg: 'right-4 h-5 w-5'
		}[size ?? 'default']
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		internalValue = target.value;

		if (debounceMs > 0) {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				value = internalValue;
			}, debounceMs);
		} else {
			value = internalValue;
		}
	}

	function handleClear() {
		value = '';
		internalValue = '';
		onClear?.();
		inputRef?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && value) {
			e.preventDefault();
			handleClear();
		}
	}

	$effect(() => {
		internalValue = value;
	});

	$effect(() => {
		if (!showShortcut) return;

		function handleGlobalKeydown(e: KeyboardEvent) {
			if (
				e.key === shortcut &&
				!e.ctrlKey &&
				!e.metaKey &&
				document.activeElement?.tagName !== 'INPUT' &&
				document.activeElement?.tagName !== 'TEXTAREA'
			) {
				e.preventDefault();
				inputRef?.focus();
			}
		}

		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});
</script>

<div class={cn(searchInputVariants({ size }), sizeClasses.wrapper, className)}>
	<!-- Search Icon -->
	<div
		class={cn(
			'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
			sizeClasses.icon
		)}
	>
		{#if loading}
			<LoaderCircleIcon class="h-full w-full animate-spin" />
		{:else}
			<SearchIcon class="h-full w-full" />
		{/if}
	</div>

	<!-- Input -->
	<input
		bind:this={inputRef}
		type="search"
		value={internalValue}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{placeholder}
		class={cn(
			'flex w-full rounded-lg border border-input bg-background shadow-sm ring-offset-background transition-all placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
			'[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
			sizeClasses.input
		)}
		{...restProps}
	/>

	<!-- Right side content -->
	<div
		class={cn('absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5', sizeClasses.clearBtn)}
	>
		{#if resultCount !== null && value}
			<span class="mr-1 text-xs text-muted-foreground tabular-nums">
				{resultCount}
				{resultCount === 1 ? 'result' : 'results'}
			</span>
		{/if}

		{#if showClear && value}
			<button
				type="button"
				onclick={handleClear}
				class="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
				aria-label="Clear search"
			>
				<XIcon class="h-full w-full" />
			</button>
		{:else if showShortcut && !value}
			<Kbd class="text-muted-foreground">{shortcut}</Kbd>
		{/if}
	</div>
</div>
