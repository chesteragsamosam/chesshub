<script>
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Data deletion · ChessHub</title>
	<meta
		name="description"
		content="How to delete your ChessHub and Facebook-linked data from ChessHub."
	/>
</svelte:head>

<article class="page-mid deletion">
	<header class="header">
		<p class="eyebrow">Legal</p>
		<h1 class="page-title">User data deletion</h1>
		<p class="page-lede">
			Instructions for deleting Facebook-linked data and other personal information ChessHub holds
			about you. Use this page as the Meta <em>User data deletion instructions URL</em>.
		</p>
	</header>

	<section class="panel stack-sm">
		<h2 class="section-title">Delete Facebook data via Meta</h2>
		<p>
			If you signed in with Facebook, you can remove ChessHub from your Facebook account. Meta will
			notify ChessHub, and we will delete Facebook login credentials and your Facebook profile link
			stored for that connection.
		</p>
		<ol>
			<li>
				Open Facebook → <strong>Settings &amp; privacy</strong> → <strong>Settings</strong> →
				<strong>Apps and Websites</strong>.
			</li>
			<li>Find <strong>ChessHub</strong> and remove it (or request that your data be deleted).</li>
			<li>
				Meta sends ChessHub a deletion callback. You will receive a confirmation code and a status
				link from Facebook’s flow when available.
			</li>
			<li>
				You can also check status later at
				<a href={resolve('/data-deletion/status')} class="link">/data-deletion/status</a>
				using that confirmation code.
			</li>
		</ol>
		<p class="muted">
			Callback endpoint (for Meta App Dashboard → Data Deletion Request URL):
			<code>{data.callbackUrl}</code>
		</p>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">Delete or edit data inside ChessHub</h2>
		<ol>
			<li>
				<a href={resolve('/login')} class="link">Sign in</a> to ChessHub.
			</li>
			<li>
				Open
				<a href={resolve('/settings/profile')} class="link">Profile settings</a>.
			</li>
			<li>
				Remove optional profile fields, social links, and linked chess accounts (Lichess,
				Chess.com, FIDE) you no longer want stored.
			</li>
			<li>
				To disconnect Facebook from ChessHub without using Meta’s Apps list, remove the Facebook
				social link (and sign out). Facebook login can be reconnected later if you choose.
			</li>
		</ol>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">Full account deletion</h2>
		<p>
			To request deletion of your entire ChessHub account (email login, profile, tournament
			registrations where applicable, and remaining linked accounts), contact the ChessHub operator
			with the email address on your account. We will confirm identity and process the request
			subject to legal retention needs (for example completed payment or prize records).
		</p>
		<p>
			See also our
			<a href={resolve('/privacy')} class="link">Privacy Policy</a>.
		</p>
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">What the Facebook callback deletes</h2>
		<ul>
			<li>Facebook OAuth account record and access tokens for that Facebook user</li>
			<li>Facebook URL stored under your ChessHub social links (if present)</li>
		</ul>
		<p class="muted">
			It does not automatically wipe an entire ChessHub account that also uses email/password or
			Google, or tournament history required for payouts and integrity. Use the full-account request
			above for that.
		</p>
	</section>
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.deletion {
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

	.panel {
		p,
		li {
			line-height: $line-height-relaxed;
		}

		ol,
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
			display: inline-block;
			margin-top: $space-1;
			padding: $space-1 $space-2;
			border-radius: $radius-sm;
			background: $color-primary-soft;
			font-size: $font-size-xs;
			word-break: break-all;
		}
	}
</style>
