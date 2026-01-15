<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import SearchSelect from '$lib/components/global/search-select.svelte';
	import { z } from 'zod';
	import { useSession } from '$lib/auth';

	type TeamMember = {
		email: string;
		role: string;
		stores: string[];
	};

	let {
		teamMembers = $bindable([]),
		errors = $bindable({})
	}: {
		teamMembers: TeamMember[];
		errors: Record<string, string>;
	} = $props();

	const session = useSession();

	// Derive user email from session
	const userEmail = $derived(
		$session.isPending ? 'Loading...' : ($session.data?.user?.email ?? 'Not logged in')
	);

	let newMemberEmail = $state('');
	let newMemberRole = $state('');

	// Validation schema
	export const teamSetupSchema = z.object({
		teamMembers: z
			.array(
				z.object({
					email: z.string().email('Invalid email address'),
					role: z.string().min(1, 'Role is required'),
					stores: z.array(z.string())
				})
			)
			.optional()
	});

	const roleOptions = [
		{ label: 'Manager (Full Access)', value: 'manager' },
		{ label: 'Cashier (POS Only)', value: 'cashier' },
		{ label: 'Staff (Limited Access)', value: 'staff' },
		{ label: 'Custom Permissions', value: 'custom' }
	];

	function addTeamMember() {
		if (newMemberEmail && newMemberRole) {
			// Validate email
			const emailSchema = z.string().email();
			try {
				emailSchema.parse(newMemberEmail);
				teamMembers = [
					...teamMembers,
					{ email: newMemberEmail, role: newMemberRole, stores: ['main'] }
				];
				newMemberEmail = '';
				newMemberRole = '';
				errors = {};
			} catch (error) {
				if (error instanceof z.ZodError) {
					errors = { email: 'Invalid email address' };
				}
			}
		}
	}

	function removeTeamMember(index: number) {
		teamMembers = teamMembers.filter((_, i) => i !== index);
	}

	// Validate function
	export function validate() {
		try {
			teamSetupSchema.parse({ teamMembers });
			errors = {};
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				errors = error.issues.reduce(
					(acc, err) => {
						acc[err.path.join('.')] = err.message;
						return acc;
					},
					{} as Record<string, string>
				);
			}
			return false;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold">Build your team</h1>
		<p class="mt-2 text-muted-foreground">
			Add staff and set permissions (optional - you can do this later)
		</p>
	</div>

	<div class="space-y-6">
		<div>
			<Field.Title>Your Current Team</Field.Title>
		</div>

		<div class="rounded-lg border bg-muted/30 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">You (Owner)</p>
					<p class="text-sm text-muted-foreground">{userEmail}</p>
				</div>
				<span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
					Full Access
				</span>
			</div>
		</div>

		{#if teamMembers.length > 0}
			<div class="space-y-2">
				{#each teamMembers as member, index (index)}
					<div class="rounded-lg border p-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">{member.email}</p>
								<p class="text-sm text-muted-foreground capitalize">{member.role}</p>
							</div>
							<Button variant="ghost" size="sm" onclick={() => removeTeamMember(index)}>
								Remove
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="space-y-6 border-t pt-6">
		<div>
			<Field.Title>Add Team Member</Field.Title>
		</div>

		<Field.Group>
			<Field.Field>
				<Field.Label for="member-email">Email *</Field.Label>
				<Input
					id="member-email"
					type="email"
					placeholder="staff@business.com"
					bind:value={newMemberEmail}
					class={errors.email ? 'border-destructive' : ''}
				/>
				{#if errors.email}
					<Field.Error>{errors.email}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<SearchSelect
					bind:value={newMemberRole}
					options={roleOptions}
					placeholder="Select role"
					emptyPlaceholder="No role found"
				/>
			</Field.Field>
		</Field.Group>

		<div class="flex justify-end gap-2">
			<Button
				variant="outline"
				onclick={() => {
					newMemberEmail = '';
					newMemberRole = '';
					errors = {};
				}}
			>
				Cancel
			</Button>
			<Button onclick={addTeamMember} disabled={!newMemberEmail || !newMemberRole}>
				Send Invite
			</Button>
		</div>
	</div>
</div>
