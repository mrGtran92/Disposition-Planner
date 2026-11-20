# Disposition Planner (VA GLA)

Decision support for VA Greater Los Angeles inpatient General Medicine: which discharge destinations are still possible
for this patient, which are ruled out and why, and which slow steps to start today.
Live at https://mrgtran92.github.io/Disposition-Planner/. Based on the VA GLA Disposition Primer (tinyurl.com/vagladispo).

One screen. The questions stay on the page as rows of choices; the list of destinations updates with every answer.
Each destination is **Fits**, **Check** (with the item to confirm) or **Ruled out** (with the reason). The list is in a
fixed order, least restrictive first, and the first one that fits is marked "Consider first". Answers are never saved.

Also on the page:
- **After the short stay**: when a skilled patient has no safe home to return to, a second list shows the long-term
  options, worked out as if the skilled need were over.
- **Placement barriers**: optional tick boxes (restraints or sitter, registered sex offender, over 300 lb, behavioral
  issues) that add a Check to the rows they affect.
- **Would be possible with**: on a ruled-out row, the single answers that would open it (function, housing,
  surrogate, substance use, funding, service connection).
- **Elopement risk**: CLC Dementia Care is marked "Usual first step" whenever it is not ruled out.

## Files
- `index.html`: the whole tool, one file. Two scripts inside it:
  - `dp-logic`: the questions, the destinations and their rules. The only place outcomes are decided.
  - the second, plain script: draws the page, the glossary and the text-size buttons.
- `tests.html`: open it on the live site after any change. It should say "All tests pass".
- `checks/check.py`: the same safety net, run on this computer.
- `checks/walk.js`: walks every path; shared by the two above.
- `checks/golden-paths.json`: every path through the tool and what it shows, plus all wording (1,705 records as of
  November 2026: every path, and every tenth path again with each placement barrier ticked).

## Changing a rule or wording
1. Edit `index.html`. Rules are in the `DEST` list: each rule is a level (`'no'` rules the destination out, `'if'`
   makes it a Check), a test on the answers, and the text shown.
2. Run `python3 checks/check.py`. It lists every path whose result changed. If the changes are what you intended, run
   `python3 checks/check.py snapshot` to record the new list.
3. After publishing, open `tests.html` on the live site.
4. Update "Last updated" at the bottom of `index.html`.

Keep the answer codes (`goal`, `skilled`, `func`, `cog`, `home`, `surr`, `sud`, `fund`, `sc`, and `b_*` for barriers) and the `dp-logic` script id:
the tests find the rules by that id.

## Wording still to confirm with SW / CNH coordinators / Palliative Care
- VA-paid CNH: the custodial CNH row says "VA may pay at 70% SC or more: ask the CNH coordinators".
- Hospice in a CNH: "VA can cover hospice in a CNH".
- RCFE: "some may need 90 days sobriety"; Medi-Cal's Assisted Living Waiver.
- Medi-Cal number "about 2 weeks"; tube feeds "over 50% of nutrition".
