# Claude Design Prompt for the Lepel Family Timeline Animation

This is the prompt to paste into Claude (new conversation, web or desktop app) along with the three attached files. Claude will build the HTML timeline visualization synced to the audio.

## Files to attach to the Claude conversation

1. **Lepel_Family_Narration_2026.mp3** (the assembled audio, approximately 18 minutes)
2. **Family_Narration_Script_May_2026.md** (the full script with pronunciation guide and visual cue list)
3. Optionally: any reference image you want Claude to match for visual style

## The prompt (copy-paste this into Claude)

---

I need you to build an animated 5-track family history timeline as a single self-contained HTML file. This is for my personal family history project.

The deliverable is a fully working HTML page with the audio embedded as the soundtrack, the timeline visualization rendering in sync with the narration, and the whole thing playable in any modern browser. I'll host it on my professional website.

**Audio source:** The attached MP3 is an 18-minute narrated documentary covering 422 years of my family history. The narration walks through five acts: European origins (1604-1665), the crossings to Nouvelle France (1665-1763), revolution and migration (1763-1865), the Napierville convergence and mill migration (1865-1900), and convergence in Massachusetts to me and my sister (1900-2026).

**Narration script:** The attached Markdown file is the full script with pronunciation guide and a detailed visual cue list. Use the visual cue list as your guide for what should appear when, but use the audio file as the source of truth for timing.

**Five tracks to animate:**

Five horizontal tracks running left-to-right across the screen, each representing one ancestral line plus a historical events track:

1. **Bétourné / Bétourney line** (paternal-maternal, Picardy France to Quebec to Massachusetts). Founding immigrant Adrien Bétourné dit Laviolette, born 1635 Saint-Crépin-Ibouvilliers. Color suggestion: warm orange/amber.

2. **Mongeau dit Clermont line** (maternal-maternal, Clermont-Ferrand Auvergne France to Quebec to Massachusetts). Founding ancestor Mathieu Mangot, early-1600s. Color suggestion: deep purple.

3. **Barbeau line** (maternal-paternal, Nouvelle France to Saint-Édouard de Napierville to Massachusetts). Joseph Barbeau dit Boisdoré born 1757. Citizenship anchor Joseph Wilfred Barbeau (1870-1938) never left Canada. Color suggestion: forest green.

4. **Heppell-Lepel line** (paternal-paternal, Prussia Germany to colonial New York to Quebec to Massachusetts). Johann Nickolaus Heppell baptized 1707 Baumholder Prussia. Color suggestion: deep blue.

5. **Historical events** (world history that intersects with family events). Color suggestion: warm gold or contrasting neutral.

**Visual elements per track:**

- Each ancestor appears as a labeled marker (circle or rectangle) at their birth year position on their track
- Migrations are shown as animated arrows traveling from origin to destination
- Marriages are shown as visual connections joining two markers
- Major historical events on Track 5 appear as vertical bands or colored regions intersecting the family tracks they're relevant to
- A moving playhead indicator shows current position in the narration

**Synchronization:**

The visualization plays automatically with the audio. As the narration mentions an ancestor, that ancestor's marker on the relevant track should highlight, pulse, or zoom briefly. As the narration describes a migration, the corresponding arrow should animate. Historical events should appear in their bands at the moment the narration mentions them.

You can analyze the audio file to determine timing, or estimate timing from the script structure if needed.

**Geographic element:**

When the narration mentions specific places (Saint-Crépin-Ibouvilliers, Clermont-Ferrand, Baumholder, Quebec City, Saint-Édouard de Napierville, Williamstown, North Adams, Albany New York), a map inset should appear briefly showing the location on a world or regional map.

**Three pivotal dramatic moments that need particular visual emphasis:**

1. The Napierville convergence (around 1854-1880): three ancestral lines (Bétourné, Mongeau-Clermont, Barbeau) all clustering on the same Saint-Édouard de Napierville parish. This should be a striking visual moment where three tracks visually overlap on a single map location.

2. The four-line convergence in North Adams Massachusetts (1930s-1940s): visualize four streams merging into one as Ronald Lepel marries Lorraine Barbeau.

3. The closing of the circle (around 2000): a visual arrow connecting Salem New York (where John Jacob Jean Heppell was born 1753) to Albany New York (60 miles south, where Daniel lives today), showing the family completing a geographic round-trip across 273 years.

**Style preferences:**

- Documentary aesthetic, Ken Burns documentary feel
- Warm color palette
- Readable typography (Georgia, Garamond, or similar serif font for names; sans-serif for dates)
- Subtle animations (fade-ins, gentle pulses) rather than aggressive motion
- Dark or off-white background, your choice

**Technical requirements:**

- Single self-contained HTML file (no external dependencies except Leaflet.js for maps if you need it from CDN)
- The audio MP3 should be embedded or referenced relatively
- Works on desktop browsers (Chrome, Firefox, Edge, Safari)
- Mobile responsive is a plus but not required
- Optional: include a play/pause button so the viewer controls playback
- Optional: include a meta tag <meta name="robots" content="noindex"> so search engines don't index this private family content

**My family:**

Daniel Lepel (born 1965) and Renee Lepel Hanson (born 1968) are the two American descendants holding all four lines together at the end of the timeline. The visualization should culminate with us at the right edge of the screen, with all four streams converging into our two markers.

Please build the full HTML timeline. If the file gets too large, prioritize a working, watchable version over perfect polish. I can iterate.

---

## After Claude generates the HTML

When Claude produces the HTML artifact:

1. **Save it** as `Lepel_Family_Timeline.html` in your Lineage folder
2. **Test it locally** by double-clicking the file (opens in your default browser)
3. **Make sure the MP3 plays** alongside the visualization
4. **Iterate if needed** - send Claude follow-up requests like "the Bétourné track marker for Adrien should appear at 1635, not 1665" or "the Napierville convergence moment isn't dramatic enough, can you emphasize it more"

## Hosting on your professional website

Once the HTML works locally:

1. Copy the HTML file plus the MP3 into a subfolder of your website repo: `/lineage/`
2. Name the HTML file `index.html` so the URL is clean: `yoursite.com/lineage/`
3. Add to your `robots.txt`:
   ```
   User-agent: *
   Disallow: /lineage/
   ```
4. Commit and push to your git repo
5. Whatever deployment platform you use (GitHub Pages, Netlify, Vercel, Azure Static Web Apps) will auto-deploy
6. The page is now live at `yoursite.com/lineage/`, off search engines, accessible only to people you share the URL with

That's the full pipeline. Audio → Claude Design HTML → host on your site → share with family.
