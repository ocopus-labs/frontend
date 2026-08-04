<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import {
		IconPlus,
		IconChevronLeft,
		IconChevronRight,
		IconCalendar,
		IconLoader2,
		IconCheck,
		IconX,
		IconClock,
		IconCalendarEvent,
		IconCalendarOff
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		createShift,
		createShiftTemplate,
		createLeaveRequest,
		approveLeaveRequest,
		rejectLeaveRequest,
		type RosterEntry,
		type RosterShift,
		type ShiftTemplate,
		type LeaveRequest,
		type LeaveType,
		type LeaveStatus,
		type TeamMember
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	// ==================== STATE ====================

	let activeTab = $state('roster');
	let roster = $state<RosterEntry[]>((data as any).roster || []);
	let templates = $state<ShiftTemplate[]>((data as any).templates || []);
	let leaveRequests = $state<LeaveRequest[]>((data as any).leaveRequests || []);
	let teamMembers = $state<TeamMember[]>((data as any).teamMembers || []);
	let startDate = $state<string>((data as any).startDate);
	let endDate = $state<string>((data as any).endDate);

	// Keep state in sync with data
	$effect(() => {
		roster = (data as any).roster || [];
		templates = (data as any).templates || [];
		leaveRequests = (data as any).leaveRequests || [];
		teamMembers = (data as any).teamMembers || [];
		startDate = (data as any).startDate;
		endDate = (data as any).endDate;
	});

	// Dialog states
	let showAddShiftDialog = $state(false);
	let showAddTemplateDialog = $state(false);
	let showLeaveDialog = $state(false);
	let isSubmitting = $state(false);

	// Cell click state
	let cellClickUserId = $state('');
	let cellClickDate = $state('');

	// Add shift form. The id is `BusinessUser.id` — the membership — because
	// that is what `Shift.businessUserId` references. `TeamMember.userId` is the
	// account behind it, a different value; sending that wrote rows the roster,
	// the conflict check and appointment availability could never join to.
	let shiftBusinessUserId = $state('');
	let shiftDate = $state('');
	let shiftTemplateId = $state('');
	let shiftStartTime = $state('09:00');
	let shiftEndTime = $state('17:00');
	let shiftNotes = $state('');

	// Add template form
	let templateName = $state('');
	let templateStartTime = $state('09:00');
	let templateEndTime = $state('17:00');
	let templateColor = $state('blue');
	let templateBreakMinutes = $state(30);

	// Leave request form
	let leaveType = $state<LeaveType>('annual');
	let leaveStartDate = $state('');
	let leaveEndDate = $state('');
	let leaveReason = $state('');

	/** A grid row: the membership, a display name, and its shifts by date. */
	interface RosterRow {
		businessUserId: string;
		name: string;
		days: Record<string, RosterShift[]>;
	}

	// ==================== DERIVED ====================

	const weekDays = $derived(getWeekDays(startDate));

	const currentWeekLabel = $derived(() => {
		if (!startDate || !endDate) return '';
		const start = new Date(startDate);
		const end = new Date(endDate);
		const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
		return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
	});

	// Build a lookup of approved leave by userId + date
	const approvedLeaveMap = $derived(() => {
		const map = new Map<string, Set<string>>();
		for (const lr of leaveRequests) {
			if (lr.status !== 'approved') continue;
			const dates = getDatesInRange(lr.startDate, lr.endDate);
			for (const d of dates) {
				const key = lr.businessUserId;
				if (!map.has(key)) map.set(key, new Set());
				map.get(key)!.add(d);
			}
		}
		return map;
	});

	/**
	 * One row per active team member, not one per person who already has a
	 * shift.
	 *
	 * `getRoster` is built from `Shift` rows, so it returns nobody on a week that
	 * has not been rostered yet — which left a brand-new business staring at an
	 * empty grid with no cell to click. Rows come from the team; the roster only
	 * fills them in. Anyone in the roster who is no longer on the team is kept at
	 * the end rather than dropped, so their shifts stay visible.
	 */
	const rosterRows = $derived.by(() => {
		const rows: RosterRow[] = teamMembers.map((member) => ({
			businessUserId: member.id,
			name: member.user.name || member.user.email,
			days: roster.find((entry) => entry.businessUserId === member.id)?.days ?? {}
		}));

		for (const entry of roster) {
			if (rows.some((row) => row.businessUserId === entry.businessUserId)) continue;
			rows.push({
				businessUserId: entry.businessUserId,
				name: entry.businessUser?.user.name || entry.businessUser?.user.email || 'Former member',
				days: entry.days
			});
		}
		return rows;
	});

	const pendingLeaveRequests = $derived(leaveRequests.filter((lr) => lr.status === 'pending'));

	const templateColorMap: Record<string, string> = {
		blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
		green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
		orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
		purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
		red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
		teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
		yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
		pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
		gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
	};

	const templateColorDots: Record<string, string> = {
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		orange: 'bg-orange-500',
		purple: 'bg-purple-500',
		red: 'bg-red-500',
		teal: 'bg-teal-500',
		yellow: 'bg-yellow-500',
		pink: 'bg-pink-500',
		gray: 'bg-gray-500'
	};

	function templateDot(color: string | null): string {
		return templateColorDots[color ?? 'gray'] ?? templateColorDots.gray;
	}

	function leaveTypeLabel(type: string): string {
		// `type` is `@IsString() @MaxLength(50)` on the backend, not an enum, so
		// a row can legitimately carry something this map has never seen.
		return leaveTypeLabels[type as LeaveType] ?? type;
	}

	const leaveTypeLabels: Record<LeaveType, string> = {
		annual: 'Annual Leave',
		sick: 'Sick Leave',
		personal: 'Personal Leave',
		unpaid: 'Unpaid Leave',
		other: 'Other'
	};

	const leaveStatusConfig: Record<
		LeaveStatus,
		{ variant: 'default' | 'secondary' | 'destructive'; text: string }
	> = {
		pending: { variant: 'secondary', text: 'Pending' },
		approved: { variant: 'default', text: 'Approved' },
		rejected: { variant: 'destructive', text: 'Rejected' }
	};

	// ==================== HELPERS ====================

	function getWeekDays(
		start: string
	): { date: string; dayName: string; dayNum: number; isToday: boolean }[] {
		if (!start) return [];
		const days: { date: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
		const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		const today = new Date().toISOString().split('T')[0];
		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(d.getDate() + i);
			const dateStr = d.toISOString().split('T')[0];
			days.push({
				date: dateStr,
				dayName: names[i],
				dayNum: d.getDate(),
				isToday: dateStr === today
			});
		}
		return days;
	}

	function getDatesInRange(start: string, end: string): string[] {
		const dates: string[] = [];
		const current = new Date(start);
		const last = new Date(end);
		while (current <= last) {
			dates.push(current.toISOString().split('T')[0]);
			current.setDate(current.getDate() + 1);
		}
		return dates;
	}

	function getShiftsForCell(row: RosterRow, date: string): RosterShift[] {
		// The handler nests a week's shifts under `days`, keyed by `YYYY-MM-DD`,
		// and omits days with none. It does not return a flat `shifts` array.
		return row.days[date] ?? [];
	}

	function isOnLeave(businessUserId: string, date: string): boolean {
		return approvedLeaveMap().get(businessUserId)?.has(date) ?? false;
	}

	function formatShiftTime(time: string): string {
		// Handle "HH:mm" or full datetime
		if (time.includes('T')) {
			return new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		}
		const [h, m] = time.split(':').map(Number);
		const d = new Date();
		d.setHours(h, m);
		return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	function getUserInitials(name: string | null): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// ==================== NAVIGATION ====================

	function navigateWeek(direction: -1 | 1) {
		const d = new Date(startDate);
		d.setDate(d.getDate() + direction * 7);
		const weekParam = d.toISOString().split('T')[0];
		goto(`?week=${weekParam}`);
	}

	function goToCurrentWeek() {
		goto('?');
	}

	// ==================== CELL CLICK ====================

	function handleCellClick(businessUserId: string, date: string) {
		if (!canModify(data.userRole)) return;
		cellClickUserId = businessUserId;
		cellClickDate = date;
		shiftBusinessUserId = businessUserId;
		shiftDate = date;
		shiftTemplateId = '';
		shiftStartTime = '09:00';
		shiftEndTime = '17:00';
		shiftNotes = '';
		showAddShiftDialog = true;
	}

	// ==================== SHIFT ACTIONS ====================

	function openAddShiftDialog() {
		shiftBusinessUserId = '';
		shiftDate = '';
		shiftTemplateId = '';
		shiftStartTime = '09:00';
		shiftEndTime = '17:00';
		shiftNotes = '';
		cellClickUserId = '';
		cellClickDate = '';
		showAddShiftDialog = true;
	}

	function applyTemplate(templateId: string) {
		const tpl = templates.find((t) => t.id === templateId);
		if (tpl) {
			shiftStartTime = tpl.startTime;
			shiftEndTime = tpl.endTime;
			shiftTemplateId = templateId;
		}
	}

	async function handleCreateShift() {
		if (!shiftBusinessUserId || !shiftDate) {
			toast.error('Please select a staff member and date');
			return;
		}
		isSubmitting = true;
		try {
			await createShift(data.businessId, {
				businessUserId: shiftBusinessUserId,
				date: shiftDate,
				startTime: shiftStartTime,
				endTime: shiftEndTime,
				templateId: shiftTemplateId || undefined,
				notes: shiftNotes || undefined
			});
			toast.success('Shift created successfully');
			showAddShiftDialog = false;
			invalidate('app:schedule');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to create shift'));
		} finally {
			isSubmitting = false;
		}
	}

	// ==================== TEMPLATE ACTIONS ====================

	function openAddTemplateDialog() {
		templateName = '';
		templateStartTime = '09:00';
		templateEndTime = '17:00';
		templateColor = 'blue';
		templateBreakMinutes = 30;
		showAddTemplateDialog = true;
	}

	async function handleCreateTemplate() {
		if (!templateName.trim()) {
			toast.error('Template name is required');
			return;
		}
		isSubmitting = true;
		try {
			const result = await createShiftTemplate(data.businessId, {
				name: templateName,
				startTime: templateStartTime,
				endTime: templateEndTime,
				color: templateColor as any,
				breakMinutes: templateBreakMinutes
			});
			toast.success('Template created successfully');
			templates = [...templates, result.template];
			showAddTemplateDialog = false;
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to create template'));
		} finally {
			isSubmitting = false;
		}
	}

	// ==================== LEAVE ACTIONS ====================

	function openLeaveDialog() {
		leaveType = 'annual';
		leaveStartDate = '';
		leaveEndDate = '';
		leaveReason = '';
		showLeaveDialog = true;
	}

	async function handleCreateLeaveRequest() {
		if (!leaveStartDate || !leaveEndDate) {
			toast.error('Please select start and end dates');
			return;
		}
		isSubmitting = true;
		try {
			await createLeaveRequest(data.businessId, {
				type: leaveType,
				startDate: leaveStartDate,
				endDate: leaveEndDate,
				reason: leaveReason || undefined
			});
			toast.success('Leave request submitted');
			showLeaveDialog = false;
			invalidate('app:schedule');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to submit leave request'));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleApproveLeave(id: string) {
		try {
			const result = await approveLeaveRequest(data.businessId, id);
			leaveRequests = leaveRequests.map((lr) => (lr.id === id ? result.leaveRequest : lr));
			toast.success('Leave request approved');
			invalidate('app:schedule');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to approve leave request'));
		}
	}

	async function handleRejectLeave(id: string) {
		try {
			const result = await rejectLeaveRequest(data.businessId, id);
			leaveRequests = leaveRequests.map((lr) => (lr.id === id ? result.leaveRequest : lr));
			toast.success('Leave request rejected');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to reject leave request'));
		}
	}
</script>

<PageShell title="Staff Schedule" description="Manage weekly roster and leave requests">
	{#snippet actions()}
		{#if canModify(data.userRole)}
			<Button variant="outline" onclick={openAddTemplateDialog}>
				<IconClock class="mr-2 h-4 w-4" />
				New Template
			</Button>
			<Button onclick={openAddShiftDialog}>
				<IconPlus class="mr-2 h-4 w-4" />
				Add Shift
			</Button>
		{/if}
	{/snippet}

	<div>
		<Tabs.Root bind:value={activeTab} class="w-full">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="roster">
					<IconCalendar class="mr-2 h-4 w-4" />
					Roster
				</Tabs.Trigger>
				<Tabs.Trigger value="leave">
					<IconCalendarOff class="mr-2 h-4 w-4" />
					Leave Requests
					{#if pendingLeaveRequests.length > 0}
						<Badge variant="destructive" class="ml-2 h-5 min-w-5 px-1 text-xs">
							{pendingLeaveRequests.length}
						</Badge>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>

			<!-- ==================== ROSTER TAB ==================== -->
			<Tabs.Content value="roster" class="mt-4 space-y-4">
				<!-- Week Navigation -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							onclick={() => navigateWeek(-1)}
							aria-label="Previous week"
						>
							<IconChevronLeft class="h-4 w-4" />
						</Button>
						<Button variant="outline" size="sm" onclick={goToCurrentWeek}>Today</Button>
						<Button
							variant="outline"
							size="icon"
							onclick={() => navigateWeek(1)}
							aria-label="Next week"
						>
							<IconChevronRight class="h-4 w-4" />
						</Button>
					</div>
					<h3 class="text-sm font-medium text-muted-foreground">
						{currentWeekLabel()}
					</h3>
				</div>

				<!-- Shift Templates Legend -->
				{#if templates.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each templates as tpl (tpl.id)}
							<div class="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
								<span class="h-2.5 w-2.5 rounded-full {templateDot(tpl.color)}"></span>
								<span class="font-medium">{tpl.name}</span>
								<span class="text-muted-foreground">{tpl.startTime}-{tpl.endTime}</span>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Roster Grid -->
				{#if rosterRows.length > 0}
					<Card.Root>
						<div class="overflow-x-auto">
							<table class="w-full min-w-[700px] border-collapse">
								<thead>
									<tr class="border-b">
										<th
											class="sticky left-0 z-10 bg-card px-4 py-3 text-left text-sm font-medium text-muted-foreground"
											style="min-width: 160px;"
										>
											Staff
										</th>
										{#each weekDays as day (day.date)}
											<th
												class="px-2 py-3 text-center text-sm font-medium {day.isToday
													? 'bg-primary/5'
													: ''}"
											>
												<div class="text-muted-foreground">{day.dayName}</div>
												<div class="mt-0.5 {day.isToday ? 'font-bold text-primary' : ''}">
													{day.dayNum}
												</div>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each rosterRows as entry (entry.businessUserId)}
										<tr class="border-b last:border-b-0">
											<td class="sticky left-0 z-10 bg-card px-4 py-3">
												<div class="flex items-center gap-2.5">
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
													>
														{getUserInitials(entry.name)}
													</div>
													<div class="min-w-0">
														<p class="truncate text-sm font-medium">
															{entry.name}
														</p>
													</div>
												</div>
											</td>
											{#each weekDays as day (day.date)}
												{@const shifts = getShiftsForCell(entry, day.date)}
												{@const onLeave = isOnLeave(entry.businessUserId, day.date)}
												<td
													class="relative px-1 py-1.5 text-center align-top {day.isToday
														? 'bg-primary/5'
														: ''} {onLeave ? 'bg-muted/50' : ''}"
													style="min-width: 90px;"
												>
													<!-- svelte-ignore a11y_click_events_have_key_events -->
													<!-- svelte-ignore a11y_no_static_element_interactions -->
													<div
														class="min-h-[48px] cursor-pointer rounded-md border border-transparent p-0.5 transition-colors hover:border-primary/30 hover:bg-primary/5"
														onclick={() => handleCellClick(entry.businessUserId, day.date)}
													>
														{#if onLeave}
															<div class="flex h-full items-center justify-center">
																<span
																	class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
																>
																	On Leave
																</span>
															</div>
														{/if}
														{#each shifts as shift (shift.id)}
															{@const color = shift.template?.color || 'gray'}
															<div
																class="mb-0.5 rounded px-1 py-0.5 text-[10px] leading-tight {templateColorMap[
																	color
																] || templateColorMap.gray}"
															>
																<div class="font-medium">
																	{formatShiftTime(shift.startTime)}-{formatShiftTime(
																		shift.endTime
																	)}
																</div>
																{#if shift.template}
																	<div class="truncate opacity-80">{shift.template.name}</div>
																{/if}
															</div>
														{/each}
														{#if shifts.length === 0 && !onLeave}
															<div
																class="flex h-full min-h-[40px] items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
															>
																<IconPlus class="h-3.5 w-3.5 text-muted-foreground/50" />
															</div>
														{/if}
													</div>
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</Card.Root>
				{:else}
					<EmptyState
						type="empty"
						title="No schedule data"
						description="No staff members have been assigned shifts for this week. Add shifts to get started."
						actionLabel={canModify(data.userRole) ? 'Add Shift' : undefined}
						onAction={canModify(data.userRole) ? openAddShiftDialog : undefined}
					/>
				{/if}
			</Tabs.Content>

			<!-- ==================== LEAVE REQUESTS TAB ==================== -->
			<Tabs.Content value="leave" class="mt-4 space-y-4">
				<div class="flex items-center justify-end">
					<Button onclick={openLeaveDialog}>
						<IconCalendarEvent class="mr-2 h-4 w-4" />
						Request Leave
					</Button>
				</div>

				{#if leaveRequests.length > 0}
					<!-- Mobile: Card list -->
					<div class="flex flex-col gap-2 md:hidden">
						{#each leaveRequests as lr (lr.id)}
							<Card.Root>
								<Card.Content class="p-4">
									<div class="flex items-start justify-between">
										<div>
											<p class="text-sm font-medium">{lr.businessUser?.user.name || 'Unknown'}</p>
											<p class="text-xs text-muted-foreground">{leaveTypeLabel(lr.type)}</p>
										</div>
										<Badge variant={leaveStatusConfig[lr.status].variant}>
											{leaveStatusConfig[lr.status].text}
										</Badge>
									</div>
									<div class="mt-2 text-xs text-muted-foreground">
										{formatDate(lr.startDate)} - {formatDate(lr.endDate)}
									</div>
									{#if lr.reason}
										<p class="mt-1 text-xs text-muted-foreground">{lr.reason}</p>
									{/if}
									{#if lr.status === 'pending' && canModify(data.userRole)}
										<div class="mt-3 flex gap-2">
											<Button
												size="sm"
												variant="outline"
												class="h-7 text-xs"
												onclick={() => handleApproveLeave(lr.id)}
											>
												<IconCheck class="mr-1 h-3.5 w-3.5" />
												Approve
											</Button>
											<Button
												size="sm"
												variant="outline"
												class="h-7 text-xs text-destructive"
												onclick={() => handleRejectLeave(lr.id)}
											>
												<IconX class="mr-1 h-3.5 w-3.5" />
												Reject
											</Button>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</div>

					<!-- Desktop: Table -->
					<div class="hidden md:block">
						<div class="overflow-x-auto rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Staff</Table.Head>
										<Table.Head>Type</Table.Head>
										<Table.Head>From</Table.Head>
										<Table.Head>To</Table.Head>
										<Table.Head>Reason</Table.Head>
										<Table.Head>Status</Table.Head>
										<Table.Head class="text-right">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each leaveRequests as lr (lr.id)}
										<Table.Row>
											<Table.Cell>
												<div class="flex items-center gap-2.5">
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
													>
														{getUserInitials(lr.businessUser?.user.name ?? null)}
													</div>
													<div>
														<p class="text-sm font-medium">
															{lr.businessUser?.user.name || 'Unknown'}
														</p>
														<p class="text-xs text-muted-foreground">
															{lr.businessUser?.user.email}
														</p>
													</div>
												</div>
											</Table.Cell>
											<Table.Cell>
												<Badge variant="outline">{leaveTypeLabel(lr.type)}</Badge>
											</Table.Cell>
											<Table.Cell class="text-muted-foreground"
												>{formatDate(lr.startDate)}</Table.Cell
											>
											<Table.Cell class="text-muted-foreground">{formatDate(lr.endDate)}</Table.Cell
											>
											<Table.Cell>
												<span class="max-w-[200px] truncate text-sm text-muted-foreground">
													{lr.reason || '-'}
												</span>
											</Table.Cell>
											<Table.Cell>
												<Badge variant={leaveStatusConfig[lr.status].variant}>
													{leaveStatusConfig[lr.status].text}
												</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">
												{#if lr.status === 'pending' && canModify(data.userRole)}
													<div class="flex justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															class="h-8 w-8 text-success hover:text-success/90"
															onclick={() => handleApproveLeave(lr.id)}
															aria-label="Approve"
														>
															<IconCheck class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															class="h-8 w-8 text-destructive"
															onclick={() => handleRejectLeave(lr.id)}
															aria-label="Reject"
														>
															<IconX class="h-4 w-4" />
														</Button>
													</div>
												{:else if lr.approvedAt}
													<span class="text-xs text-muted-foreground">
														{formatDate(lr.approvedAt)}
													</span>
												{/if}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					</div>
				{:else}
					<EmptyState
						type="empty"
						title="No leave requests"
						description="There are no leave requests to display."
						actionLabel="Request Leave"
						onAction={openLeaveDialog}
					/>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</div>
</PageShell>

<!-- ==================== ADD SHIFT DIALOG ==================== -->
<Dialog.Root bind:open={showAddShiftDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Shift</Dialog.Title>
			<Dialog.Description>Assign a shift to a staff member</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="shift-staff" class="text-sm font-medium">Staff Member *</label>
				<Select.Root type="single" bind:value={shiftBusinessUserId}>
					<Select.Trigger class="w-full">
						{#if shiftBusinessUserId}
							{@const member = teamMembers.find((m) => m.id === shiftBusinessUserId)}
							{member?.user.name || 'Select staff'}
						{:else}
							Select staff member
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each teamMembers as member (member.id)}
							<Select.Item value={member.id}>{member.user.name || member.user.email}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-2">
				<label for="shift-date" class="text-sm font-medium">Date *</label>
				<Input id="shift-date" type="date" bind:value={shiftDate} />
			</div>
			{#if templates.length > 0}
				<div class="grid gap-2">
					<label for="shift-template" class="text-sm font-medium">Shift Template</label>
					<Select.Root
						type="single"
						value={shiftTemplateId}
						onValueChange={(v) => applyTemplate(v)}
					>
						<Select.Trigger class="w-full">
							{#if shiftTemplateId}
								{@const tpl = templates.find((t) => t.id === shiftTemplateId)}
								{tpl?.name || 'Custom'}
							{:else}
								Custom times
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">Custom times</Select.Item>
							{#each templates as tpl (tpl.id)}
								<Select.Item value={tpl.id}>
									{tpl.name} ({tpl.startTime}-{tpl.endTime})
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="shift-start" class="text-sm font-medium">Start Time *</label>
					<Input id="shift-start" type="time" bind:value={shiftStartTime} />
				</div>
				<div class="grid gap-2">
					<label for="shift-end" class="text-sm font-medium">End Time *</label>
					<Input id="shift-end" type="time" bind:value={shiftEndTime} />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="shift-notes" class="text-sm font-medium">Notes</label>
				<Input id="shift-notes" bind:value={shiftNotes} placeholder="Optional notes" />
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (showAddShiftDialog = false)}
				disabled={isSubmitting}
			>
				Cancel
			</Button>
			<Button onclick={handleCreateShift} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Shift
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ==================== ADD TEMPLATE DIALOG ==================== -->
<Dialog.Root bind:open={showAddTemplateDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>New Shift Template</Dialog.Title>
			<Dialog.Description>Create a reusable shift template</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="tpl-name" class="text-sm font-medium">Name *</label>
				<Input id="tpl-name" bind:value={templateName} placeholder="e.g. Morning Shift" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="tpl-start" class="text-sm font-medium">Start Time *</label>
					<Input id="tpl-start" type="time" bind:value={templateStartTime} />
				</div>
				<div class="grid gap-2">
					<label for="tpl-end" class="text-sm font-medium">End Time *</label>
					<Input id="tpl-end" type="time" bind:value={templateEndTime} />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="tpl-break" class="text-sm font-medium">Break (minutes)</label>
				<Input id="tpl-break" type="number" bind:value={templateBreakMinutes} min="0" max="120" />
			</div>
			<div class="grid gap-2">
				<label class="text-sm font-medium">Color</label>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(templateColorDots) as [color, dotClass] (color)}
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors {templateColor ===
							color
								? 'border-primary'
								: 'border-transparent'}"
							onclick={() => (templateColor = color)}
							aria-label="Select {color}"
						>
							<span class="h-5 w-5 rounded-full {dotClass}"></span>
						</button>
					{/each}
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (showAddTemplateDialog = false)}
				disabled={isSubmitting}
			>
				Cancel
			</Button>
			<Button onclick={handleCreateTemplate} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Template
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ==================== LEAVE REQUEST DIALOG ==================== -->
<Dialog.Root bind:open={showLeaveDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Request Leave</Dialog.Title>
			<Dialog.Description>Submit a leave request for approval</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="leave-type" class="text-sm font-medium">Leave Type *</label>
				<Select.Root type="single" bind:value={leaveType}>
					<Select.Trigger class="w-full">
						{leaveTypeLabels[leaveType]}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="annual">Annual Leave</Select.Item>
						<Select.Item value="sick">Sick Leave</Select.Item>
						<Select.Item value="personal">Personal Leave</Select.Item>
						<Select.Item value="unpaid">Unpaid Leave</Select.Item>
						<Select.Item value="other">Other</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="leave-start" class="text-sm font-medium">Start Date *</label>
					<Input id="leave-start" type="date" bind:value={leaveStartDate} />
				</div>
				<div class="grid gap-2">
					<label for="leave-end" class="text-sm font-medium">End Date *</label>
					<Input id="leave-end" type="date" bind:value={leaveEndDate} />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="leave-reason" class="text-sm font-medium">Reason</label>
				<Textarea
					id="leave-reason"
					bind:value={leaveReason}
					placeholder="Optional reason for leave"
					rows={3}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showLeaveDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={handleCreateLeaveRequest} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Submit Request
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
