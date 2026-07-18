<script>
	import { resolve } from '$app/paths';

	const lastUpdated = 'July 18, 2026';
</script>

<svelte:head>
	<title>Privacy Policy · ChessHub</title>
	<meta
		name="description"
		content="How ChessHub collects, uses, and shares personal information for accounts, chess profiles, tournaments, and payments."
	/>
</svelte:head>

<article class="page-mid privacy">
	<header class="header">
		<p class="eyebrow">Legal</p>
		<h1 class="page-title">Privacy Policy</h1>
		<p class="page-lede">
			This policy explains what ChessHub collects, why we collect it, and the choices you have. Last
			updated {lastUpdated}.
		</p>
	</header>

	<nav class="toc" aria-label="Privacy policy sections">
		<a href="#who">Who we are</a>
		<a href="#collect">Information we collect</a>
		<a href="#use">How we use information</a>
		<a href="#share">Sharing</a>
		<a href="#cookies">Cookies &amp; sessions</a>
		<a href="#retention">Retention</a>
		<a href="#rights">Your choices</a>
		<a href="#deletion">Data deletion</a>
		<a href="#children">Children</a>
		<a href="#changes">Changes</a>
		<a href="#contact">Contact</a>
	</nav>

	<section id="who" class="panel stack-sm">
		<h2 class="section-title">1. Who we are</h2>
		<p>
			ChessHub (“ChessHub,” “we,” “us”) is a web application that helps players link chess profiles,
			discover tournaments, register for events, and (when configured) pay entry fees or receive
			prize payouts.
		</p>
		<p>
			This Privacy Policy applies to the ChessHub website and related services available at the
			domain where you access this page.
		</p>
	</section>

	<section id="collect" class="panel stack-sm">
		<h2 class="section-title">2. Information we collect</h2>
		<p>Depending on how you use ChessHub, we may collect:</p>
		<ul>
			<li>
				<strong>Account details</strong> — email address, password (stored hashed), display name,
				username, profile photo URL (if provided by you or an identity provider), and role (for
				example player, organizer, or admin).
			</li>
			<li>
				<strong>Sign-in with Google or Meta (Facebook)</strong> — when you choose social login, we
				receive identifiers and profile information those providers share with ChessHub (such as
				name, email, and profile image), subject to your settings with that provider. Facebook
				sign-in may also create or update a Facebook profile link on your ChessHub profile.
			</li>
			<li>
				<strong>Chess accounts</strong> — usernames and related profile data you link for Lichess,
				Chess.com, and/or FIDE. For Lichess or Chess.com sign-in linking we may store an access token
				on our servers so ChessHub can read account details you authorize (and, for Lichess, create
				or join private Arenas).
			</li>
			<li>
				<strong>Profile &amp; social links</strong> — optional bio, city, country, approximate
				location coordinates you choose to save, and social URLs (for example Twitter, Instagram,
				YouTube, Discord, Twitch, GitHub, Facebook, or other links you add).
			</li>
			<li>
				<strong>Tournament activity</strong> — tournaments you create or register for, registration
				and payment status, Lichess Arena join timestamps, prize awards, and prize-claim details you
				submit (such as GCash recipient name and mobile number used for payout).
			</li>
			<li>
				<strong>Payment data</strong> — ChessHub does not store full card or wallet credentials.
				Paid registration and prize disbursements are processed by PayMongo. We store payment
				references needed to confirm registration or payout status (for example checkout session or
				transfer identifiers).
			</li>
			<li>
				<strong>Organizer applications</strong> — messages and status related to requests for
				organizer access.
			</li>
			<li>
				<strong>Technical data</strong> — standard server logs and session cookies needed to keep
				you signed in and operate the service securely.
			</li>
		</ul>
	</section>

	<section id="use" class="panel stack-sm">
		<h2 class="section-title">3. How we use information</h2>
		<p>We use personal information to:</p>
		<ul>
			<li>Create and secure your account, and keep you signed in.</li>
			<li>Show public profiles, player search, and tournament pages you participate in.</li>
			<li>
				Link chess platforms, create or manage Lichess Arenas for organizers, and join Arenas for
				registered players.
			</li>
			<li>Process tournament registration, entry fees, and eligible prize claims.</li>
			<li>Review organizer applications and administer the platform.</li>
			<li>Prevent abuse, debug issues, and improve reliability and security.</li>
			<li>Comply with legal obligations when required.</li>
		</ul>
	</section>

	<section id="share" class="panel stack-sm">
		<h2 class="section-title">4. How we share information</h2>
		<p>We share information only as needed to run ChessHub:</p>
		<ul>
			<li>
				<strong>Public profile content</strong> — username, display name, avatar, bio, location you
				choose to publish, linked chess usernames, social links, and tournament participation that
				the product surfaces publicly.
			</li>
			<li>
				<strong>Tournament organizers and players</strong> — registration and standings-related
				information needed to run an event (for example that you registered, or matched Lichess
				results for prizes).
			</li>
			<li>
				<strong>Service providers</strong> — identity providers (Google, Meta/Facebook), chess
				platforms (especially Lichess for OAuth and Arena APIs), and PayMongo for payments and
				disbursements. Their use of data is governed by their own policies.
			</li>
			<li>
				<strong>Legal &amp; safety</strong> — if we reasonably believe disclosure is required by law,
				or to protect ChessHub, users, or others from fraud or harm.
			</li>
		</ul>
		<p>We do not sell your personal information.</p>
	</section>

	<section id="cookies" class="panel stack-sm">
		<h2 class="section-title">5. Cookies and sessions</h2>
		<p>
			ChessHub uses cookies or similar technologies for authentication sessions so you can stay
			signed in. These are necessary for the core service. We do not use third-party advertising
			cookies as part of the core ChessHub product described here.
		</p>
	</section>

	<section id="retention" class="panel stack-sm">
		<h2 class="section-title">6. Retention</h2>
		<p>
			We keep account, profile, tournament, registration, and payment-reference data for as long as
			needed to provide the service, resolve disputes, meet security and accounting needs, and
			comply with law. You may request deletion of your account data as described below; some
			records may be retained in limited form where we must keep them (for example completed payment
			or prize records).
		</p>
	</section>

	<section id="rights" class="panel stack-sm">
		<h2 class="section-title">7. Your choices and rights</h2>
		<ul>
			<li>
				Update profile and linked accounts in
				<a href={resolve('/settings/profile')} class="link">Profile settings</a>.
			</li>
			<li>Disconnect Google, Meta, or Lichess access through those providers and/or ChessHub settings where available.</li>
			<li>Choose what optional profile fields and social links you publish.</li>
			<li>
				Request deletion of Facebook-linked data or review instructions at
				<a href={resolve('/data-deletion')} class="link">User data deletion</a>.
			</li>
			<li>
				Contact us (see below) to request access, correction, or deletion of personal data we hold
				about you, subject to legal and operational limits.
			</li>
		</ul>
		<p>
			Depending on where you live, you may have additional rights under local privacy laws. We will
			respond to valid requests within a reasonable time.
		</p>
	</section>

	<section id="deletion" class="panel stack-sm">
		<h2 class="section-title">8. User data deletion</h2>
		<p>
			Step-by-step instructions for deleting Facebook-linked ChessHub data (and requesting full
			account deletion) are published at
			<a href={resolve('/data-deletion')} class="link">/data-deletion</a>. Meta apps should set:
		</p>
		<ul>
			<li>
				<strong>User data deletion instructions URL</strong> →
				<code>/data-deletion</code>
			</li>
			<li>
				<strong>Data deletion request callback URL</strong> →
				<code>/api/facebook/data-deletion</code>
			</li>
		</ul>
		<p>
			After Meta sends a deletion callback, status is available at
			<a href={resolve('/data-deletion/status')} class="link">/data-deletion/status</a> with the
			confirmation code.
		</p>
	</section>

	<section id="children" class="panel stack-sm">
		<h2 class="section-title">9. Children</h2>
		<p>
			ChessHub is not directed at children under 13 (or the minimum age required in your country).
			If you believe a child has provided personal information, contact us and we will take
			appropriate steps to delete it.
		</p>
	</section>

	<section id="changes" class="panel stack-sm">
		<h2 class="section-title">10. Changes to this policy</h2>
		<p>
			We may update this Privacy Policy from time to time. The “Last updated” date at the top will
			change when we do. Continued use of ChessHub after an update means you accept the revised
			policy.
		</p>
	</section>

	<section id="contact" class="panel stack-sm">
		<h2 class="section-title">11. Contact</h2>
		<p>
			For privacy questions or requests, contact the ChessHub operator using the support or contact
			channel published on this site, or through your account-related communication channel if one
			is provided for your deployment.
		</p>
		<p class="muted">
			Third-party policies (non-exhaustive):
			<a href="https://policies.google.com/privacy" class="link" rel="noopener noreferrer" target="_blank"
				>Google Privacy Policy</a
			>,
			<a
				href="https://www.facebook.com/privacy/policy/"
				class="link"
				rel="noopener noreferrer"
				target="_blank">Meta Privacy Policy</a
			>,
			<a href="https://lichess.org/privacy" class="link" rel="noopener noreferrer" target="_blank"
				>Lichess Privacy</a
			>,
			<a href="https://www.paymongo.com/privacy" class="link" rel="noopener noreferrer" target="_blank"
				>PayMongo Privacy</a
			>.
		</p>
	</section>
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.privacy {
		display: flex;
		flex-direction: column;
		gap: $space-6;
		padding-block: $space-6 $space-12;
	}

	.header {
		.eyebrow {
			margin: 0 0 $space-2;
			color: $color-primary;
			font-size: $font-size-xs;
			font-weight: $font-weight-bold;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
		}

		.page-lede {
			max-width: 42rem;
		}
	}

	.toc {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2 $space-4;
		padding: $space-4 $space-5;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: color-mix(in srgb, $color-surface 80%, transparent);

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

	.panel {
		scroll-margin-top: calc($size-header + $space-5);

		p,
		li {
			color: $color-text;
			line-height: $line-height-relaxed;
		}

		ul {
			margin: 0;
			padding-left: 1.25rem;
			display: flex;
			flex-direction: column;
			gap: $space-3;
		}

		.muted {
			color: $color-text-muted;
			font-size: $font-size-sm;
		}

		code {
			font-size: $font-size-sm;
			word-break: break-all;
		}
	}
</style>
