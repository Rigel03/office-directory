// Smart Philippine and Western compound surname particles
const COMPOUND_PREFIXES = new Set([
  'de', 'del', 'dela', 'de la', 'delos', 'de los', 'san', 'santa', 'van', 'von', 'mac', 'mc', 'st.', 'st'
]);

const SUFFIXES = new Set([
  'jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'cpa'
]);

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizes input name into standard "LAST, First M. [Suffix]"
 */
function normalizeName(input) {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  // Check if already in "LAST, First Middle" format
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim());
    let lastName = parts[0];
    let firstAndRest = parts.slice(1).join(', ').trim();

    // Check if suffix ended up in firstAndRest or lastName
    const restTokens = firstAndRest.split(' ').filter(Boolean);
    let detectedSuffix = '';
    const filteredTokens = [];

    for (const t of restTokens) {
      if (SUFFIXES.has(t.toLowerCase().replace('.', ''))) {
        detectedSuffix = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        if (!detectedSuffix.endsWith('.') && ['Jr', 'Sr'].includes(detectedSuffix)) detectedSuffix += '.';
      } else {
        filteredTokens.push(t);
      }
    }

    const formattedLast = lastName.toUpperCase();
    const formattedRest = filteredTokens.map((w, idx) => {
      // If single letter initial without dot, add dot
      if (/^[A-Za-z]$/.test(w)) return w.toUpperCase() + '.';
      if (/^[A-Za-z]\.$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');

    let result = `${formattedLast}, ${formattedRest}`;
    if (detectedSuffix) result += ` ${detectedSuffix}`;
    return result.trim();
  }

  // Otherwise, it is in "First Middle Last [Suffix]" order
  const tokens = clean.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].toUpperCase();
  }

  let suffix = '';
  if (SUFFIXES.has(tokens[tokens.length - 1].toLowerCase().replace('.', ''))) {
    suffix = tokens.pop();
    suffix = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
    if (!suffix.endsWith('.') && ['Jr', 'Sr'].includes(suffix)) suffix += '.';
  }

  if (tokens.length === 1) {
    return `${tokens[0].toUpperCase()}${suffix ? ' ' + suffix : ''}`;
  }

  // Detect compound last names (e.g. Dela Cruz, De La Cruz, Del Rosario, San Jose)
  let lastNameTokens = [];
  
  if (tokens.length >= 3 && tokens[tokens.length - 3].toLowerCase() === 'de' && tokens[tokens.length - 2].toLowerCase() === 'la') {
    lastNameTokens = tokens.splice(tokens.length - 3, 3);
  } else if (tokens.length >= 2 && COMPOUND_PREFIXES.has(tokens[tokens.length - 2].toLowerCase().replace('.', ''))) {
    lastNameTokens = tokens.splice(tokens.length - 2, 2);
  } else {
    lastNameTokens = [tokens.pop()];
  }

  const lastName = lastNameTokens.join(' ').toUpperCase();
  const firstMiddle = tokens.map(w => {
    if (/^[A-Za-z]$/.test(w)) return w.toUpperCase() + '.';
    if (/^[A-Za-z]\.$/.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');

  let result = `${lastName}, ${firstMiddle}`;
  if (suffix) result += ` ${suffix}`;
  return result.trim();
}

/**
 * Compares a candidate employee record with existing database records to find likely duplicates
 */
function findDuplicates(candidate, existingEmployees) {
  const matches = [];
  const candName = normalizeName(candidate.full_name || candidate.name || '');
  const candEmail = (candidate.email || '').trim().toLowerCase();
  const candPhone = (candidate.phone || '').trim().toLowerCase().replace(/[^0-9]/g, '');

  if (!candName && !candEmail) return matches;

  // Split candidate into last and first tokens
  const candParts = candName.split(',').map(s => s.trim());
  const candLast = (candParts[0] || '').toUpperCase();
  const candRest = (candParts[1] || '').toUpperCase();
  const candFirstInitial = candRest ? candRest.charAt(0) : '';

  for (const existing of existingEmployees) {
    let score = 0;
    const reasons = [];

    const exName = existing.full_name || '';
    const exEmail = (existing.email || '').trim().toLowerCase();
    const exPhone = (existing.phone || '').trim().toLowerCase().replace(/[^0-9]/g, '');

    // 1. Email exact match
    if (candEmail && exEmail && candEmail === exEmail) {
      score += 90;
      reasons.push(`Matching email: ${candEmail}`);
    }

    // 2. Exact normalized name
    if (candName && exName && candName === exName) {
      score += 95;
      reasons.push(`Exact normalized name match: "${exName}"`);
    } else if (candLast) {
      const exParts = exName.split(',').map(s => s.trim());
      const exLast = (exParts[0] || '').toUpperCase();
      const exRest = (exParts[1] || '').toUpperCase();
      const exFirstInitial = exRest ? exRest.charAt(0) : '';

      // Same last name and same first initial (e.g. "DELA CRUZ, J." vs "DELA CRUZ, Juan P.")
      if (candLast === exLast) {
        if (candFirstInitial && exFirstInitial && candFirstInitial === exFirstInitial) {
          score += 75;
          reasons.push(`Matching surname "${candLast}" and initial "${candFirstInitial}"`);
        } else {
          score += 35;
          reasons.push(`Matching surname "${candLast}"`);
        }
      }
    }

    // Phone match
    if (candPhone && exPhone && candPhone.length >= 7 && candPhone === exPhone) {
      score += 40;
      reasons.push(`Matching phone number`);
    }

    if (score >= 60) {
      matches.push({
        existing,
        score,
        reasons: reasons.join('; ')
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

module.exports = {
  normalizeName,
  findDuplicates
};
