#!/usr/bin/env python3
"""Safety net for the Disposition Planner's rules.

    python3 checks/check.py            compare every path with checks/golden-paths.json
    python3 checks/check.py snapshot   record the current results as the new golden list

Walks every path through the tool (the rules in index.html's <script id="dp-logic">), checks things that must
always hold, and reports any path whose result differs from the recorded list.
"""
import json, re, shutil, subprocess, sys, tempfile, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
GOLDEN = ROOT / 'checks/golden-paths.json'
JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'


def run():
    page = (ROOT / 'index.html').read_text(encoding='utf-8')
    logic = re.search(r'<script id="dp-logic">\n(.*?)</script>', page, re.S).group(1)
    ui = re.search(r'<script>\n(.*?)</script>\s*</body>', page, re.S).group(1)
    walk = (ROOT / 'checks/walk.js').read_text(encoding='utf-8')
    # The page-drawing script is only parsed here (wrapped in a function, never called): this catches a typo in it.
    js = logic + walk + '\nfunction __pageScript() {\n' + ui + '\n}\n' + '''
var w = walkAll();
(typeof print === 'function' ? print : console.log)(JSON.stringify({ text: allText(), paths: w.paths, problems: w.problems.concat(invariants(w.paths)) }));'''
    exe = shutil.which('node') or JSC
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(js)
    r = subprocess.run([exe, f.name], capture_output=True, text=True)
    pathlib.Path(f.name).unlink()
    if r.returncode:
        sys.exit('Could not run the rules:\n' + r.stderr)
    return json.loads(r.stdout)


def main():
    got = run()
    paths, problems = got['paths'], got['problems']
    print(len(paths), 'paths walked')
    for p in problems[:40]:
        print('  PROBLEM:', p)
    if len(sys.argv) > 1 and sys.argv[1] == 'snapshot':
        if problems:
            sys.exit('Not recorded: fix the %d problem(s) above first.' % len(problems))
        GOLDEN.write_text('{"text": ' + json.dumps(got['text'], ensure_ascii=False, indent=1) + ',\n"paths": [\n'
                          + ',\n'.join(json.dumps(p, ensure_ascii=False) for p in paths) + '\n]}\n', encoding='utf-8')
        print('Recorded', GOLDEN.name)
        return
    golden = json.loads(GOLDEN.read_text(encoding='utf-8'))
    old = {p['a']: p for p in golden['paths']}
    wording = golden['text'] != got['text']
    if wording:
        if golden['text'].get('barriers') != got['text'].get('barriers'):
            print('  WORDING CHANGED in placement barriers')
        for part in ('questions', 'destinations'):
            for o, n in zip(golden['text'][part], got['text'][part]):
                if o != n:
                    print('  WORDING CHANGED in %s: %s' % (n[0], next((json.dumps(y, ensure_ascii=False) for x, y in zip(o, n) if x != y), '')))
            if len(golden['text'][part]) != len(got['text'][part]):
                print('  WORDING: the number of %s changed' % part)
    new = {p['a']: p for p in paths}
    changed = [a for a in new if a in old and new[a] != old[a]]
    added, gone = [a for a in new if a not in old], [a for a in old if a not in new]
    for label, items in (('CHANGED', changed), ('NEW PATH', added), ('PATH GONE', gone)):
        for a in items[:25]:
            print('  %s: %s' % (label, a))
            if label == 'CHANGED':
                for k in ('fits', 'check', 'out', 'unlock', 'exit', 'first', 'today', 'after'):
                    if old[a].get(k) != new[a].get(k):
                        print('      %s: %s  ->  %s' % (k, json.dumps(old[a].get(k), ensure_ascii=False), json.dumps(new[a].get(k), ensure_ascii=False)))
        if len(items) > 25:
            print('  ... and %d more %s' % (len(items) - 25, label))
    if problems or changed or added or gone or wording:
        sys.exit('\nFAILED: %d problem(s), %d changed, %d new, %d gone%s. If the changes are intended, run: python3 checks/check.py snapshot'
                 % (len(problems), len(changed), len(added), len(gone), ', wording changed' if wording else ''))
    print('All paths and wording match the recorded list. No problems.')


if __name__ == '__main__':
    main()
