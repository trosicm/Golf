# Golf Rivals Brand System

Golf Rivals must have a premium, dark, competitive and highly practical visual identity, designed primarily for mobile use during a real golf round.

## Brand concept

Golf Rivals is an app for golf matches between friends with real rivalry, hole-by-hole betting, skins, mulligans, reverse mulligans, accumulated pots, team balances and live match management.

It must not look like a casino, a generic fantasy sports app or an old golf club site. It should feel like a mix between a premium private club, a modern sports tool and a competitive game among friends with money at stake.

## Main tagline

Every Hole Has a Price.

## Secondary tagline

Play smart. Win the hole.

## Personality

- Premium
- Competitive
- Strategic
- Clear
- Sporty
- Elegant
- Direct
- Mobile-first
- Useful on the course

## Official palette

| Token | Hex | Usage |
|---|---:|---|
| Midnight Fairway | `#0F2D28` | Dark backgrounds, premium golf atmosphere |
| Carbon Black | `#181B1E` | Main dark base, cards, layout surfaces |
| Sand White | `#EFE8DA` | Main text |
| Victory Gold | `#C6A15B` | Money, pot, primary CTA, premium highlights |
| Turf Accent | `#5FA36A` | Live, success, winner, active states |
| Danger / Penalty | `#C95C4A` | Penalties, errors, blocked actions, negative balance |
| Warning / Carry | `#D9A441` | Carry, warnings, pending decisions |
| Muted Border | `#2E3A36` | Dividers, borders, table structure |

## Color rules

Carbon Black and Midnight Fairway form the dark premium base. Sand White is used for primary text. Victory Gold is reserved for money, pots, primary CTAs and important highlights. Turf Accent is used for live states, success, winners and advantage. Danger is used for penalties, errors, blocked actions and negative balances. Warning is used for carry, pending states and attention states. Muted Border structures cards, tables and components.

Do not use old colors as main brand colors: `#1db954`, `#3b82f6`, `#ffd700`, `#a259ff`, `#ff3860`, `#2de282`.

Avoid excessive neon, unnecessary decoration and small text that cannot be read outdoors.

## Visual rules

- Use a premium dark background with a gradient between Carbon Black and Midnight Fairway.
- Use dark cards with subtle borders, not flat generic boxes.
- Buttons must be large, thumb-friendly and easy to tap on mobile.
- The primary button must be Victory Gold with dark text.
- Secondary buttons must use dark backgrounds and subtle borders.
- Money and pot values must always stand out in Victory Gold.
- Live states should use Turf Accent, optionally with a small live dot.
- Avoid overloaded screens.

## Typography

Use a modern, highly legible sans-serif for the interface. A refined serif may be used only for brand moments, hero screens, logo contexts or premium headlines.

In gameplay screens, legibility is more important than decoration.

Minimum recommended sizes:

- Normal text: 15-16px
- Secondary labels: 12-13px minimum
- Buttons: 15-17px
- Important money values: 22-32px depending on context

## Mobile-first rules

The app will mainly be used from mobile outdoors on the golf course.

It must be clear in sunlight, quick to understand and easy to operate while playing.

- Do not hide important actions inside tiny menus.
- Avoid tables that are too wide when they can become cards.
- Use comfortable width, generous padding and strong hierarchy.
- Important tap targets should be at least 44px high.
- Avoid long texts in live match screens.
- Prioritize clear actions and simple confirmations.

## Logo system

Use variants:

- `primary`: hero, login/register, brand manual and large brand moments.
- `horizontal`: desktop header, footer and wide layouts.
- `icon`: favicon, app icon, mobile nav, loading and compact headers.
- `monogram`: mobile headers, profile, premium badges and small areas.
- `white`: dark backgrounds where gold loses contrast.
- `gold`: premium moments, splash, brand manual and highlights.

Logo rules:

- Do not stretch.
- Do not recolor with CSS filters.
- Do not use the full wordmark in small areas.
- Do not use gold over visually busy or gold backgrounds.
- Do not keep hardcoded `/brand-logo.svg` references once the logo system is complete.
- Use the `Logo` component whenever possible.

## Recommended base components

- Logo
- Button
- Card
- Badge
- Input
- PotBadge
- ScoreBadge
- TeamBadge
- LiveIndicator
- HoleTracker
- BalanceCard
- ActionPanel
- Modal
- PlayerCard
- TeamCard

## Component style

### Button primary

Victory Gold background, Carbon Black text, generous radius and strong font weight.

### Button secondary

Dark background, Muted Border, Sand White text.

### Button danger

Danger color as background or border.

### Button disabled

Clear disabled opacity and no clickable appearance.

### Card

Dark premium background, subtle border, soft shadow and generous padding.

### Badge

Compact, readable and state-colored.

### Input

Dark background, subtle border, gold focus and muted placeholder.

### Modal

Dark surface, elegant overlay, clear CTA and no unnecessary overload.

## Most important screen: `/game/[gameId]`

This is the main product screen. It must be the clearest, most practical and most powerful page.

It should show:

- Match name
- Current hole
- Par and distance if available
- Live state
- Base hole value
- Carried pot
- Current hole value
- Total pot
- Money added through mulligans or reverse mulligans
- Teams or players
- Current score per team
- Current balance
- Mulligans used and remaining
- Reverses used and remaining
- Main actions
- Hole history
- Winner of each hole
- Tied/carry holes
- Current hole highlighted
- Economic impact before confirmation
- Clear confirm result button

## Live Game hierarchy

1. Current hole and state
2. Current pot
3. Teams and scores
4. Available actions
5. History
6. Balance/summary

## Live Game actions

- Enter Score
- Buy Mulligan
- Use Reverse
- Mark Winner
- Carry Hole
- Confirm Result
- Next Hole

## Recommended copy

- Live Hole
- Current Pot
- Hole Value
- Carried Over
- Total Pot
- Team Balance
- Buy Mulligan
- Use Reverse
- Mulligans Left
- Reverses Left
- Hole Won
- Push / Carry
- Confirm Result
- Settle Match
- Every Hole Has a Price.

## Match UX rules

- Avoid errors during a real round.
- Before confirming an important result, show a clear summary.
- If buying a mulligan or reverse changes the pot, show the economic impact.
- If an action is blocked, explain why.
- If no mulligans or reverses remain, show a clearly disabled state.
- The user must understand in two seconds how much the hole is worth and what action is available.

## Home

The home page must act as a premium first impression.

It should show:

- Golf Rivals
- Main tagline
- CTA to create a match
- Three benefits:
  - Live match tracking
  - Mulligans & Reverse
  - Pot & balances

## Create Game

Keep it simple:

1. Create match
2. Add teams/players
3. Set economic rules

Use cards by section, clear validation and one obvious primary button.

## Summary

Must show:

- Winner
- Final balances
- Total pot
- Hole detail
- WhatsApp-ready summary

Money and balances must be highly visible.

## Auth/Login/Register

Premium, clean and simple.

- Primary logo at top
- One central card
- Large inputs
- Gold CTA
- Danger-colored errors
- No unnecessary decoration

## Brand Manual

Must document palette, logo usage, components, states and what to avoid. It must reflect the current premium identity, not old colors.

## Implementation priority

1. Global CSS variables
2. Base components
3. Logo system
4. Home
5. Brand Manual
6. Auth
7. Create Game
8. Live Game
9. Summary
10. Full visual review

## Final objective

Golf Rivals must look like a serious, premium and modern app, but above all it must be usable while playing from a mobile phone. The aesthetic must help people play better, not get in the way.
