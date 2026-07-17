<script>
	import { resolve } from '$app/paths';

	const setupSteps = [
		{
			number: 1,
			title: 'Create the ChessHub tournament',
			body: 'From the organizer dashboard, choose Lichess or OTB. For Lichess, ChessHub creates a rated Arena on Lichess using your linked account (tournament permission required), then saves the ChessHub registration page.'
		},
		{
			number: 2,
			title: 'Confirm the Lichess Arena',
			body: 'Open the linked Lichess Arena from Manage prizes and finish any Lichess-side details there. Swiss events are still created on Lichess first, then pasted into ChessHub. Prefer rated games and a minimum games entry requirement.'
		},
		{
			number: 3,
			title: 'Publish and register players',
			body: 'Publish the ChessHub tournament and have every player register. Each potential winner must also link and verify the same Lichess account they will use in the event.'
		},
		{
			number: 4,
			title: 'Configure prizes',
			body: 'Open Manage prizes from the tournament editor. Arena IDs created from ChessHub are already linked; for Swiss, paste the Lichess URL or ID. Add one unique PHP cash prize for every rewarded placement.'
		},
		{
			number: 5,
			title: 'Run the tournament on Lichess',
			body: 'Manage pairings, rounds, moderation, withdrawals, and results on Lichess. Advertise only in your team or team-tournament chats. Wait until Lichess marks the tournament finished before importing results.'
		},
		{
			number: 6,
			title: 'Preview winner matching',
			body: 'Import the final standings and review every match. ChessHub matches Lichess usernames case-insensitively against paid registrations with verified linked accounts.'
		},
		{
			number: 7,
			title: 'Finalize winners',
			body: 'Finalize only after every prize row is matched correctly. Finalization snapshots the winners and prize amounts, marks the tournament completed, and permanently locks the prize source and results. Hold cash payouts 72 hours for fair-play review.'
		},
		{
			number: 8,
			title: 'Monitor winner claims',
			body: 'Winners enter their GCash account name and mobile number on the public tournament page. PayMongo sends the InstaPay transfer and updates the claim from processing to paid or failed.'
		}
	];

	const faqGroups = [
		{
			id: 'setup',
			title: 'Lichess setup',
			items: [
				{
					q: 'Does ChessHub create the Lichess tournament?',
					a: 'Yes for rated Arenas: when you create a Lichess event in ChessHub, it calls the Lichess API with your linked account (tournament:write). Swiss events are still created on Lichess (team required), then linked by pasting the URL or ID.'
				},
				{
					q: 'Are Lichess games rated?',
					a: 'Arenas created from ChessHub are always rated. Casual Arenas are not offered because Lichess does not automatically analyse casual games for fair play.'
				},
				{
					q: 'Should I choose Arena or Swiss?',
					a: 'Use Arena for a fixed-duration event with continuous pairings — ChessHub can create these for you. Use Swiss for a fixed number of rounds; create those on Lichess under a team you lead, then paste the ID into ChessHub.'
				},
				{
					q: 'Which Lichess settings must match ChessHub?',
					a: 'The Lichess URL, selected format, schedule, and advertised event rules should agree. ChessHub imports final ranks; it does not verify every time-control, variant, or eligibility setting.'
				},
				{
					q: 'Can the Lichess tournament be private or password protected?',
					a: 'Arenas created in ChessHub are always private. ChessHub keeps the password server-side and maintains a Lichess allow list of registered players (with linked Lichess accounts). Players join from ChessHub with a personal entry code — sharing the Arena password outside ChessHub is not enough to join. Final standings still come from the public Lichess results API.'
				},
				{
					q: 'Can I change the Lichess URL later?',
					a: 'Yes, until winners are finalized. After finalization, the source and prizes are locked to preserve an auditable result.'
				},
				{
					q: 'Can I use a team battle or another Lichess event type?',
					a: 'The current importer supports standard Arena and Swiss standings. Team battle awards, simul events, studies, and manually scored over-the-board events are not supported.'
				}
			]
		},
		{
			id: 'players',
			title: 'Players and matching',
			items: [
				{
					q: 'Who is eligible to win a prize?',
					a: 'A winner must have a paid or confirmed ChessHub registration and a verified linked Lichess account whose username appears in the imported final standings.'
				},
				{
					q: 'What about a free ChessHub tournament?',
					a: 'Free registrations are confirmed immediately and count as paid/confirmed for winner matching.'
				},
				{
					q: 'Are Lichess usernames case-sensitive?',
					a: 'No. ChessHub compares them case-insensitively, but the linked account must still be the account used in the event.'
				},
				{
					q: 'Why does a winner show as “Not matched”?',
					a: 'The usual causes are no ChessHub registration, an unpaid registration, no verified Lichess link, or playing under a different Lichess account. Correct the account or registration before finalizing.'
				},
				{
					q: 'Can I manually assign an unmatched winner?',
					a: 'No. This protects prizes from being redirected to the wrong ChessHub account. Resolve the registration or verified Lichess link, then import again.'
				},
				{
					q: 'Can a player change their linked Lichess account after the event?',
					a: 'They can update their account before finalization, but organizers should verify that it is genuinely the account used in the event. Finalized awards keep the imported username snapshot.'
				},
				{
					q: 'Can one player receive more than one placement prize?',
					a: 'Normal Lichess standings give each player one rank, and each configured placement is unique. The current claim view is designed for one placement award per tournament winner.'
				}
			]
		},
		{
			id: 'results',
			title: 'Results and finalization',
			items: [
				{
					q: 'When can I import results?',
					a: 'Only after Lichess reports the tournament as finished. Ongoing, cancelled without final results, missing, or inaccessible events are rejected.'
				},
				{
					q: 'Does previewing results notify winners?',
					a: 'No. Preview is an organizer-only check and creates no awards. Claims become available only after finalization.'
				},
				{
					q: 'What exactly happens when I finalize?',
					a: 'ChessHub re-fetches the final standings, verifies every prize match, snapshots award details, creates one unclaimed claim per winner, marks the tournament completed, and locks the setup.'
				},
				{
					q: 'Can finalization be undone?',
					a: 'No. It is intentionally irreversible in the organizer interface. Verify rankings, usernames, labels, and amounts before confirming.'
				},
				{
					q: 'What if Lichess changes a result after finalization?',
					a: 'ChessHub keeps the finalized snapshot and will not silently change awards. Any exceptional correction requires an administrator-led database and payout review.'
				},
				{
					q: 'Can I finalize while one winner is unmatched?',
					a: 'No. Every configured prize placement must resolve to an eligible ChessHub account.'
				}
			]
		},
		{
			id: 'prizes',
			title: 'Prize configuration',
			items: [
				{
					q: 'What currency is supported?',
					a: 'Prize payouts currently support Philippine pesos only.'
				},
				{
					q: 'What are the minimum and maximum prizes?',
					a: 'Each prize must be at least PHP 1 and no more than PHP 50,000 because payouts use InstaPay. PayMongo fees are separate from the prize amount.'
				},
				{
					q: 'Can two prizes use the same placement?',
					a: 'No. Each rewarded placement must be unique within a tournament.'
				},
				{
					q: 'Can I offer physical items, vouchers, or tied prizes?',
					a: 'Not in this automated claim flow. It supports ranked PHP cash prizes. Handle non-cash awards or split/tied results outside this feature.'
				},
				{
					q: 'Can I edit a prize after players register?',
					a: 'Yes, until results are finalized. Clearly communicate changes to participants. After finalization, labels and amounts are immutable.'
				},
				{
					q: 'Does the entry-fee balance automatically become the prize pool?',
					a: 'No. Entry payments and prize funding are separate. Prize transfers draw from your activated PayMongo Wallet, which must have enough available balance plus fees.'
				}
			]
		},
		{
			id: 'payouts',
			title: 'GCash payouts and claims',
			items: [
				{
					q: 'What must be configured before winners can claim?',
					a: 'The server needs PayMongo credentials, Wallet account number and name, an activated and funded Wallet, API disbursements access, and the verified PayMongo webhook secret.'
				},
				{
					q: 'Who enters the GCash details?',
					a: 'The authenticated winner enters the account name and Philippine mobile number on the completed tournament page.'
				},
				{
					q: 'Does ChessHub store the full GCash number?',
					a: 'No. The full number is sent to PayMongo for the transfer, while ChessHub stores only a masked destination for status and support.'
				},
				{
					q: 'How quickly will a winner receive the money?',
					a: 'InstaPay is usually real time, but PayMongo advises allowing up to 20 minutes for a final status. Wallet limits or receiving-provider issues can delay or reject it.'
				},
				{
					q: 'Can an organizer manually mark a claim paid?',
					a: 'No. Only a confirmed PayMongo success response or verified webhook changes the claim to paid.'
				},
				{
					q: 'What happens when a payout fails?',
					a: 'The winner sees an actionable failed state and can retry after correcting their details. A processing or paid claim cannot be submitted again.'
				},
				{
					q: 'How are duplicate payouts prevented?',
					a: 'Each award has one claim, claim reservation is transactional, PayMongo requests use an attempt-specific idempotency key, and transfer identifiers are unique in the database.'
				},
				{
					q: 'What if the PayMongo Wallet lacks funds?',
					a: 'The payout fails rather than being marked paid. Fund the Wallet, check the failure, and ask the winner to retry only after the claim reaches failed status.'
				},
				{
					q: 'Who pays the transfer fee?',
					a: 'PayMongo deducts its disbursement fee according to your account pricing. Keep enough Wallet balance for both prizes and fees.'
				}
			]
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			items: [
				{
					q: 'Lichess says the event ended, but ChessHub says it is unfinished. What should I do?',
					a: 'Refresh Lichess and wait briefly for its API status to update. Confirm that the selected Arena/Swiss format and pasted ID are correct, then preview again.'
				},
				{
					q: 'The imported rankings look wrong. Should I finalize?',
					a: 'No. Open the source event on Lichess, confirm its final standings and format, and correct the source before finalizing.'
				},
				{
					q: 'GCash is unavailable in the receiving institutions list. What does that mean?',
					a: 'Your PayMongo account may not have the required Wallet or InstaPay disbursement capability, or the provider may be temporarily unavailable. Contact PayMongo support if it persists.'
				},
				{
					q: 'A claim has been processing for more than 20 minutes. What should I do?',
					a: 'Check the transfer in the PayMongo Dashboard using its reference. Do not create a manual duplicate transfer. Confirm webhook delivery and contact PayMongo support when necessary.'
				},
				{
					q: 'Where can I see claim status?',
					a: 'Open Manage prizes for the tournament. The organizer view shows each finalized winner, masked destination, and unclaimed, processing, paid, or failed status.'
				},
				{
					q: 'Can I test without moving real money?',
					a: 'Use PayMongo test-mode credentials and its simulated transfer environment. Test Lichess imports with a completed public event before running a live tournament.'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Lichess tournament organizer guide · ChessHub</title>
	<meta
		name="description"
		content="Set up Lichess tournaments, import winners, configure prizes, and manage GCash claims on ChessHub."
	/>
</svelte:head>

<div class="page guide">
	<header class="hero">
		<div>
			<p class="eyebrow">Organizer handbook</p>
			<h1 class="page-title">Run a Lichess tournament with prizes</h1>
			<p class="page-lede">
				A complete guide to setting up the event, matching winners, finalizing results, and
				delivering GCash prizes safely.
			</p>
		</div>
		<div class="hero-actions">
			<a href={resolve('/organizer/tournaments/new')} class="btn btn-primary">Create tournament</a>
			<a href={resolve('/organizer')} class="btn btn-secondary">Organizer dashboard</a>
		</div>
	</header>

	<aside class="notice" aria-label="Important">
		<strong>Before you start:</strong>
		ChessHub can create a rated Lichess Arena for you, then you run pairings on Lichess while ChessHub
		handles registration, prize matching, winner claims, and payout tracking.
	</aside>

	<nav class="toc panel" aria-label="Guide sections">
		<strong>On this page</strong>
		<a href="#checklist">Checklist</a>
		<a href="#formats">Arena or Swiss?</a>
		<a href="#workflow">Setup workflow</a>
		<a href="#faq">Organizer Q&amp;A</a>
	</nav>

	<section id="checklist" class="section-block">
		<div class="section-heading">
			<p class="eyebrow">Prerequisites</p>
			<h2>Pre-event checklist</h2>
		</div>
		<ul class="checklist panel">
			<li>An organizer-approved ChessHub account</li>
			<li>A Lichess account linked in ChessHub with tournament permission (for Arena create)</li>
			<li>A published ChessHub tournament for player registration</li>
			<li>Players instructed to link and verify the exact Lichess accounts they will use</li>
			<li>An activated, funded PayMongo Wallet with API disbursements enabled</li>
			<li>PayMongo secret key, webhook secret, Wallet account number, and Wallet account name</li>
		</ul>
	</section>

	<section id="formats" class="section-block">
		<div class="section-heading">
			<p class="eyebrow">Choose a format</p>
			<h2>Arena or Swiss?</h2>
		</div>
		<div class="format-grid">
			<article class="panel format-card">
				<span class="badge badge-brand">Arena</span>
				<h3>Fixed time, continuous games</h3>
				<p>
					Best for open online events where players are paired repeatedly during a set duration.
					ChessHub creates a rated Arena on Lichess for you. Final rank uses Lichess Arena scoring.
				</p>
				<a href={resolve('/organizer/tournaments/new')} class="link">Create a rated Arena in ChessHub</a>
			</article>
			<article class="panel format-card">
				<span class="badge badge-brand">Swiss</span>
				<h3>Fixed rounds, structured standings</h3>
				<p>
					Best for formal events with a known number of rounds. Lichess Swiss events generally
					require a team and team-leader permissions.
				</p>
				<a href="https://lichess.org/swiss" target="_blank" rel="noreferrer" class="link"
					>Learn about Lichess Swiss ↗</a
				>
			</article>
		</div>
	</section>

	<section id="workflow" class="section-block">
		<div class="section-heading">
			<p class="eyebrow">End-to-end process</p>
			<h2>Setup and payout workflow</h2>
		</div>
		<ol class="steps">
			{#each setupSteps as step (step.number)}
				<li class="panel">
					<span class="step-number">{step.number}</span>
					<div>
						<h3>{step.title}</h3>
						<p>{step.body}</p>
					</div>
				</li>
			{/each}
		</ol>
		<div class="warning panel">
			<strong>Finalization is permanent.</strong>
			Preview the source, placements, usernames, prize labels, and amounts carefully. Finalized awards
			cannot be edited from the organizer interface.
		</div>
	</section>

	<section id="faq" class="section-block">
		<div class="section-heading">
			<p class="eyebrow">Organizer help</p>
			<h2>Questions and answers</h2>
			<p>
				Answers cover setup, eligibility, finalization, prizes, payouts, security, and common
				failures.
			</p>
		</div>

		<div class="faq-layout">
			<nav class="faq-nav panel" aria-label="Question categories">
				{#each faqGroups as group (group.id)}
					<a href={`#faq-${group.id}`}>{group.title}</a>
				{/each}
			</nav>

			<div class="faq-groups">
				{#each faqGroups as group (group.id)}
					<section id={`faq-${group.id}`} class="faq-group">
						<h3>{group.title}</h3>
						<div class="faq-list">
							{#each group.items as item (item.q)}
								<details>
									<summary>{item.q}</summary>
									<p>{item.a}</p>
								</details>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</div>
	</section>

	<footer class="cta panel">
		<div>
			<h2>Ready to organize?</h2>
			<p>Create the ChessHub listing first, then follow the workflow above.</p>
		</div>
		<a href={resolve('/organizer/tournaments/new')} class="btn btn-primary">Create tournament</a>
	</footer>
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.guide {
		display: flex;
		flex-direction: column;
		gap: $space-10;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: $space-6;
		padding-top: $space-4;

		.page-lede {
			max-width: 46rem;
			font-size: $font-size-base;
		}
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}

	.eyebrow {
		margin: 0 0 $space-2;
		color: $color-primary;
		font-size: $font-size-xs;
		font-weight: $font-weight-bold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
	}

	.notice {
		padding: $space-4 $space-5;
		border: $border-width solid color-mix(in srgb, $color-primary 35%, $color-border);
		border-radius: $radius-lg;
		background: $color-primary-soft;
		line-height: $line-height-relaxed;
	}

	.toc {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-3 $space-5;

		a {
			color: $color-primary;
			font-size: $font-size-sm;
			font-weight: $font-weight-medium;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.section-block {
		scroll-margin-top: calc($size-header + $space-5);
	}

	.section-heading {
		margin-bottom: $space-5;

		h2 {
			margin: 0;
			font-family: $font-display;
			font-size: $font-size-2xl;
		}

		p:not(.eyebrow) {
			max-width: 48rem;
			margin: $space-2 0 0;
			color: $color-text-muted;
			line-height: $line-height-relaxed;
		}
	}

	.checklist {
		display: grid;
		gap: $space-3;
		margin: 0;
		padding-left: calc($space-6 + $space-5);

		@media (min-width: $breakpoint-md) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		li::marker {
			color: $color-success;
		}
	}

	.format-grid {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-md) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.format-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: $space-3;

		h3,
		p {
			margin: 0;
		}

		p {
			flex: 1;
			color: $color-text-muted;
			line-height: $line-height-relaxed;
		}
	}

	.steps {
		display: grid;
		gap: $space-3;
		margin: 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: flex-start;
			gap: $space-4;
		}

		h3,
		p {
			margin: 0;
		}

		p {
			margin-top: $space-2;
			color: $color-text-muted;
			line-height: $line-height-relaxed;
		}
	}

	.step-number {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: $radius-full;
		color: $color-on-primary;
		background: $color-primary;
		font-weight: $font-weight-bold;
	}

	.warning {
		margin-top: $space-4;
		border-color: color-mix(in srgb, $color-warning 45%, $color-border);
		background: $color-warning-soft;
		line-height: $line-height-relaxed;
	}

	.faq-layout {
		display: grid;
		align-items: start;
		gap: $space-6;

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: 14rem minmax(0, 1fr);
		}
	}

	.faq-nav {
		display: flex;
		flex-direction: column;
		gap: $space-2;

		@media (min-width: $breakpoint-lg) {
			position: sticky;
			top: calc($size-header + $space-4);
		}

		a {
			padding: $space-2;
			border-radius: $radius-sm;
			color: $color-text-muted;
			font-size: $font-size-sm;
			text-decoration: none;

			&:hover {
				color: $color-primary;
				background: $color-primary-soft;
			}
		}
	}

	.faq-groups {
		display: flex;
		flex-direction: column;
		gap: $space-8;
	}

	.faq-group {
		scroll-margin-top: calc($size-header + $space-5);

		h3 {
			margin: 0 0 $space-3;
			font-family: $font-display;
			font-size: $font-size-xl;
		}
	}

	.faq-list {
		overflow: hidden;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: $color-surface;

		details {
			border-bottom: $border-width solid $color-border;

			&:last-child {
				border-bottom: none;
			}
		}

		summary {
			padding: $space-4 $space-5;
			font-weight: $font-weight-semibold;
			cursor: pointer;

			&:hover {
				color: $color-primary;
				background: color-mix(in srgb, $color-primary-soft 45%, transparent);
			}
		}

		p {
			margin: 0;
			padding: 0 $space-5 $space-5;
			color: $color-text-muted;
			line-height: $line-height-relaxed;
		}
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-4;

		h2,
		p {
			margin: 0;
		}

		p {
			margin-top: $space-1;
			color: $color-text-muted;
		}
	}
</style>
