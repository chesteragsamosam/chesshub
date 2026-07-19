<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { ratingEntries } from '$lib/chess-ratings';
	import { SOCIAL_PLATFORMS } from '$lib/social';
	import { externalImageUrl, isLocalAvatarUrl } from '$lib/avatars';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data, form } = $props();

	let previewUrl = $state(null);
	let copied = $state(false);

	const profilePath = $derived(`/profile/${data.profileSlug}`);
	const profileUrl = $derived(`${$page.url.origin}${profilePath}`);
	const displayImage = $derived(previewUrl ?? data.user?.image ?? null);
	const externalImage = $derived(data.user ? externalImageUrl(data.user.image, data.user.id) : '');
	const hasUploadedAvatar = $derived(
		Boolean(data.user?.image && isLocalAvatarUrl(data.user.image, data.user.id))
	);

	$effect(() => {
		const url = previewUrl;
		return () => {
			if (url) {
				URL.revokeObjectURL(url);
			}
		};
	});

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function onPhotoSelected(event) {
		const file = event.currentTarget.files?.[0];
		previewUrl = file ? URL.createObjectURL(file) : null;
	}

	async function copyProfileLink() {
		try {
			await navigator.clipboard.writeText(profileUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// ignore
		}
	}

	/** @param {string} platform */
	function chessAccount(platform) {
		return data.chessAccounts.find(
			/** @param {{ platform: string }} a */ (a) => a.platform === platform
		);
	}

	/** @param {string} platform */
	function socialUrl(platform) {
		return (
			data.socialLinks.find(/** @param {{ platform: string }} s */ (s) => s.platform === platform)
				?.url ?? ''
		);
	}

	const flashMessages = {
		lichess: 'Lichess account linked.',
		lichess_not_configured: 'Lichess linking isn’t available right now. Please try again later.',
		lichess_denied: 'Lichess linking was cancelled. You can try again anytime.',
		lichess_expired: 'That Lichess link timed out. Please try again.',
		lichess_state: 'Something went wrong linking Lichess. Please try again.',
		lichess_failed: 'Could not link Lichess. Please try again.',
		chesscom: 'Chess.com account linked.',
		chesscom_not_configured:
			'Chess.com linking isn’t available right now. Please try again later.',
		chesscom_denied: 'Chess.com linking was cancelled. You can try again anytime.',
		chesscom_expired: 'That Chess.com link timed out. Please try again.',
		chesscom_state: 'Something went wrong linking Chess.com. Please try again.',
		chesscom_failed: 'Could not link Chess.com. Please try again.'
	};
</script>

<div class="page stack">
	<header>
		<h1 class="page-title">Profile settings</h1>
		<p class="page-lede">
			Update your bio and chess accounts.
			<a href={resolve(`/profile/${data.profileSlug}`)} class="link">View your profile</a>
		</p>
	</header>

	{#if data.flash?.linked}
		<p class="alert alert-success">
			{flashMessages[/** @type {keyof typeof flashMessages} */ (data.flash.linked)] ??
				'Account linked.'}
		</p>
	{/if}
	{#if data.flash?.error}
		<p class="alert alert-error">
			{flashMessages[/** @type {keyof typeof flashMessages} */ (data.flash.error)] ??
				data.flash.error}
		</p>
	{/if}

	<section class="panel stack-sm">
		<div>
			<h2 class="section-title">Appearance</h2>
			<p class="page-lede">Choose how ChessHub looks on this device.</p>
		</div>
		<ThemeToggle />
	</section>

	<section class="panel stack-sm">
		<div>
			<h2 class="section-title">Display name</h2>
			<p class="page-lede">Shown on your profile and in tournament lists.</p>
		</div>
		<form method="post" action="?/updateName" use:enhance class="stack-sm">
			<label class="field">
				Display name
				<input
					type="text"
					name="name"
					required
					maxlength="255"
					value={form?.nameValue ?? data.user?.name ?? ''}
				/>
			</label>
			{#if form?.nameMessage}
				<p class="alert alert-error">{form.nameMessage}</p>
			{/if}
			{#if form?.nameSuccess}
				<p class="alert alert-success">Display name saved.</p>
			{/if}
			<button type="submit" class="btn btn-primary">Save display name</button>
		</form>
	</section>

	<section class="panel stack-sm">
		<div>
			<h2 class="section-title">Username</h2>
			<p class="page-lede">This becomes your profile link.</p>
		</div>
		<form method="post" action="?/updateUsername" use:enhance class="stack-sm">
			<label class="field">
				Username
				<div class="username-row">
					<span>@</span>
					<input
						type="text"
						name="username"
						required
						minlength="3"
						maxlength="30"
						pattern="[a-zA-Z0-9_]+"
						placeholder="your_username"
						value={form?.usernameValue ?? data.username ?? ''}
						class="lowercase"
					/>
				</div>
			</label>
			{#if data.username}
				<div class="share-row">
					<code class="profile-url">{profilePath}</code>
					<button type="button" class="btn btn-secondary" onclick={copyProfileLink}>
						{copied ? 'Copied' : 'Copy link'}
					</button>
				</div>
			{:else}
				<p class="alert alert-warning">
					Choose a username so friends can find your profile.
				</p>
			{/if}
			{#if form?.usernameMessage}
				<p class="alert alert-error">{form.usernameMessage}</p>
			{/if}
			{#if form?.usernameSuccess}
				<p class="alert alert-success">Username saved.</p>
			{/if}
			<button type="submit" class="btn btn-primary">Save username</button>
		</form>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">Profile picture</h2>
		<div class="photo-row">
			<UserAvatar name={data.user?.name ?? ''} image={displayImage} size="lg" />
			<form
				method="post"
				action="?/updatePhoto"
				enctype="multipart/form-data"
				use:enhance
				class="photo-form stack-sm"
			>
				<label class="field">
					Upload image
					<input
						type="file"
						name="photo"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onchange={onPhotoSelected}
					/>
				</label>
				<p class="hint">JPG, PNG, WebP, or GIF up to 5 MB.</p>
				<label class="field">
					Or paste image URL
					<input
						type="url"
						name="image"
						placeholder="https://example.com/photo.jpg"
						value={externalImage}
					/>
				</label>
				{#if hasUploadedAvatar}
					<p class="hint">Choose a new file or URL to replace your current photo.</p>
				{/if}
				{#if form?.photoMessage}
					<p class="alert alert-error">{form.photoMessage}</p>
				{/if}
				{#if form?.photoSuccess}
					<p class="alert alert-success">Profile picture updated.</p>
				{/if}
				<div class="photo-actions">
					<button type="submit" class="btn btn-primary">Save picture</button>
					{#if data.user?.image}
						<button type="submit" name="removePhoto" value="1" class="btn btn-danger">
							Remove
						</button>
					{/if}
				</div>
			</form>
		</div>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">About you</h2>
		<form method="post" action="?/updateProfile" use:enhance class="stack-sm">
			<label class="field">
				Bio
				<textarea name="bio" rows="3">{data.profile?.bio ?? ''}</textarea>
			</label>
			<div class="grid-2">
				<label class="field">
					City
					<input type="text" name="city" value={data.profile?.city ?? ''} />
				</label>
				<label class="field">
					Country code
					<input
						type="text"
						name="country"
						maxlength="2"
						placeholder="PH"
						value={data.profile?.country ?? ''}
						class="uppercase"
					/>
				</label>
			</div>
			{#if form?.profileMessage}
				<p class="alert alert-error">{form.profileMessage}</p>
			{/if}
			{#if form?.profileSuccess}
				<p class="alert alert-success">Profile saved.</p>
			{/if}
			<button type="submit" class="btn btn-primary">Save profile</button>
		</form>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">Chess platforms</h2>
		<div class="platforms">
			<div class="platform">
				<div class="platform-head">
					<div>
						<h3>Lichess</h3>
						{#if chessAccount('lichess')}
							{@const acc = chessAccount('lichess')}
							{@const entries = ratingEntries('lichess', acc.ratings, acc.rating)}
							<p class="hint">
								Linked as <strong>{acc.username}</strong>
								{#if acc.verified}· confirmed{/if}
							</p>
							{#if entries.length}
								<ul class="rating-chips">
									{#each entries as entry (entry.key)}
										<li>
											<span>{entry.label}</span>
											<strong>{entry.value}</strong>
										</li>
									{/each}
								</ul>
							{/if}
						{:else}
							<p class="hint">Not linked</p>
						{/if}
					</div>
					{#if chessAccount('lichess')}
						<form method="post" action="?/unlinkChess" use:enhance>
							<input type="hidden" name="platform" value="lichess" />
							<button type="submit" class="btn btn-danger">Unlink</button>
						</form>
					{:else if data.lichessConfigured}
						<a href={resolve('/api/chess/lichess/start')} class="btn btn-ink">Link Lichess</a>
					{:else}
						<span class="hint">Linking unavailable</span>
					{/if}
				</div>
			</div>

			<div class="platform">
				<div class="platform-head">
					<div>
						<h3>Chess.com</h3>
						{#if chessAccount('chesscom')}
							{@const acc = chessAccount('chesscom')}
							{@const entries = ratingEntries('chesscom', acc.ratings, acc.rating)}
							<p class="hint">
								Linked as <strong>{acc.username}</strong>
								{#if acc.verified}· confirmed{/if}
							</p>
							{#if entries.length}
								<ul class="rating-chips">
									{#each entries as entry (entry.key)}
										<li>
											<span>{entry.label}</span>
											<strong>{entry.value}</strong>
										</li>
									{/each}
								</ul>
							{/if}
						{:else}
							<p class="hint">Not linked</p>
						{/if}
					</div>
					{#if chessAccount('chesscom')}
						<form method="post" action="?/unlinkChess" use:enhance>
							<input type="hidden" name="platform" value="chesscom" />
							<button type="submit" class="btn btn-danger">Unlink</button>
						</form>
					{:else if data.chessComConfigured}
						<a href={resolve('/api/chess/chesscom/start')} class="btn btn-ink">Link Chess.com</a>
					{:else}
						<form method="post" action="?/linkChessCom" use:enhance class="inline-form">
							<input type="text" name="username" placeholder="Username" required />
							<button type="submit" class="btn btn-ink">Link</button>
						</form>
					{/if}
				</div>
				{#if form?.chessComMessage}
					<p class="alert alert-error">{form.chessComMessage}</p>
				{/if}
				{#if form?.chessComSuccess}
					<p class="alert alert-success">Chess.com linked.</p>
				{/if}
			</div>

			<div class="platform last">
				<h3>FIDE</h3>
				{#if chessAccount('fide')}
					{@const acc = chessAccount('fide')}
					{@const entries = ratingEntries('fide', acc.ratings, acc.rating)}
					<div class="platform-head">
						<div>
							<p class="hint">
								FIDE #<strong>{acc.username}</strong>
								{#if acc.federation}· {acc.federation}{/if}
								{#if acc.displayName}· {acc.displayName}{/if}
							</p>
							{#if entries.length}
								<ul class="rating-chips">
									{#each entries as entry (entry.key)}
										<li>
											<span>{entry.label}</span>
											<strong>{entry.value}</strong>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
						<form method="post" action="?/unlinkChess" use:enhance>
							<input type="hidden" name="platform" value="fide" />
							<button type="submit" class="btn btn-danger">Unlink</button>
						</form>
					</div>
				{:else}
					{#if form?.fideNeedsConfirm}
						<form method="post" action="?/linkFide" use:enhance class="fide-confirm">
							<input type="hidden" name="fideId" value={form.fideId} />
							<p class="hint">
								FIDE lists this ID as
								<strong>{form.fideDisplayName}</strong>
								{#if form.fideFederation}· {form.fideFederation}{/if}
							</p>
							{#if form?.fideMessage}
								<p class="alert alert-error">{form.fideMessage}</p>
							{/if}
							<label class="confirm-row">
								<input type="checkbox" name="confirmFideName" value="1" required />
								<span>Yes, this is my FIDE profile</span>
							</label>
							<button type="submit" class="btn btn-ink">Confirm and link</button>
						</form>
					{:else}
						<form method="post" action="?/linkFide" use:enhance class="inline-form">
							<input type="text" name="fideId" placeholder="e.g. 5200016" required />
							<button type="submit" class="btn btn-ink">Link</button>
						</form>
						<p class="hint">Your number from ratings.fide.com — one ChessHub account per FIDE ID.</p>
						{#if form?.fideMessage}
							<p class="alert alert-error">{form.fideMessage}</p>
						{/if}
					{/if}
					{#if form?.fideSuccess}
						<p class="alert alert-success">FIDE profile linked.</p>
					{/if}
				{/if}
			</div>
		</div>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">Social links</h2>
		<div class="social-forms">
			{#each Object.entries(SOCIAL_PLATFORMS) as [platform, label] (platform)}
				<form method="post" action="?/saveSocial" use:enhance class="social-row">
					<input type="hidden" name="platform" value={platform} />
					<label class="field grow">
						{label}
						<input type="url" name="url" placeholder="https://..." value={socialUrl(platform)} />
					</label>
					<button type="submit" class="btn btn-secondary">Save</button>
				</form>
			{/each}
			{#if form?.socialMessage}
				<p class="alert alert-error">{form.socialMessage}</p>
			{/if}
			{#if form?.socialSuccess}
				<p class="alert alert-success">Social link saved.</p>
			{/if}
		</div>
	</section>
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-8;
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.username-row {
		display: flex;
		align-items: center;
		gap: $space-2;
		margin-top: $space-2;

		span {
			color: $color-text-muted;
		}

		input {
			margin-top: 0;
		}
	}

	.lowercase :global(input),
	:global(input.lowercase) {
		text-transform: lowercase;
	}

	.uppercase :global(input),
	:global(input.uppercase) {
		text-transform: uppercase;
	}

	.share-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
	}

	.profile-url {
		margin: 0;
		padding: $space-2 $space-3;
		border-radius: $radius-md;
		background: color-mix(in srgb, $color-bg 55%, $color-surface);
		border: $border-width solid $color-border;
		font-family: ui-monospace, monospace;
		font-size: $font-size-sm;
		color: color-mix(in srgb, $color-text 85%, transparent);
	}

	.photo-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-4;
	}

	.photo-form {
		min-width: 0;
		flex: 1;
	}

	.photo-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
	}

	.hint {
		margin: 0;
		font-size: $font-size-xs;
		color: $color-text-muted;
	}

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.platforms {
		display: flex;
		flex-direction: column;
	}

	.platform {
		padding-bottom: $space-6;
		margin-bottom: $space-6;
		border-bottom: $border-width solid color-mix(in srgb, $color-border 70%, transparent);

		h3 {
			margin: 0 0 $space-2;
			font-size: $font-size-base;
			font-weight: $font-weight-semibold;
		}

		&.last {
			padding-bottom: 0;
			margin-bottom: 0;
			border-bottom: none;
		}
	}

	.platform-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: $space-4;
	}

	.rating-chips {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
		margin: $space-2 0 0;
		padding: 0;
		list-style: none;

		li {
			padding: $space-1 $space-2;
			border-radius: $radius-md;
			background: $color-bg;
			font-size: $font-size-xs;
		}

		span {
			color: $color-text-muted;
		}

		strong {
			margin-left: $space-1;
			font-variant-numeric: tabular-nums;
		}
	}

	.inline-form {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
		margin-top: $space-3;

		input {
			min-width: calc(var(--spacing) * 40);
			min-height: $size-touch-min;
			padding: $space-2 $space-3;
			border: $border-width solid $color-border;
			border-radius: $radius-md;
			font: inherit;
			font-size: $font-size-sm;
			color: $color-text;
			background-color: color-mix(in srgb, $color-bg 45%, $color-surface);
		}
	}

	.fide-confirm {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: $space-3;
		margin-top: $space-3;
	}

	.confirm-row {
		display: flex;
		align-items: flex-start;
		gap: $space-2;
		font-size: $font-size-sm;
		cursor: pointer;

		input {
			margin-top: 0.2em;
		}
	}

	.social-forms {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.social-row {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: $space-2;
	}

	.grow {
		min-width: calc(var(--spacing) * 48);
		flex: 1;
	}
</style>
