<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { EmptyState } from '$lib/components/data-display';
	import {
		getCommissionStatement,
		setStaffCommissionRate,
		type CommissionRateType,
		type CommissionStaffTotal,
		type CommissionStatement
	} from '$lib/api';
	import { formatMoney } from '$lib/utils/money';
	import { formatCurrency, type CurrencyCode } from '$lib/utils/i18n';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatZonedTime, zonedDateKey } from '$lib/utils/timezone';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import PercentIcon from '@lucide/svelte/icons/percent';

	let { data }: { data: PageData } = $props();

	/** Owners set the rates; managers and accountants read the report. */
	const canSetRates = $derived(
		data.userRole === 'owner' ||
			data.userRole === 'restaurant_owner' ||
			data.userRole === 'franchise_owner' ||
			data.userRole === 'super_admin'
	);

	const currency = $derived(data.currency as CurrencyCode);
	const earners = $derived(data.report.staff.filter((s) => s.lineCount > 0));

	let statementFor = $state<CommissionStaffTotal | null>(null);
	let statement = $state<CommissionStatement | null>(null);
	let statementOpen = $state(false);
	let loadingStatement = $state(false);

	let rateFor = $state<CommissionStaffTotal | null>(null);
	let rateOpen = $state(false);
	let rateType = $state<CommissionRateType | ''>('');
	let rateValue = $state('');
	let savingRate = $state(false);

	function shiftMonth(months: number) {
		const [year, month] = data.month.split('-').map(Number);
		const at = new Date(Date.UTC(year, month - 1 + months, 1));
		goto(`?month=${at.toISOString().slice(0, 7)}`, { keepFocus: true, noScroll: true });
	}

	const monthLabel = $derived(
		new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(`${data.month}-01T00:00:00.000Z`)
		)
	);

	/**
	 * What the payout works out to as a share of the work it was computed on.
	 *
	 * Shown rather than the configured rate because they diverge the moment a
	 * per-service override is involved — and the divergence is the interesting
	 * part. Only meaningful in a single currency, so it is skipped when a
	 * member's earnings span more than one.
	 */
	function effectiveRate(member: CommissionStaffTotal): string | null {
		const codes = Object.keys(member.basis);
		if (codes.length !== 1) return null;
		const basis = member.basis[codes[0]];
		if (!basis) return null;
		return `${Math.round(((member.total[codes[0]] ?? 0) / basis) * 1000) / 10}%`;
	}

	function describeRate(member: CommissionStaffTotal): string {
		if (!member.commissionType || member.commissionValue == null) return 'Not on commission';
		return member.commissionType === 'percentage'
			? `${member.commissionValue}% of each service`
			: `${formatCurrency(member.commissionValue, currency)} per service`;
	}

	async function openStatement(member: CommissionStaffTotal) {
		statementFor = member;
		statement = null;
		statementOpen = true;
		loadingStatement = true;
		try {
			statement = await getCommissionStatement(data.businessId, member.businessUserId, {
				from: data.report.from,
				to: data.report.to
			});
		} catch (error) {
			toast.error(userFriendlyError(error, 'Could not load that statement'));
			statementOpen = false;
		} finally {
			loadingStatement = false;
		}
	}

	function openRate(member: CommissionStaffTotal) {
		rateFor = member;
		rateType = member.commissionType ?? '';
		rateValue = member.commissionValue == null ? '' : String(member.commissionValue);
		rateOpen = true;
	}

	async function saveRate() {
		if (!rateFor) return;
		savingRate = true;
		try {
			await setStaffCommissionRate(data.businessId, rateFor.businessUserId, {
				// An empty type is a removal, not an omission — and it is different
				// from a value of 0, which means "on commission, earning nothing".
				commissionType: rateType === '' ? null : rateType,
				...(rateType === '' ? {} : { commissionValue: Number(rateValue) })
			});
			toast.success('Rate updated. Commission already earned is unchanged.');
			rateOpen = false;
			await invalidate('app:commissions');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Could not update that rate'));
		} finally {
			savingRate = false;
		}
	}
</script>

<PageShell title="Commission" description={monthLabel}>
	{#snippet actions()}
		<div class="flex items-center gap-1.5">
			<Button variant="outline" size="sm" onclick={() => shiftMonth(-1)}>Previous</Button>
			<Button variant="outline" size="sm" onclick={() => shiftMonth(1)}>Next</Button>
		</div>
	{/snippet}

	<Card.Root>
		<Card.Header>
			<Card.Description>Earned in {monthLabel}</Card.Description>
			<Card.Title class="text-3xl tabular-nums">
				{formatMoney(data.report.total, currency)}
			</Card.Title>
			<Card.Description>
				{earners.length} of {data.report.staff.length}
				{data.report.staff.length === 1 ? 'person' : 'people'} earned this month
			</Card.Description>
		</Card.Header>
	</Card.Root>

	{#if data.report.staff.length === 0}
		<EmptyState
			title="Nobody on the team yet"
			description="Commission is computed when an appointment is checked out, for whoever performed the service."
		/>
	{:else}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Team member</Table.Head>
						<Table.Head>Rate</Table.Head>
						<Table.Head class="text-right">Services</Table.Head>
						<Table.Head class="text-right">Earned</Table.Head>
						<Table.Head class="w-px"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.report.staff as member (member.businessUserId)}
						<Table.Row>
							<Table.Cell class="font-medium">{member.name}</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">{describeRate(member)}</span>
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{member.lineCount}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">
								{formatMoney(member.total, currency)}
								{#if effectiveRate(member)}
									<!--
										The realised share, not the configured one. They part company
										as soon as a per-service override is in play, and that gap is
										the thing worth looking at.
									-->
									<Badge variant="secondary" class="ml-1.5 font-normal">
										{effectiveRate(member)}
									</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex justify-end gap-1">
									{#if member.lineCount > 0}
										<Button variant="ghost" size="sm" onclick={() => openStatement(member)}>
											Lines
										</Button>
									{/if}
									{#if canSetRates}
										<Button variant="ghost" size="icon-sm" onclick={() => openRate(member)}>
											<PercentIcon class="size-3.5" />
											<span class="sr-only">Set {member.name}'s rate</span>
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{/if}
</PageShell>

<Dialog.Root bind:open={statementOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{statementFor?.name}</Dialog.Title>
			<Dialog.Description>{monthLabel}</Dialog.Description>
		</Dialog.Header>

		{#if loadingStatement}
			<div class="flex items-center justify-center py-10">
				<Loader2Icon class="size-5 animate-spin text-muted-foreground" />
			</div>
		{:else if statement}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Service</Table.Head>
						<Table.Head>Order</Table.Head>
						<Table.Head class="text-right">On</Table.Head>
						<Table.Head class="text-right">Rate</Table.Head>
						<Table.Head class="text-right">Earned</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each statement.lines as line (line.id)}
						<Table.Row>
							<Table.Cell>
								<div class="font-medium">{line.itemName}</div>
								<div class="text-xs text-muted-foreground">
									{zonedDateKey(line.earnedAt, data.timeZone)}
									·
									{formatZonedTime(line.earnedAt, data.timeZone)}
								</div>
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">{line.orderNumber}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">
								{formatCurrency(line.basisAmount, line.currency as CurrencyCode)}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums">
								{line.rateType === 'percentage'
									? `${line.rateValue}%`
									: formatCurrency(line.rateValue, line.currency as CurrencyCode)}
								{#if line.source === 'service'}
									<!--
										Says why this line differs from the member's usual rate. The
										rule that set it may since have changed; the row keeps the
										rate it was computed with either way.
									-->
									<Badge variant="outline" class="ml-1 font-normal">service</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right font-medium tabular-nums">
								{formatCurrency(line.amount, line.currency as CurrencyCode)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<div class="flex items-baseline justify-between border-t pt-3">
				<span class="text-sm text-muted-foreground">Total</span>
				<span class="text-lg font-semibold tabular-nums">
					{formatMoney(statement.total, currency)}
				</span>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={rateOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{rateFor?.name}'s commission</Dialog.Title>
			<Dialog.Description>
				Applies to work from now on. Commission already earned keeps the rate it was computed with.
			</Dialog.Description>
		</Dialog.Header>

		<Field.Group>
			<Field.Field>
				<Field.Label for="rate-type">Rate</Field.Label>
				<NativeSelect id="rate-type" bind:value={rateType} class="w-full">
					<NativeSelectOption value="">Not on commission</NativeSelectOption>
					<NativeSelectOption value="percentage">Percentage of each service</NativeSelectOption>
					<NativeSelectOption value="flat">Flat amount per service</NativeSelectOption>
				</NativeSelect>
			</Field.Field>

			{#if rateType !== ''}
				<Field.Field>
					<Field.Label for="rate-value">
						{rateType === 'percentage' ? 'Percentage' : `Amount (${currency})`}
					</Field.Label>
					<Input
						id="rate-value"
						type="number"
						min="0"
						max={rateType === 'percentage' ? 100 : undefined}
						step="0.01"
						bind:value={rateValue}
					/>
					<Field.Description>
						{rateType === 'percentage'
							? 'Of the service price, before any bill-level discount and before tax.'
							: 'Per unit of the service, whatever it is priced at.'}
					</Field.Description>
				</Field.Field>
			{/if}
		</Field.Group>

		<Button onclick={saveRate} disabled={savingRate || (rateType !== '' && rateValue === '')}>
			{#if savingRate}
				<Loader2Icon class="size-3.5 animate-spin" />
			{/if}
			Save
		</Button>
	</Dialog.Content>
</Dialog.Root>
