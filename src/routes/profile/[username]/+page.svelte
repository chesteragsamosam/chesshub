<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { PLATFORM_LABELS, chessProfileHref, ratingEntries } from '$lib/chess-ratings';
	import { SOCIAL_PLATFORMS } from '$lib/social';
	import { isOrganizer } from '$lib/roles';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import FollowButton from '$lib/components/FollowButton.svelte';
	import { profileSlug } from '$lib/username';

	let { data } = $props();

	const shareUrl = $derived(`${$page.url.origin}/profile/${data.profileUser.slug}`);
	const locationLabel = $derived(
		[data.profile?.city, data.profile?.country].filter(Boolean).join(', ')
	);
	const memberSince = $derived(
		data.profile?.createdAt
			? new Date(data.profile.createdAt).toLocaleDateString(undefined, {
					month: 'long',
					year: 'numeric'
				})
			: null
	);
	const canFollow = $derived(Boolean(data.user) && !data.isOwnProfile);

	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// ignore
		}
	}

	/** @param {string} platform */
	function platformLabel(platform) {
		return PLATFORM_LABELS[platform] ?? platform;
	}
</script>

<div class="page stack">
	<section class="panel identity">
		<UserAvatar name={data.profileUser.name} image={data.profileUser.image} size="xl" />
		<div class="identity-body">
			<div class="name-row">
				<h1 class="page-title">{data.profileUser.name}</h1>
				{#if isOrganizer(data.profileUser.role)}
					<span class="badge badge-brand">Organizer</span>
				{/if}
			</div>

			{#if data.profileUser.username}
				<p class="username">@{data.profileUser.username}</p>
			{/if}

			<div class="meta-row">
				<a href={resolve(`/profile/${data.profileUser.slug}/followers`)} class="stat-link">
					<strong>{data.followerCount}</strong>
					{data.followerCount === 1 ? 'follower' : 'followers'}
				</a>
				<a href={resolve(`/profile/${data.profileUser.slug}/following`)} class="stat-link">
					<strong>{data.followingCount}</strong>
					following
				</a>
				{#if locationLabel}
					<span>{locationLabel}</span>
				{/if}
				{#if memberSince}
					<span>Member since {memberSince}</span>
				{/if}
				{#if data.chessAccounts.length}
					<span>
						{data.chessAccounts.length}
						{data.chessAccounts.length === 1 ? 'platform' : 'platforms'} linked
					</span>
				{/if}
			</div>

			<div class="actions-row">
				{#if canFollow}
					<FollowButton
						targetUserId={data.profileUser.id}
						isFollowing={data.isFollowing}
					/>
				{:else if !data.user && !data.isOwnProfile}
					<a href={resolve('/login')} class="btn btn-primary">Sign in to follow</a>
				{/if}
			</div>

			{#if data.profile?.bio}
				<p class="bio">{data.profile.bio}</p>
			{/if}

			{#if data.profileUser.username}
				<div class="share">
					<code>{shareUrl}</code>
					<button type="button" class="btn btn-secondary" onclick={copyLink}>
						{copied ? 'Copied' : 'Copy link'}
					</button>
				</div>
			{/if}
		</div>
	</section>

	{#if data.isOwnProfile && data.recommendations.length}
		<section class="stack-sm">
			<header>
				<h2 class="section-title">Suggested players to follow</h2>
				<p class="page-lede">Based on your location, network, and community activity.</p>
			</header>

			<ul class="recommendations">
				{#each data.recommendations as person (person.id)}
					<li class="panel recommendation">
						<a href={resolve(`/profile/${profileSlug(person)}`)} class="recommendation-link">
							<UserAvatar name={person.name} image={person.image} size="md" />
							<div class="recommendation-meta">
								<p class="recommendation-name">{person.name}</p>
								{#if person.username}
									<p class="recommendation-handle">@{person.username}</p>
								{/if}
								<p class="recommendation-reason">{person.reason}</p>
							</div>
						</a>
						<FollowButton targetUserId={person.id} isFollowing={false} size="sm" />
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="stack-sm">
		<header>
			<h2 class="section-title">Chess ratings</h2>
			<p class="page-lede">Live ratings from Lichess, Chess.com, and FIDE public profiles.</p>
		</header>

		{#if data.chessAccounts.length}
			<div class="ratings">
				{#each data.chessAccounts as account (account.id)}
					{@const href = chessProfileHref(account.platform, account.username)}
					{@const entries = ratingEntries(account.platform, account.ratings, account.rating)}
					<article class="panel rating-card">
						<div class="rating-head">
							<div>
								<div class="name-row">
									<h3>{platformLabel(account.platform)}</h3>
									{#if account.verified}
										<span class="badge badge-success">Verified</span>
									{/if}
								</div>
								{#if href}
									<a {href} target="_blank" rel="noopener noreferrer external" class="link handle">
										{#if account.platform === 'fide'}
											ID {account.username}
										{:else}
											@{account.username}
										{/if}
									</a>
								{:else}
									<p class="handle muted">{account.username}</p>
								{/if}
								{#if account.displayName && account.displayName !== account.username}
									<p class="muted">{account.displayName}</p>
								{/if}
							</div>
							{#if account.rating}
								<div class="primary-rating">
									<p>{account.rating}</p>
									<span>Primary</span>
								</div>
							{/if}
						</div>

						{#if entries.length}
							<dl class="rating-grid">
								{#each entries as entry (entry.key)}
									<div>
										<dt>{entry.label}</dt>
										<dd>{entry.value}</dd>
									</div>
								{/each}
							</dl>
						{:else}
							<p class="muted empty-ratings">No public ratings found yet.</p>
						{/if}
					</article>
				{/each}
			</div>
		{:else}
			<p class="panel-dashed">No chess platforms linked yet.</p>
		{/if}
	</section>

	{#if data.socialLinks.length}
		<section class="panel">
			<h2 class="section-title">Social</h2>
			<ul class="social">
				{#each data.socialLinks as link (link.id)}
					<li>
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer external"
							class="btn btn-secondary"
						>
							{SOCIAL_PLATFORMS[/** @type {keyof typeof SOCIAL_PLATFORMS} */ (link.platform)] ??
								link.platform}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<p class="footer-link">
		<a href={resolve('/players')} class="link">Search more players</a>
	</p>
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

	.identity {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: $space-6;
	}

	.identity-body {
		min-width: 0;
		flex: 1;
	}

	.name-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;

		h3 {
			margin: 0;
			font-weight: $font-weight-semibold;
		}
	}

	.username {
		margin: $space-1 0 0;
		font-size: $font-size-lg;
		color: $color-text-muted;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: $space-4 $space-4;
		margin-top: $space-3;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.stat-link {
		color: inherit;
		text-decoration: none;

		strong {
			color: $color-text;
			font-weight: $font-weight-semibold;
		}

		&:hover strong {
			color: $color-primary;
		}
	}

	.actions-row {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
		margin-top: $space-4;
	}

	.recommendations {
		display: grid;
		gap: $space-3;
		margin: 0;
		padding: 0;
		list-style: none;

		@media (min-width: $breakpoint-md) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.recommendation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
	}

	.recommendation-link {
		display: flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: $space-3;
		color: inherit;
		text-decoration: none;
	}

	.recommendation-meta {
		min-width: 0;
	}

	.recommendation-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: $font-weight-semibold;
	}

	.recommendation-handle,
	.recommendation-reason {
		margin: $space-1 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.bio {
		margin: $space-4 0 0;
		max-width: var(--container-2xl);
		white-space: pre-wrap;
		line-height: $line-height-relaxed;
	}

	.share {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		margin-top: $space-5;

		code {
			padding: $space-2 $space-3;
			border-radius: $radius-md;
			background: $color-bg;
			font-size: $font-size-sm;
			color: color-mix(in srgb, $color-text 85%, transparent);
		}
	}

	.ratings {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-md) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		@media (min-width: $breakpoint-xl) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.rating-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: $space-3;
	}

	.handle {
		display: block;
		margin-top: $space-1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: $font-size-sm;
	}

	.muted {
		margin: $space-1 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.primary-rating {
		text-align: right;

		p {
			margin: 0;
			font-family: $font-display;
			font-size: $font-size-2xl;
			font-weight: $font-weight-bold;
			font-variant-numeric: tabular-nums;
		}

		span {
			font-size: $font-size-xs;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
			color: $color-text-muted;
		}
	}

	.rating-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: $space-2;
		margin: $space-4 0 0;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		div {
			padding: $space-2 $space-3;
			border-radius: $radius-md;
			background: $color-bg;
		}

		dt {
			font-size: $font-size-xs;
			font-weight: $font-weight-medium;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
			color: $color-text-muted;
		}

		dd {
			margin: $space-1 0 0;
			font-size: $font-size-lg;
			font-weight: $font-weight-semibold;
			font-variant-numeric: tabular-nums;
		}
	}

	.empty-ratings {
		margin-top: $space-4;
	}

	.social {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
		margin: $space-4 0 0;
		padding: 0;
		list-style: none;
	}

	.footer-link {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}
</style>
