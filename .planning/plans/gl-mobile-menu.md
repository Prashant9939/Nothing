# Plan: GlobalLogic-style mobile menu (all three navbars)

## Goal
Copy the globallogic.com mobile menu design — hamburger toggle + full-screen menu — into this site's mobile view for **all three navbars** (public `Navbar.tsx`, `StudentLayout.tsx`, `AdminLayout.tsx`), using **GlobalLogic's exact colors**. Nothing else is copied: no language switcher, no mega-menu/accordion (site has no submenus), no GL content. Desktop navigation stays exactly as it is today.

## Design spec (extracted from globallogic.com's own CSS, `@media (max-width:1279px)`)

### Toggle (hamburger → X)
- Button: `30×26`, transparent, no border; three bars `18×2px`, `#1C1B1F`, `3px` gaps, `transition: all .3s ease`.
- Open: middle bar hidden, outer bars rotate `±45°` (translate to center) → X.

### Open panel
- Header row becomes part of a **full-screen white sheet**: `background:#fff; height:100vh; overflow-y:auto`.
- Menu area: `width:100%; display:block; padding:40px 0 20px` (site adds `px-5 sm:px-6` gutter so text isn't flush to the edge).

### Menu items
- `border-top: 1px solid #C8CAD3` separator above each item (first item too).
- Link: `24px / 130% / weight 600 / letter-spacing -0.3px / color #181A24 / padding 20px 30px 20px 0 / margin-bottom 8px`.
- Active + hover + focus: `color #FF5F2D`, active also `weight 700`.

### Actions row (GL "header_menu_right" when open)
- Full-width row, items left-aligned (`justify-content:flex-start`), sits below the list.
- Primary CTA: `bg #FF5F2D`, white `18px` text, `padding 17px 24px`, octagon `clip-path`, hover/focus `#CF3708`, `transition .3s ease-in-out`.

### Colors (exact, per user decision)
`#181A24` text · `#C8CAD3` separators · `#FF5F2D` accent/active/CTA · `#1C1B1F` bars · `#CF3708` CTA hover · white panel.

### Breakpoint
Keep the site's existing `lg` (1024px) — the menu shows exactly where the hamburger shows today; GL's 1279px breakpoint is not adopted (site-wide consistency; visual design copied verbatim).

## Architecture

```
Mobile (≤1023px) when open:
┌─────────────────────────────────────┐
│ existing header (nav pill / topbar) │  ← z-50 (public) / z-30 (dashboards)
│  logo …            [hamburger → X]  │     stays visible; toggle morphs in place
├─────────────────────────────────────┤
│ sheet — fixed inset-0, z-20, white  │  ← sits BELOW header, seamless white
│  40px gap                           │
│  ───────────────────────────────    │
│  Home                               │  24px/600 #181A24, active #FF5F2D/700
│  ───────────────────────────────    │
│  Programs …                         │
│                                     │
│  [Get Started ▮ octagon CTA]        │
└─────────────────────────────────────┘
body scroll locked; Escape closes; route change closes; ≥lg closes
```

- One shared sheet component owns: full-screen white container, `animate-fade-in` (existing token), body scroll-lock, `Escape` close, matchMedia `lg` close — reusing the proven StudentLayout lock pattern (lock on open, restore on cleanup).
- Sheet renders only when open (`open ? … : null`) → no stale-lock states.
- No backdrop/dim layer (GL has none — the sheet is opaque white).
- Public nav: when open the pill sheds its margins/radius/shadow/gradient → edge-to-edge white header merging with the sheet (GL's `header_block.enlarge`).
- Dashboards: sheet starts below the sticky topbar (header spacer `h-16`); topbar's `bg-white/70` over the white sheet reads solid white. Toggle is the existing topbar button, swapped to the GL hamburger so it morphs in place.

## Code changes

### 1. NEW `client/src/components/ui/MobileMenu.tsx`
- `HamburgerButton({ open, onClick, className })`:
  - Button `relative flex h-11 w-11 flex-col items-center justify-center` (larger hit target than GL's 30×26, invisible difference).
  - Bars: `block h-[2px] w-[18px] bg-[#1C1B1F] transition-all duration-300`, spaced with `mt-[6px]` on 2nd/3rd → centers at y = 1, 9, 17.
  - Open: bar1 `translate-y-[8px] rotate-45`, bar2 `opacity-0`, bar3 `-translate-y-[8px] -rotate-45`.
  - `aria-expanded={open}`, `aria-label` "Open menu"/"Close menu", `type="button"`.
- `MobileMenuSheet({ open, onClose, headerOffset = 'h-16', children })`:
  - `if (!open) return null;`
  - Container: `fixed inset-0 z-20 flex flex-col bg-white animate-fade-in lg:hidden`, `role="dialog" aria-modal="true" aria-label="Navigation menu"`.
  - First child: `<div aria-hidden className={`shrink-0 ${headerOffset}`} />` (reserves the visible header row: `h-16` dashboards, `h-[76px]` public = `top-3` + `h-16`).
  - Scroll area: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-10 pb-5` (= GL `40px 0 20px` + gutter) → `children`.
  - Effect on `open`: save/lock `document.body.style.overflow`; `keydown` → `Escape` → `onClose()`; `matchMedia('(min-width: 1024px)')` change → `onClose()`; cleanup restores.
- `menuItemClass(active: boolean)` helper returning:
  `flex w-full border-t border-[#C8CAD3] py-5 pr-[30px] mb-2 text-[24px] leading-[1.3] tracking-[-0.3px] transition-colors focus-visible:outline-none focus-visible:text-[#FF5F2D]` + (`font-bold text-[#FF5F2D]` when active, else `font-semibold text-[#181A24] hover:text-[#FF5F2D]`).
- Export all three from `client/src/components/ui/index.ts`.

### 2. `client/src/index.css`
Add near the other component utilities (plain CSS class):
```css
.gl-cta { clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px); }
```
CTA class string (in `MobileMenu.tsx`): `gl-cta inline-flex items-center justify-center bg-[#FF5F2D] px-6 py-[17px] text-[18px] leading-[1.5] text-white transition-colors duration-300 ease-in-out hover:bg-[#CF3708] focus-visible:bg-[#CF3708] focus-visible:outline-none`.

### 3. `client/src/components/Navbar.tsx`
- Import `HamburgerButton`, `MobileMenuSheet`, `menuItemClass` from `./ui`.
- Add `useEffect(() => setMobileOpen(false), [location.pathname])` (route-change close, keeps sheet behavior consistent with dashboards).
- Nav `className`: split into branches so nothing conflicts:
  - open: `top-0 left-0 right-0 rounded-none bg-white shadow-none ring-0 duration-300`
  - closed: `top-3 left-3 right-3 rounded-2xl duration-500 ${scrolled ? …gradientA : …gradientB}` (existing gradients, unchanged).
  - Shared: `fixed z-50 lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-3rem)] lg:max-w-6xl transition-all`.
- Replace hamburger button (lines 107–113) with `<HamburgerButton open={mobileOpen} onClick={() => setMobileOpen(v => !v)} className="lg:hidden" />`.
- Delete the old dropdown + backdrop block (lines 118–158). In its place:
  ```tsx
  <MobileMenuSheet open={mobileOpen} onClose={() => setMobileOpen(false)} headerOffset="h-[76px]">
    <nav>
      {navLinks.map(link => (
        <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)}
          aria-current={isActive(link.path) ? 'page' : undefined}
          className={menuItemClass(isActive(link.path))}>{link.label}</Link>
      ))}
    </nav>
    <div className="mt-8 flex w-full flex-wrap items-center gap-4">
      {isAuthenticated ? (<primary: Dashboard/Admin Panel → CTA>, <secondary: Logout text button onClick=handleLogout>)
                       : (<secondary: Log in>, <primary: Get Started → CTA>)}
    </div>
  </MobileMenuSheet>
  ```
  Secondary style: `inline-flex items-center px-1 py-[17px] text-[18px] font-semibold text-[#181A24] transition-colors hover:text-[#FF5F2D]` (GL non-CTA controls are plain text; keeps one orange CTA per menu).
- Desktop blocks (`hidden lg:flex` nav + actions), logo, spacer — untouched.

### 4. `client/src/components/StudentLayout.tsx`
- Topbar button: replace `MenuIcon` usage with `<HamburgerButton open={mobileOpen} onClick={() => setMobileOpen(v => !v)} className="lg:hidden" />`; drop `MenuIcon` from the animateicons import (other icons still used).
- Delete the dark mobile overlay (lines 177–179).
- Sidebar `<aside>`: remove the mobile translate logic — base classes become `hidden lg:flex` (with existing `lg:w-*` / `lg:translate-x-0` unchanged); desktop behavior identical.
- Remove the three mobile-only effects now owned by `MobileMenuSheet` (scroll-lock 108–114, lg matchMedia 122–127, overflow safety-net 134–136). Keep the route-change effect (line 97) — it closes `mobileOpen`.
- Add sheet (after `</header>`), content:
  - Links: `navSections.flatMap(s => s.links).filter(isVisible).map(link => <Link to={link.path} className={menuItemClass(isLinkActive(link))} aria-current=… onClick={() => setMobileOpen(false)}>{link.label}</Link>)` — **text-only** (GL items have no icons; desktop sidebar keeps icons/section labels).
  - Actions row: `mt-8` + Logout as the GL octagon CTA (`onClick={handleLogout}` — keeps its confirm popup). Single action per GL's one-CTA menu.
- `AnnouncementBell`, avatar menu, desktop sidebar/footer — untouched.

### 5. `client/src/components/AdminLayout.tsx`
- Same treatment: `HamburgerButton` in topbar (also `setProfileOpen(false)` when opening, since the existing profile-click-catcher overlay shares z-20), drop `MenuIcon` import, delete dark overlay (line 51), sidebar → `hidden lg:flex`, sheet with the 12 flat links (`menuItemClass(isActive)`; `location.pathname === link.path` logic unchanged) + Logout octagon CTA.
- Keep pathname effect (line 30) and the profile overlay — unchanged.

## Not copied (per "nothing else")
Language switcher · accordion/submenu plumbing (site has no submenus) · GL content, links, logo · GL's 1279px breakpoint · GL font (site keeps Inter; only menu typography specs are copied).

## Verification
1. `npx tsc -b` (workdir `client/`).
2. `npm run lint` at repo root (expect only pre-existing oxlint warnings).
3. `npm run build` at root.
4. `npm run dev` manual pass at a mobile viewport (e.g. 390×844) + desktop:
   - Public: hamburger morphs to X on a white edge-to-edge sheet; 24px links with `#C8CAD3` separators; active/hover `#FF5F2D`; octagon orange CTA; `Escape` closes; page behind doesn't scroll while open; navigating a link closes; desktop pill nav unchanged.
   - Student portal & Admin panel: topbar toggle morphs; white sheet below topbar; all links + Logout present (student: enrollment-conditional links respected); close via X / Escape / route change / resize ≥1024px.
   - At ≥1024px: sidebars and desktop nav byte-identical behavior to before.

## Out of scope
Desktop navigation/sidebars · content/pages other than menus · server/API/DB (this task is `client/` only).
