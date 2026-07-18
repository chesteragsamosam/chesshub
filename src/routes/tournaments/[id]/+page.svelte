<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import VenueMap from '$lib/components/VenueMap.svelte';

	let { data, form } = $props();

	let submitting = $state(false);
	let checkoutUrl = $state('');
	/** Client-side countdown tick (ms). */
	let nowMs = $state(Date.now());
	/** When the current live payload was received (for ticking secondsToFinish). */
	let liveLoadedAtMs = $state(data.lichessLiveFetchedAt ?? Date.now());
	/** @type {typeof data.lichessLive} */
	let live = $state(data.lichessLive);
	/** @type {string | null} */
	let liveError = $state(data.lichessLiveError);
	/** @type {'idle' | 'connecting' | 'live' | 'reconnecting' | 'closed'} */
	let liveStreamState = $state('idle');
	/** @type {string} */
	let tournamentStatus = $state(data.tournament.status);

	$effect(() => {
		// Re-seed only when navigating to a different tournament (not on checkout invalidate).
		const tournamentId = data.tournament.id;
		live = untrack(() => data.lichessLive);
		liveError = untrack(() => data.lichessLiveError);
		liveLoadedAtMs = untrack(() => data.lichessLiveFetchedAt) ?? Date.now();
		tournamentStatus = untrack(() => data.tournament.status);
		nowMs = Date.now();
		void tournamentId;
	});

	// Keep badge/registration in sync after invalidateAll (e.g. Arena finished).
	$effect(() => {
		tournamentStatus = data.tournament.status;
	});

	/** @param {number} cents @param {string} currency */
	function formatFee(cents, currency) {
		if (!cents) return 'Free';
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: (currency || 'php').toUpperCase()
		}).format(cents / 100);
	}

	/** @param {Date | string} d */
	function formatDate(d) {
		return new Date(d).toLocaleString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	/** @param {number} totalSeconds */
	function formatCountdown(totalSeconds) {
		const seconds = Math.max(0, Math.floor(totalSeconds));
		const days = Math.floor(seconds / 86_400);
		const hours = Math.floor((seconds % 86_400) / 3_600);
		const minutes = Math.floor((seconds % 3_600) / 60);
		const secs = seconds % 60;
		if (days > 0) return `${days}d ${hours}h ${minutes}m`;
		if (hours > 0)
			return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
		return `${minutes}m ${String(secs).padStart(2, '0')}s`;
	}

	/** @param {number | null | undefined} clockSeconds */
	function formatClock(clockSeconds) {
		if (clockSeconds == null || !Number.isFinite(clockSeconds)) return '—';
		const total = Math.max(0, Math.floor(clockSeconds));
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const isPaid = $derived(data.tournament.entryFeeCents > 0);
	const isLichessArena = $derived(
		data.tournament.modality === 'lichess' &&
			data.tournament.lichessTournamentFormat === 'arena' &&
			Boolean(data.tournament.lichessTournamentId)
	);

	const liveStatusLabel = $derived(
		live?.status === 'finished'
			? 'Finished'
			: live?.status === 'started'
				? 'Live'
				: live
					? 'Starting soon'
					: null
	);

	const countdownSeconds = $derived.by(() => {
		const elapsed = Math.max(0, (nowMs - liveLoadedAtMs) / 1000);
		if (!live) {
			const start = new Date(data.tournament.startDate).getTime();
			if (!Number.isFinite(start) || start <= nowMs) return null;
			return Math.ceil((start - nowMs) / 1000);
		}
		if (live.status === 'created') {
			if (live.startsAt) {
				const startMs = Number(live.startsAt);
				if (Number.isFinite(startMs)) return Math.max(0, Math.ceil((startMs - nowMs) / 1000));
			}
			if (live.secondsToStart != null) {
				return Math.max(0, Math.ceil(live.secondsToStart - elapsed));
			}
		}
		if (live.status === 'started' && live.secondsToFinish != null) {
			return Math.max(0, Math.ceil(live.secondsToFinish - elapsed));
		}
		return null;
	});

	const countdownLabel = $derived(
		live?.status === 'started'
			? 'Time remaining'
			: live?.status === 'finished'
				? null
				: 'Starts in'
	);

	const shouldStreamLive = $derived(
		isLichessArena && live?.status !== 'finished' && tournamentStatus !== 'completed'
	);

	const shouldPollCheckout = $derived(
		isPaid &&
			(data.registration?.status === 'pending' ||
				data.checkoutOutcome === 'confirming' ||
				Boolean(checkoutUrl))
	);

	const CHECKOUT_SYNC_KEY = 'chesshub:checkout-sync';

	// Tell other open tabs (the original tournament page) when this tab learns an outcome.
	$effect(() => {
		const outcome = data.checkoutOutcome;
		if (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'expired') return;
		try {
			localStorage.setItem(
				CHECKOUT_SYNC_KEY,
				JSON.stringify({
					tournamentId: data.tournament.id,
					outcome,
					at: Date.now()
				})
			);
		} catch {
			// ignore quota / private mode
		}
	});

	// While checkout is pending, refresh often — and immediately when the tab is focused again.
	$effect(() => {
		if (!shouldPollCheckout) return;

		const refresh = () => {
			if (document.visibilityState === 'visible') {
				invalidateAll();
			}
		};

		refresh();
		const timer = setInterval(refresh, 2500);

		const onVisible = () => {
			if (document.visibilityState === 'visible') invalidateAll();
		};
		const onStorage = (/** @type {StorageEvent} */ event) => {
			if (event.key !== CHECKOUT_SYNC_KEY || !event.newValue) return;
			try {
				const msg = JSON.parse(event.newValue);
				if (msg?.tournamentId === data.tournament.id) invalidateAll();
			} catch {
				// ignore
			}
		};

		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);
		window.addEventListener('storage', onStorage);

		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('focus', onVisible);
			window.removeEventListener('storage', onStorage);
		};
	});

	$effect(() => {
		if (data.viewerAward?.claim.status !== 'processing') return;
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') invalidateAll();
		}, 5000);
		return () => clearInterval(timer);
	});

	// Shared server poller → SSE push (standings / featured / countdown).
	$effect(() => {
		if (!shouldStreamLive) {
			liveStreamState = live?.status === 'finished' ? 'closed' : 'idle';
			return;
		}

		const url = resolve(`/api/tournaments/${data.tournament.id}/live`);
		const es = new EventSource(url);
		liveStreamState = 'connecting';

		es.addEventListener('snapshot', (event) => {
			try {
				const payload = JSON.parse(/** @type {MessageEvent} */ (event).data);
				const { fetchedAt, ...snapshot } = payload;
				live = snapshot;
				liveError = null;
				liveLoadedAtMs = typeof fetchedAt === 'number' ? fetchedAt : Date.now();
				nowMs = Date.now();
				liveStreamState = 'live';
				if (snapshot.status === 'finished') {
					tournamentStatus = 'completed';
					liveStreamState = 'closed';
					invalidateAll();
					es.close();
				}
			} catch {
				// ignore malformed events
			}
		});

		es.addEventListener('featured', (event) => {
			try {
				const patch = JSON.parse(/** @type {MessageEvent} */ (event).data);
				if (!live?.featured || live.featured.id !== patch.id) return;
				live = {
					...live,
					featured: {
						...live.featured,
						fen: patch.fen ?? live.featured.fen,
						lastMove: patch.lastMove ?? live.featured.lastMove,
						clocks: patch.clocks ?? live.featured.clocks
					}
				};
				if (typeof patch.fetchedAt === 'number') {
					liveLoadedAtMs = patch.fetchedAt;
				}
				nowMs = Date.now();
			} catch {
				// ignore
			}
		});

		es.addEventListener('live-error', (event) => {
			try {
				const payload = JSON.parse(/** @type {MessageEvent} */ (event).data);
				liveError = payload.message ?? 'Live stream error';
			} catch {
				liveError = 'Live stream error';
			}
		});

		es.addEventListener('tournament-status', (event) => {
			try {
				const payload = JSON.parse(/** @type {MessageEvent} */ (event).data);
				if (payload.status === 'completed') {
					tournamentStatus = 'completed';
					es.close();
					liveStreamState = 'closed';
					invalidateAll();
				}
			} catch {
				// ignore
			}
		});

		es.onopen = () => {
			liveStreamState = 'live';
		};

		es.onerror = () => {
			liveStreamState = 'reconnecting';
		};

		return () => {
			es.close();
		};
	});

	$effect(() => {
		if (countdownSeconds == null || countdownSeconds <= 0) return;
		const timer = setInterval(() => {
			nowMs = Date.now();
		}, 1000);
		return () => clearInterval(timer);
	});

	function submitRegister() {
		submitting = true;
		checkoutUrl = '';
		// Open the tab synchronously (in the click handler) so the browser
		// does not block the popup. We set its URL once the server responds.
		const checkoutTab = isPaid ? window.open('', '_blank') : null;

		return async (
			/** @type {{ result: any, update: () => Promise<void> }} */ { result, update }
		) => {
			submitting = false;

			if (result.type === 'success' && result.data?.checkoutUrl) {
				checkoutUrl = result.data.checkoutUrl;
				if (checkoutTab && !checkoutTab.closed) {
					checkoutTab.location.href = result.data.checkoutUrl;
				} else {
					window.open(result.data.checkoutUrl, '_blank');
				}
				// Refresh registration status (webhook confirms payment separately).
				await invalidateAll();
				return;
			}

			checkoutTab?.close();
			await update();
		};
	}
</script>

<article class="page stack">
	<header>
		<p class="status-row">
			<span class="status">{tournamentStatus}</span>
			<span class="modality-badge">
				{data.tournament.modality === 'otb' ? 'OTB' : 'Lichess'}
			</span>
			{#if data.tournament.timeControl}
				<span class="tc-badge">
					{data.tournament.timeControl.label}
					· {data.tournament.timeControl.clock}
				</span>
			{/if}
			{#if liveStatusLabel}
				<span class="live-badge" class:is-live={live?.status === 'started'}>{liveStatusLabel}</span>
			{/if}
		</p>
		<h1 class="page-title">{data.tournament.title}</h1>
		{#if data.organizer}
			<p class="page-lede">
				Organized by
				<a href={resolve(`/profile/${data.organizer.slug}`)} class="link">{data.organizer.name}</a>
			</p>
		{/if}
	</header>

	{#if data.checkoutNotice}
		<p
			class="alert"
			class:alert-success={data.checkoutNotice.tone === 'success'}
			class:alert-warning={data.checkoutNotice.tone === 'warning'}
			class:alert-error={data.checkoutNotice.tone === 'error'}
		>
			<strong>{data.checkoutNotice.title}.</strong>
			{data.checkoutNotice.body}
		</p>
	{/if}

	{#if form?.message}
		<p class="alert alert-error">
			{#if form.checkoutOutcome === 'failed'}
				<strong>Payment failed.</strong>
			{:else if form.checkoutOutcome === 'expired'}
				<strong>Payment expired.</strong>
			{:else if form.payoutOutcome === 'failed'}
				<strong>Payout failed.</strong>
			{/if}
			{form.message}
		</p>
	{/if}
	{#if form?.needsLichessLink}
		<p class="alert alert-warning">
			<a
				href={`${resolve('/api/chess/lichess/start')}?returnTo=${encodeURIComponent(`/tournaments/${data.tournament.id}`)}`}
				class="link"
			>
				Connect Lichess
			</a>
			so ChessHub can join the Arena for you.
		</p>
	{/if}
	{#if form?.free}
		<p class="alert alert-success">You are registered.</p>
	{/if}
	{#if form?.lichessJoined}
		<p class="alert alert-success">
			You joined the Lichess Arena. Open Lichess when the event starts to play.
		</p>
	{/if}
	{#if form?.claimSubmitted}
		<p class="alert alert-success">
			Your GCash prize payout is {form.claimStatus === 'paid' ? 'complete' : 'being processed'}.
		</p>
	{/if}

	<div class="layout">
		<div class="main-col">
			{#if isLichessArena}
				<section class="panel live-panel">
					<div class="live-header">
						<h2 class="section-title">Live Arena</h2>
						{#if live}
							<a href={live.fullUrl} class="link" target="_blank" rel="noopener noreferrer">
								Open on Lichess
							</a>
						{/if}
					</div>

					{#if liveError && !live}
						<p class="hint">{liveError}</p>
						{#if countdownSeconds != null && countdownLabel}
							<p class="countdown fallback-countdown">
								{countdownLabel}: <strong>{formatCountdown(countdownSeconds)}</strong>
							</p>
						{/if}
					{:else if !live}
						<p class="empty-players">
							{#if liveStreamState === 'connecting' || liveStreamState === 'reconnecting'}
								Connecting to live Arena updates…
							{:else}
								Live Arena data is unavailable right now.
							{/if}
						</p>
						{#if countdownSeconds != null && countdownLabel}
							<p class="countdown fallback-countdown">
								{countdownLabel}: <strong>{formatCountdown(countdownSeconds)}</strong>
							</p>
						{/if}
					{:else}
						<div class="live-meta">
							<span>{live.nbPlayers} on Lichess</span>
							{#if countdownLabel && countdownSeconds != null}
								<span class="countdown">
									{countdownLabel}: <strong>{formatCountdown(countdownSeconds)}</strong>
								</span>
							{:else if live.status === 'finished'}
								<span>Arena finished</span>
							{/if}
						</div>

						{#if live.featured}
							<div class="featured">
								<h3 class="live-subtitle">Featured game</h3>
								<p class="featured-players">
									<span>
										{#if live.featured.white.rank}#{live.featured.white.rank}{/if}
										{live.featured.white.name}
										{#if live.featured.white.rating}
											<span class="muted-inline">({live.featured.white.rating})</span>
										{/if}
										{#if live.featured.clocks}
											<span class="clock">{formatClock(live.featured.clocks.white)}</span>
										{/if}
									</span>
									<span class="vs">vs</span>
									<span>
										{#if live.featured.black.rank}#{live.featured.black.rank}{/if}
										{live.featured.black.name}
										{#if live.featured.black.rating}
											<span class="muted-inline">({live.featured.black.rating})</span>
										{/if}
										{#if live.featured.clocks}
											<span class="clock">{formatClock(live.featured.clocks.black)}</span>
										{/if}
									</span>
								</p>
								<a
									href={`https://lichess.org/${live.featured.id}`}
									class="link"
									target="_blank"
									rel="noopener noreferrer"
								>
									Watch on Lichess
								</a>
								{#if live.featured.lastMove}
									<p class="featured-move">Last move: {live.featured.lastMove}</p>
								{/if}
							</div>
						{/if}

						{#if live.duels.length > 0 && live.status === 'started'}
							<div class="duels">
								<h3 class="live-subtitle">Playing now</h3>
								<ul class="duel-list">
									{#each live.duels.slice(0, 8) as duel (duel.id)}
										<li>
											<a
												href={`https://lichess.org/${duel.id}`}
												class="duel-link"
												target="_blank"
												rel="noopener noreferrer"
											>
												<span
													>{duel.white}{#if duel.whiteRating}
														({duel.whiteRating}){/if}</span
												>
												<span class="vs">vs</span>
												<span
													>{duel.black}{#if duel.blackRating}
														({duel.blackRating}){/if}</span
												>
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if live.standing.length > 0}
							<div class="standings">
								<h3 class="live-subtitle">
									{live.status === 'finished' ? 'Final standings' : 'Standings'}
								</h3>
								<table class="standing-table">
									<thead>
										<tr>
											<th>Rank</th>
											<th>Player</th>
											<th>Rating</th>
											<th>Score</th>
										</tr>
									</thead>
									<tbody>
										{#each live.standing as player (player.rank + player.name)}
											<tr>
												<td>{player.rank}</td>
												<td>
													{#if player.title}<span class="title-tag">{player.title}</span>{/if}
													{player.name}
												</td>
												<td>{player.rating ?? '—'}</td>
												<td>{player.score}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else if live.status === 'created'}
							<p class="empty-players">
								Players will appear here once they join the Arena on Lichess.
							</p>
						{/if}

						{#if shouldStreamLive}
							<p class="live-refresh">
								{#if liveStreamState === 'live'}
									Live updates while this page is open.
								{:else if liveStreamState === 'reconnecting'}
									Reconnecting to live updates…
								{:else if liveStreamState === 'connecting'}
									Connecting to live updates…
								{:else}
									Live updates while this page is open.
								{/if}
							</p>
						{/if}
					{/if}
				</section>
			{/if}

			<section class="panel">
				<h2 class="section-title">Details</h2>
				<dl class="details">
					<div>
						<dt>Starts</dt>
						<dd>{formatDate(data.tournament.startDate)}</dd>
					</div>
					{#if data.tournament.endDate}
						<div>
							<dt>Ends</dt>
							<dd>{formatDate(data.tournament.endDate)}</dd>
						</div>
					{/if}
					<div>
						<dt>Location</dt>
						<dd>
							{#if data.tournament.modality === 'lichess'}
								Online · Lichess
							{:else}
								{[
									data.tournament.venue,
									data.tournament.city,
									data.tournament.state,
									data.tournament.country
								]
									.filter(Boolean)
									.join(', ') || 'TBA'}
							{/if}
						</dd>
					</div>
					{#if data.tournament.modality === 'otb' &&
						data.tournament.latitude != null &&
						data.tournament.longitude != null &&
						data.googleMapsApiKey}
						<div class="venue-map-block">
							<dt>Map</dt>
							<dd>
								<VenueMap
									apiKey={data.googleMapsApiKey}
									latitude={data.tournament.latitude}
									longitude={data.tournament.longitude}
									title={data.tournament.venue}
								/>
							</dd>
						</div>
					{:else if data.tournament.modality === 'otb' &&
						data.tournament.latitude != null &&
						data.tournament.longitude != null}
						<div>
							<dt>Map</dt>
							<dd>
								<a
									href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
										`${data.tournament.latitude},${data.tournament.longitude}`
									)}`}
									class="link"
									target="_blank"
									rel="noopener noreferrer"
								>
									Open in Google Maps
								</a>
							</dd>
						</div>
					{/if}
					<div>
						<dt>Entry fee</dt>
						<dd>{formatFee(data.tournament.entryFeeCents, data.tournament.currency)}</dd>
					</div>
					<div>
						<dt>Registered</dt>
						<dd>
							{data.paidCount}{#if data.tournament.maxPlayers}
								/ {data.tournament.maxPlayers}{/if}
						</dd>
					</div>
				</dl>
			</section>

			{#if data.sponsors.length > 0}
				<section class="panel">
					<h2 class="section-title">Sponsors</h2>
					<ul class="sponsor-list">
						{#each data.sponsors as sponsor (sponsor.id)}
							<li>
								{#if sponsor.url}
									<a
										href={sponsor.url}
										class="link"
										target="_blank"
										rel="noopener noreferrer"
									>
										{sponsor.name}
									</a>
								{:else}
									{sponsor.name}
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.tournament.description}
				<section class="panel">
					<h2 class="section-title">About</h2>
					<p class="about">{data.tournament.description}</p>
				</section>
			{/if}

			{#if data.prizes.length > 0}
				<section class="panel prize-section">
					<h2 class="section-title">
						{data.awards.length > 0 ? 'Prize winners' : 'Prizes'}
					</h2>
					<ul class="prize-list">
						{#if data.awards.length > 0}
							{#each data.awards as award (award.id)}
								<li>
									<div>
										<strong>#{award.placement} · {award.prizeLabel}</strong>
										<p>
											<a href={resolve(`/profile/${award.username || award.userId}`)} class="link">
												{award.name}
											</a>
											· Lichess: {award.lichessUsername}
										</p>
									</div>
									<strong>{formatFee(award.amountCents, 'php')}</strong>
								</li>
							{/each}
						{:else}
							{#each data.prizes as prize (prize.id)}
								<li>
									<strong>#{prize.placement} · {prize.label}</strong>
									<strong>{formatFee(prize.amountCents, 'php')}</strong>
								</li>
							{/each}
						{/if}
					</ul>

					{#if data.viewerAward}
						<div class="claim-card">
							<h3>Your prize: {formatFee(data.viewerAward.award.amountCents, 'php')}</h3>
							{#if data.viewerAward.claim.status === 'paid'}
								<p class="alert alert-success">
									Paid to {data.viewerAward.claim.destinationMasked}.
								</p>
							{:else if data.viewerAward.claim.status === 'processing'}
								<p class="alert alert-warning">
									Your GCash payout is processing. This page will update automatically.
								</p>
							{:else}
								{#if data.viewerAward.claim.status === 'failed'}
									<p class="alert alert-error">
										<strong>Payout failed.</strong>
										{data.viewerAward.claim.failureReason ??
											'Check your GCash details and try again.'}
									</p>
								{/if}
								{#if data.disbursementsConfigured}
									<form method="post" action="?/claimPrize" use:enhance class="claim-form">
										<label class="field">
											Name on GCash account
											<input
												name="recipientName"
												required
												maxlength="255"
												autocomplete="name"
												value={data.viewerAward.claim.recipientName ?? data.user?.name ?? ''}
											/>
										</label>
										<label class="field">
											GCash mobile number
											<input
												name="gcashMobile"
												required
												inputmode="tel"
												autocomplete="tel"
												placeholder="09XXXXXXXXX"
												pattern="(?:\+?63|0)9\d{9}"
											/>
										</label>
										<p class="hint">
											Confirm the account name and number carefully. Payouts are sent automatically.
										</p>
										<button type="submit" class="btn btn-primary">Claim via GCash</button>
									</form>
								{:else}
									<p class="alert alert-warning">GCash prize payouts aren’t available yet.</p>
								{/if}
							{/if}
						</div>
					{/if}
				</section>
			{/if}

			<section class="panel">
				<h2 class="section-title">Registered players</h2>
				{#if data.registeredPlayers.length === 0}
					<p class="empty-players">No players registered yet.</p>
				{:else}
					<ul class="player-list">
						{#each data.registeredPlayers as player (player.id)}
							<li>
								<a href={resolve(`/profile/${player.slug}`)} class="player-link">
									<UserAvatar name={player.name} image={player.image} size="sm" />
									<span class="player-meta">
										<span class="player-name">{player.name}</span>
										{#if player.username}
											<span class="player-username">@{player.username}</span>
										{/if}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		<aside class="panel register">
			<h2 class="section-title">Registration</h2>
			<p class="fee">{formatFee(data.tournament.entryFeeCents, data.tournament.currency)}</p>

			{#if tournamentStatus === 'draft'}
				<p class="full">
					This tournament isn’t published yet, so registration is closed.
				</p>
			{:else if tournamentStatus === 'cancelled'}
				<p class="full">This tournament has been cancelled.</p>
			{:else if tournamentStatus === 'completed'}
				<p class="full">Registration is closed.</p>
			{:else if data.registration?.status === 'paid'}
				<p class="alert alert-success">You are registered for this tournament.</p>
				{#if data.lichessJoin?.available}
					{#if data.lichessJoin.joinedAt}
						<p class="hint">
							Joined on Lichess as {data.lichessJoin.lichessUsername ?? 'your account'}.
						</p>
						<form method="post" action="?/joinLichess" use:enhance class="join-lichess">
							<button type="submit" class="btn btn-ink btn-block">Re-join Lichess Arena</button>
						</form>
					{:else if data.lichessJoin.hasLinkedLichess}
						<form method="post" action="?/joinLichess" use:enhance class="join-lichess">
							<button type="submit" class="btn btn-primary btn-block">Join Lichess Arena</button>
						</form>
						<p class="hint">
							ChessHub will add you to the private Lichess Arena automatically.
						</p>
					{:else}
						<a
							href={`${resolve('/api/chess/lichess/start')}?returnTo=${encodeURIComponent(`/tournaments/${data.tournament.id}`)}`}
							class="btn btn-primary btn-block"
						>
							Connect Lichess to join
						</a>
						<p class="hint">Link your Lichess account, then join the Arena from ChessHub.</p>
					{/if}
				{/if}
			{:else if data.spotsLeft === 0}
				<p class="full">This tournament is full.</p>
			{:else if !data.user}
				<a href={resolve('/login')} class="btn btn-primary btn-block">Sign in to register</a>
			{:else}
				{#if data.checkoutNotice && (data.checkoutNotice.tone === 'error' || data.checkoutNotice.tone === 'warning') && data.registration?.status === 'pending'}
					<p
						class="alert"
						class:alert-warning={data.checkoutNotice.tone === 'warning'}
						class:alert-error={data.checkoutNotice.tone === 'error'}
					>
						<strong>{data.checkoutNotice.title}.</strong>
						{data.checkoutNotice.body}
					</p>
				{/if}
				<form method="post" action="?/register" use:enhance={submitRegister}>
					<button type="submit" class="btn btn-primary btn-block" disabled={submitting}>
						{#if isPaid}
							{#if submitting}
								Starting checkout…
							{:else if data.checkoutOutcome === 'failed' || data.checkoutOutcome === 'expired'}
								Try payment again
							{:else if data.registration?.status === 'pending'}
								Continue payment
							{:else}
								Pay with GCash or QR Ph
							{/if}
						{:else}
							Register for free
						{/if}
					</button>
				</form>
				{#if isPaid && (checkoutUrl || data.registration?.status === 'pending')}
					<p class="hint">
						{#if data.checkoutOutcome === 'failed' || data.checkoutOutcome === 'expired'}
							Start a new GCash or QR Ph payment when you are ready.
						{:else}
							Complete your payment in the new tab.
							{#if checkoutUrl}
								Didn’t see it?
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={checkoutUrl} target="_blank" rel="noopener" class="link">Open checkout</a>.
							{/if}
							This page updates automatically once your payment is confirmed.
						{/if}
					</p>
				{/if}
				{#if isPaid && !data.paymongoConfigured}
					<p class="hint">Online payments aren’t available for this event yet.</p>
				{/if}
			{/if}
		</aside>
	</div>
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.status-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		margin: 0 0 $space-2;
	}

	.status {
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text-muted;
	}

	.modality-badge {
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-primary;
	}

	.tc-badge {
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text;
		font-variant-numeric: tabular-nums;
	}

	.live-badge {
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text-muted;

		&.is-live {
			color: $color-danger;
		}
	}

	.layout {
		display: grid;
		gap: $space-6;

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	.main-col {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.live-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: $space-2;
	}

	.live-meta {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3 $space-5;
		margin-top: $space-3;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.countdown strong {
		color: $color-text;
		font-variant-numeric: tabular-nums;
	}

	.fallback-countdown {
		margin: $space-3 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.live-subtitle {
		margin: $space-4 0 $space-2;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text-muted;
	}

	.featured-players {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		margin: 0 0 $space-2;
		font-size: $font-size-sm;
	}

	.muted-inline {
		color: $color-text-muted;
	}

	.clock {
		margin-left: $space-1;
		font-variant-numeric: tabular-nums;
		color: $color-text-muted;
	}

	.vs {
		color: $color-text-muted;
		font-size: $font-size-xs;
		text-transform: uppercase;
	}

	.featured-move {
		margin: $space-2 0 0;
		font-size: $font-size-xs;
		font-variant-numeric: tabular-nums;
		color: $color-text-muted;
	}

	.duel-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: $space-1;
	}

	.duel-link {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		padding: $space-2 0;
		font-size: $font-size-sm;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid color-mix(in srgb, $color-border 70%, transparent);

		&:hover {
			color: $color-primary;
		}
	}

	.standing-table {
		width: 100%;
		border-collapse: collapse;
		font-size: $font-size-sm;

		th,
		td {
			padding: $space-2 $space-2;
			text-align: left;
			border-bottom: 1px solid $color-border;
		}

		th {
			font-size: $font-size-xs;
			font-weight: $font-weight-semibold;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
			color: $color-text-muted;
		}

		td:first-child,
		th:first-child,
		td:last-child,
		th:last-child {
			font-variant-numeric: tabular-nums;
		}
	}

	.title-tag {
		margin-right: $space-1;
		font-weight: $font-weight-semibold;
		color: $color-primary;
	}

	.live-refresh {
		margin: $space-3 0 0;
		font-size: $font-size-xs;
		color: $color-text-muted;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: $space-3;
		margin: $space-4 0 0;

		div {
			display: flex;
			justify-content: space-between;
			gap: $space-4;
			font-size: $font-size-sm;
		}

		.venue-map-block {
			flex-direction: column;
			align-items: stretch;

			dd {
				text-align: left;
				width: 100%;
			}
		}

		dt {
			color: $color-text-muted;
		}

		dd {
			margin: 0;
			text-align: right;
		}
	}

	.sponsor-list {
		margin: $space-3 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: $space-2;
		font-size: $font-size-sm;
	}

	.about {
		margin: $space-3 0 0;
		white-space: pre-wrap;
		line-height: $line-height-relaxed;
		color: color-mix(in srgb, $color-text 88%, transparent);
	}

	.prize-section,
	.claim-card,
	.claim-form {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.prize-list {
		display: flex;
		flex-direction: column;
		gap: $space-2;
		margin: $space-3 0 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: $space-4;
			padding: $space-3;
			border: 1px solid $color-border;
			border-radius: $radius-md;
		}

		p {
			margin: $space-1 0 0;
			color: $color-text-muted;
			font-size: $font-size-sm;
		}
	}

	.claim-card {
		margin-top: $space-2;
		padding-top: $space-4;
		border-top: 1px solid $color-border;

		h3 {
			margin: 0;
		}
	}

	.empty-players {
		margin: $space-3 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.player-list {
		margin: $space-3 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: $space-2;
	}

	.player-link {
		display: flex;
		align-items: center;
		gap: $space-3;
		padding: $space-2 $space-3;
		border-radius: $radius-md;
		text-decoration: none;
		color: inherit;

		&:hover {
			background: color-mix(in srgb, $color-border 35%, transparent);
		}
	}

	.player-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.player-name {
		font-weight: $font-weight-medium;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-username {
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.register {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.fee {
		margin: 0;
		font-family: $font-display;
		font-size: $font-size-3xl;
		font-weight: $font-weight-bold;
		letter-spacing: $letter-spacing-tight;
	}

	.full {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-danger;
	}

	.hint {
		margin: 0;
		font-size: $font-size-xs;
		color: $color-warning;
	}

	.join-lichess {
		display: flex;
		flex-direction: column;
		gap: $space-2;
	}
</style>
