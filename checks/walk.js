// Walks every path through the tool using dp-logic (loaded first), answering questions in the order shown.
// Used by checks/check.py on this computer and by tests.html in a browser.
function walkAll() {
  var out = [], problems = [], n = 0;
  (function go(s) {
    var b = boardFor(s);
    if (b.done) {
      var sample = (n++ % 10 === 0), r = record(s, b);
      // To keep the recorded list small, every tenth path keeps its "would be possible with" hints
      // and is also recorded with each placement barrier ticked.
      if (!sample) delete r.unlock;
      out.push(r);
      if (sample) BARRIERS.forEach(function(x) { var sb = withAnswer(s, x[0], 'yes'), rb = record(sb, boardFor(sb)); delete rb.unlock; out.push(rb); });
      return;
    }
    var q = b.left[0];
    if (b.ask.indexOf(q) === -1) problems.push('Next question "' + q.label + '" is not on screen after: ' + answersOf(s));
    q.opts.forEach(function(o) { go(withAnswer(s, q.k, o[0])); });
  })({});
  return { paths: out, problems: problems };
}
function answersOf(s) {
  return QUESTIONS.filter(function(q) { return s[q.k]; }).map(function(q) { return q.k + '=' + s[q.k]; })
    .concat(BARRIERS.filter(function(x) { return s[x[0]]; }).map(function(x) { return '+' + x[0]; })).join(' ');
}
// One path's result, as the page would show it.
function record(s, b) {
  var r = { a: answersOf(s), fits: [], check: {}, out: {}, unlock: {}, exit: [], first: b.first, today: b.today, after: null };
  b.rows.forEach(function(x) {
    if (x.st === 'yes') r.fits.push(x.d.id);
    if (x.st === 'if') r.check[x.d.id] = x.iff;
    if (x.st === 'open') r.check[x.d.id] = ['STILL OPEN'];
    if (x.st === 'out') r.out[x.d.id] = x.no;
    if (x.unlock.length) r.unlock[x.d.id] = x.unlock;
    if (x.exit) r.exit.push(x.d.id);
  });
  if (b.after) {
    r.after = { fits: [], check: {} };
    b.after.forEach(function(x) {
      if (x.st === 'yes') r.after.fits.push(x.d.id);
      if (x.st === 'if') r.after.check[x.d.id] = x.iff;
      if (x.st === 'open') r.after.check[x.d.id] = ['STILL OPEN'];
    });
  }
  return r;
}
// Every word the page can show that is not part of a path's result: questions, choices, definitions,
// and each destination's name, description, consult, notes and SW text. Recorded so a wording change is noticed.
function allText() {
  return {
    questions: QUESTIONS.map(function(q) { return [q.k, q.label, q.hint || '', q.opts]; }),
    barriers: BARRIERS,
    destinations: DEST.map(function(d) { return [d.id, d.grp, d.name, d.sub || '', d.what, d.consult, d.notes || [], d.sw || '', d.rules.map(function(r) { return r[0] + ': ' + r[2]; })]; })
  };
}
// Things that must hold on every path, whatever the rules say.
function invariants(paths) {
  var bad = [];
  paths.forEach(function(p) {
    var n = p.a.split(' ').filter(function(x) { return x.charAt(0) !== '+'; }).length, checks = Object.keys(p.check);
    var elope = /cog=elope/.test(p.a) && /goal=active/.test(p.a), locked = ['clc_2n', 'cnh_skilled', 'cnh_custodial'];
    function fail(msg) { bad.push(msg + ' [' + p.a + ']'); }
    if (!p.fits.length && !checks.length) fail('Nothing left: every destination is ruled out');
    if (elope) {
      if (p.out.clc_2n ? p.first === 'clc_2n' : p.first !== 'clc_2n') fail('Elopement risk: CLC Dementia Care should be the first step whenever it is not ruled out');
      p.fits.forEach(function(id) { if (locked.indexOf(id) === -1) fail('Elopement risk, yet unlocked ' + id + ' fits with nothing to check'); });
      if (!/surr=yes/.test(p.a) && p.fits.length) fail('Elopement risk with no surrogate, yet ' + p.fits.join(', ') + ' fits');
    } else {
      if (p.first && p.fits.indexOf(p.first) === -1) fail('"Consider first" is not a destination that fits');
      if (p.fits.length && p.first !== p.fits[0]) fail('"Consider first" is not the first destination that fits');
    }
    if (/\+b_restraint/.test(p.a) && (p.fits.indexOf('clc_2n') !== -1 || p.fits.indexOf('cnh_skilled') !== -1 || p.fits.indexOf('cnh_custodial') !== -1 || p.fits.indexOf('cnh_hospice') !== -1)) fail('Restraints ticked, yet a CNH or CLC Dementia Care fits');
    var needsExit = /skilled=yes/.test(p.a) && /home=(unsafe|homeless)/.test(p.a);
    if (needsExit !== !!p.after) fail(needsExit ? 'Exit plan needed but no "After the short stay" list' : '"After the short stay" list shown when not needed');
    if (p.after) Object.keys(p.after.check).forEach(function(id) { if (p.after.check[id][0] === 'STILL OPEN') fail('After the short stay: ' + id + ' has no settled status'); });
    if (/cog=elope/.test(p.a) && /goal=active/.test(p.a) && !p.check.clc_2n && p.fits.indexOf('clc_2n') === -1) fail('Elopement risk without CLC Dementia Care listed');
    if (/goal=comfort/.test(p.a) && n !== 2) fail('Comfort path asked ' + n + ' questions, expected 2');
    if (n > 9) fail('More than 9 questions');
    checks.forEach(function(id) { if (!p.check[id].length || p.check[id][0] === 'STILL OPEN') fail(id + ' has no settled status'); });
  });
  return bad;
}
