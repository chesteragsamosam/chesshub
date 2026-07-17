---
name: lichess-events
description: >-
  Lichess event organizer policy for fair play, advertising, and prizes.
  Use when creating or documenting Lichess tournaments, ChessHub organizer
  guides, prize rules, payout timing, eligibility, category prizes, or any
  feature that helps run events on Lichess. Source: `LichessEventTips.txt`.
---

# Lichess event organizer tips

Authoritative copy from Lichess event tips. Follow these when advising organizers, writing UI copy, or implementing tournament/prize flows on ChessHub.

## Smooth and fair events

- Set a **minimum game requirement** for entry — players have to establish their account at their true rating.
- Make the games **rated**. Casual games are not automatically analysed for engine use. Enforcing rated games helps Lichess enforce fair play.

## Advertising your event

- You can advertise your event on Lichess **only** in your team, or chats for your team tournaments.
- Posts in the forums, posting in other event chats, or direct messaging other users to advertise on Lichess is **not allowed**.
- You can advertise (as appropriate) on any **non-Lichess** locations too.

## Events with prizes

- **Wait until 72 hours after the event** before paying out to allow time for any fair play actions to be taken.
- You may report players suspected of breaching fair play rules — do so, but **do not** report unsuspected players purely for winning prizes (wastes moderator time).
- Require players to **keep their accounts open** to prove no fair play breach occurred — if someone cannot re-open their account, you should **not** pay out the prize.
- If the account owner wishes to, they may email **events@lichess.org** with an event organiser in copy and Lichess will explain the reason for the account closure (whether closed by the user, or for fair play violations).
- Category prizes (under XXXX rating, women's prizes, or other categories) are **very difficult to enforce** in online play.
- Lichess is **not responsible** for prize payouts on unofficial events held on Lichess.
- **Only cash prizes** are permitted on Lichess — e-books, PDFs and software as prizes are not permitted due to piracy concerns.
- Prizes restricted to vouchers or credit in a specific place are **not allowed** unless this is explicitly stated in the tournament description.
- Tournaments requiring a **minimum number of players** to issue prizes are **forbidden**.
- Followers, team members or team leaderships as prizes are **forbidden**.

## ChessHub implications

When implementing or documenting ChessHub prize tournaments:

- Prefer guidance that events are **rated** and use sensible entry barriers (min games / rating floors on Lichess).
- Default payout UX and organizer copy should reflect the **72-hour** fair-play wait before disbursement (unless product explicitly chooses a different hold — call it out).
- Automated ChessHub prizes are **cash (PHP via GCash/InstaPay)** — align with Lichess “cash only” policy; do not add e-book/PDF/software/voucher prize types to the automated flow.
- Do not build features that award Lichess followers, team membership, or team leadership as prizes.
- Do not require a minimum player count as a condition to release prizes.
- Warn organizers that rating/gender/category side prizes are hard to enforce online.
- Disclaim that Lichess (and typically ChessHub as the payout rail) does not absorb liability for unofficial event prize disputes beyond the product’s stated claim flow.

## Related

- API / standings import: **lichess-api** skill
- Organizer UI: `src/routes/organizer/guide/+page.svelte`
