(() => {
  if (window.__rolexaEmployerCandidateMatch) return;
  window.__rolexaEmployerCandidateMatch = true;
  if (!/employer-dashboard\.html$/.test(location.pathname)) return;

  let clientPromise = null;

  const ROLEXA_MATCH_WEIGHTS = Object.freeze({
    'Target role': 30,
    'Required skills': 25,
    'Location': 15,
    'Work style': 10,
    'Salary': 10,
    'Current level': 10
  });

  const ROLEXA_MATCH_STATE_MULTIPLIERS = Object.freeze({
    compatible: 1,
    'needs-review': 0.5,
    'not-enough-data': 0.5,
    'not-compatible': 0
  });

  const ROLEXA_MATCH_BLEND = Object.freeze({ structured: 0.5, semantic: 0.5 });
  const MATCH_LABELS = Object.freeze(Object.keys(ROLEXA_MATCH_WEIGHTS));
  const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low']);

  function safe(value) {
    return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9£+]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function words(value) {
    return new Set(normalise(value).split(' ').filter(word => word.length > 2));
  }

  function overlap(a, b) {
    const first = words(a);
    const second = words(b);
    if (!first.size || !second.size) return 0;
    let matches = 0;
    first.forEach(word => { if (second.has(word)) matches += 1; });
    return matches / Math.max(1, Math.min(first.size, second.size));
  }

  function skillList(value) {
    return String(value || '').split(/[,;\n]+/).map(item => normalise(item)).filter(Boolean);
  }

  function skillCompatibility(candidateSkills, requiredSkills) {
    const candidate = skillList(candidateSkills);
    const required = skillList(requiredSkills);
    if (!required.length) return null;
    if (!candidate.length) return false;
    return required.some(requirement => candidate.some(skill => overlap(skill, requirement) > 0 || skill.includes(requirement) || requirement.includes(skill)));
  }

  function locationCompatibility(candidateLocation, jobLocation, jobStyle) {
    if (!jobLocation && !jobStyle) return null;
    if (/remote|flexible/i.test(jobStyle || '')) return true;
    if (!candidateLocation || !jobLocation) return null;
    return normalise(candidateLocation) === normalise(jobLocation) || overlap(candidateLocation, jobLocation) > 0;
  }

  function workStyleCompatibility(candidateStyle, jobStyle) {
    if (!jobStyle || !candidateStyle) return null;
    if (/flexible/i.test(jobStyle)) return true;
    return normalise(candidateStyle) === normalise(jobStyle);
  }

  function parseMoneyValues(value) {
    const text = String(value || '').replace(/,/g, '');
    return [...text.matchAll(/£?\s*(\d+(?:\.\d+)?)\s*(k)?/gi)].map(match => {
      const number = Number(match[1]);
      return match[2] ? number * 1000 : number;
    }).filter(Number.isFinite);
  }

  function salaryCompatibility(candidateMinimum, jobSalary) {
    const candidateValues = parseMoneyValues(candidateMinimum);
    const jobValues = parseMoneyValues(jobSalary);
    if (!jobValues.length || !candidateValues.length) return null;
    return Math.max(...jobValues) >= candidateValues[0];
  }

  function seniorityToken(value) {
    const text = normalise(value);
    const levels = [
      ['director', /director|head|vp|vice president/],
      ['lead', /lead|principal/],
      ['senior', /senior|sr/],
      ['mid', /mid level|mid-level|mid/],
      ['junior', /junior|entry|graduate|associate/]
    ];
    return levels.find(([, regex]) => regex.test(text))?.[0] || '';
  }

  function seniorityCompatibility(candidateLevel, jobText) {
    const jobLevel = seniorityToken(jobText);
    const candidate = seniorityToken(candidateLevel);
    if (!jobLevel || !candidate) return null;
    return candidate === jobLevel;
  }

  function roleCompatibility(candidateRole, jobTitle) {
    if (!jobTitle || !candidateRole) return null;
    return overlap(candidateRole, jobTitle) >= 0.34;
  }

  function matchState(result) {
    if (result === true || result === 'compatible') return 'compatible';
    if (result === null || result === undefined || result === 'not-enough-data') return 'not-enough-data';
    if (result === 'not-compatible') return 'not-compatible';
    return 'needs-review';
  }

  function calculateRolexaMatch(results) {
    const score = results.reduce((total, [label, result]) => {
      const weight = ROLEXA_MATCH_WEIGHTS[label] || 0;
      const multiplier = ROLEXA_MATCH_STATE_MULTIPLIERS[matchState(result)] ?? 0;
      return total + (weight * multiplier);
    }, 0);
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  function clampScore(value) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : null;
  }

  function normaliseSemanticResult(raw) {
    const score = clampScore(raw?.score);
    if (score === null) return null;
    const explanations = {};
    MATCH_LABELS.forEach(label => {
      const item = raw?.explanations?.[label];
      if (!item || typeof item.text !== 'string' || !item.text.trim()) return;
      explanations[label] = {
        text: item.text.trim(),
        confidence: CONFIDENCE_LEVELS.has(String(item.confidence || '').toLowerCase())
          ? String(item.confidence).toLowerCase()
          : 'low'
      };
    });
    return {
      available: true,
      score,
      explanations,
      confidence: CONFIDENCE_LEVELS.has(String(raw?.confidence || '').toLowerCase())
        ? String(raw.confidence).toLowerCase()
        : 'low',
      provider: String(raw?.provider || 'external')
    };
  }

  const semanticMatchingService = (() => {
    let provider = null;

    return Object.freeze({
      registerProvider(nextProvider) {
        if (typeof nextProvider === 'function') provider = { analyse: nextProvider };
        else if (nextProvider && typeof nextProvider.analyse === 'function') provider = nextProvider;
        else throw new TypeError('Semantic provider must expose an analyse(context) function.');
      },
      clearProvider() {
        provider = null;
      },
      isAvailable() {
        return Boolean(provider);
      },
      async analyse(context) {
        if (!provider) {
          return {
            available: false,
            score: null,
            explanations: {},
            confidence: 'low',
            provider: 'structured-fallback',
            reason: 'No external semantic AI provider is connected.'
          };
        }
        try {
          const result = normaliseSemanticResult(await provider.analyse(context));
          if (!result) throw new Error('Semantic provider returned an invalid result.');
          return result;
        } catch (error) {
          console.warn('Rolexa semantic matching provider failed; using structured fallback.', error);
          return {
            available: false,
            score: null,
            explanations: {},
            confidence: 'low',
            provider: 'structured-fallback',
            reason: 'Semantic analysis was unavailable.'
          };
        }
      }
    });
  })();

  window.RolexaSemanticMatchingService = semanticMatchingService;
  window.RolexaMatchEngine = Object.freeze({
    calculateRolexaMatch,
    blendScores(structuredScore, semanticResult) {
      if (!semanticResult?.available || semanticResult.score === null) return structuredScore;
      return clampScore((structuredScore * ROLEXA_MATCH_BLEND.structured) + (semanticResult.score * ROLEXA_MATCH_BLEND.semantic));
    }
  });

  function buildSemanticContext(profile, job, application) {
    return Object.freeze({
      applicationId: application?.id || null,
      candidate: {
        profile,
        cvText: profile.cv_text || profile.resume_text || profile.cv_content || null,
        targetRole: profile.target_role || null,
        currentLevel: profile.current_level || null,
        skills: profile.skills || null,
        experience: profile.experience || profile.work_experience || profile.bio || null
      },
      job: {
        raw: job,
        title: job.title || null,
        description: job.description || null,
        requiredSkills: job.required_skills || null,
        preferredSkills: job.preferred_skills || null,
        responsibilities: job.responsibilities || null,
        experience: job.experience || job.experience_required || job.requirements || null
      },
      safeguards: {
        neverInventExperience: true,
        unsupportedClaimText: 'Limited evidence found',
        allowedConfidence: ['high', 'medium', 'low']
      }
    });
  }

  function addStyles() {
    if (document.getElementById('rxEmployerMatchStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerMatchStyles';
    style.textContent = `
      .rx-role-match{border:1px solid rgba(23,107,255,.18);background:linear-gradient(135deg,#F8FAFF,#EEF4FF);border-radius:18px;padding:16px}
      .rx-role-match-top{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;margin-bottom:14px}
      .rx-role-match-score{width:76px;height:76px;border-radius:18px;background:#176BFF;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 10px 24px rgba(23,107,255,.18)}
      .rx-role-match-score strong{font-family:'Space Grotesk',Inter,sans-serif;font-size:25px;line-height:1}
      .rx-role-match-score span{display:block;width:100%;font-size:8.5px;font-weight:900;margin-top:5px;text-transform:uppercase;letter-spacing:.07em;text-align:center;line-height:1.05}
      .rx-role-match-copy h3{font-family:'Space Grotesk',Inter,sans-serif;font-size:17px;margin:0 0 4px;color:#071025}
      .rx-role-match-copy>p{font-size:12.5px;color:#6B7280;line-height:1.4;margin:0}
      .rx-role-match-signals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .rx-role-match-signal{display:grid;grid-template-columns:9px minmax(0,1fr);gap:7px;align-items:center;border:1px solid rgba(7,16,37,.08);background:#fff;border-radius:11px;padding:9px 10px;font-size:11.5px;font-weight:800;color:#26324C;min-width:0}
      .rx-role-match-signal span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rx-role-match-dot{width:8px;height:8px;border-radius:50%;background:#B9C0CF}
      .rx-role-match-signal.good .rx-role-match-dot{background:#22A06B}
      .rx-role-match-signal.bad .rx-role-match-dot{background:#E0533F}
      .rx-role-match-signal.unknown .rx-role-match-dot{background:#AAB2C3}
      .rx-role-match-explanation{margin-top:14px;padding-top:14px;border-top:1px solid rgba(23,107,255,.14)}
      .rx-role-match-explanation h4{font-family:'Space Grotesk',Inter,sans-serif;font-size:14px;color:#071025;margin:0 0 9px}
      .rx-role-match-reasons{display:grid;gap:7px}
      .rx-role-match-reason{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:start;background:rgba(255,255,255,.72);border:1px solid rgba(7,16,37,.07);border-radius:11px;padding:9px 10px}
      .rx-role-match-reason-icon{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}
      .rx-role-match-reason.good .rx-role-match-reason-icon{background:#E1F6EB;color:#16845A}
      .rx-role-match-reason.bad .rx-role-match-reason-icon{background:#FFF0ED;color:#C74735}
      .rx-role-match-reason.unknown .rx-role-match-reason-icon{background:#EEF1F6;color:#687386}
      .rx-role-match-reason b{display:block;color:#071025;font-size:11.5px;margin-bottom:2px}
      .rx-role-match-reason p{color:#596279;font-size:11.5px;line-height:1.4;margin:0}
      .rx-role-match-note{font-size:10.5px;color:#6B7280;margin-top:10px;line-height:1.4}
      @media(max-width:760px){
        .rx-role-match{padding:13px}
        .rx-role-match-top{grid-template-columns:68px minmax(0,1fr);gap:11px;margin-bottom:12px}
        .rx-role-match-score{width:68px;height:68px;border-radius:16px}
        .rx-role-match-score strong{font-size:22px}
        .rx-role-match-copy h3{font-size:15.5px}
        .rx-role-match-copy>p{font-size:11.5px}
        .rx-role-match-signals{grid-template-columns:1fr 1fr}
        .rx-role-match-signal{font-size:10.8px;padding:8px 9px}
        .rx-role-match-reason{padding:9px}
      }
      @media(max-width:430px){
        .rx-role-match-signals{grid-template-columns:1fr}
        .rx-role-match-signal span:last-child{white-space:normal}
      }
    `;
    document.head.appendChild(style);
  }

  async function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
          if (existing) {
            existing.addEventListener('load', resolve, { once:true });
            existing.addEventListener('error', reject, { once:true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      for (const file of ['candidate-profile-sync.js','employer-job-sync.js?v=2']) {
        try {
          const response = await fetch(file, { cache:'no-store' });
          const text = await response.text();
          const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
          const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
          if (url && key) return window.supabase.createClient(url, key);
        } catch (_) {}
      }
      throw new Error('Supabase configuration could not be found.');
    })();
    return clientPromise;
  }

  function signal(label, result) {
    const state = result === true ? 'good' : result === false ? 'bad' : 'unknown';
    const suffix = result === true ? 'Compatible' : result === false ? 'Needs review' : 'Not enough data';
    return `<div class="rx-role-match-signal ${state}" title="${safe(label)} · ${safe(suffix)}"><span class="rx-role-match-dot"></span><span>${safe(label)} · ${safe(suffix)}</span></div>`;
  }

  function structuredExplanation(label, result, profile, job) {
    const messages = {
      'Target role': result === true
        ? `The candidate’s target role aligns with “${job.title || 'this role'}”.`
        : result === false
          ? `The candidate’s stated target role differs from “${job.title || 'this role'}” and should be reviewed manually.`
          : 'The candidate or job title does not contain enough information to assess role alignment.',
      'Required skills': result === true
        ? 'At least one of the candidate’s listed skills overlaps with the role’s required skills.'
        : result === false
          ? 'No clear overlap was found between the candidate’s listed skills and the role’s required skills.'
          : 'The role does not have enough structured required-skill information for a reliable comparison.',
      'Location': result === true
        ? 'The candidate’s location is compatible with the role location or its remote/flexible arrangement.'
        : result === false
          ? 'The candidate location and role location may not be compatible and should be checked.'
          : 'Location compatibility cannot be assessed because location information is incomplete.',
      'Work style': result === true
        ? 'The candidate’s preferred work style matches the arrangement offered by the role.'
        : result === false
          ? 'The candidate’s preferred work style differs from the role’s stated arrangement.'
          : 'Work-style information is incomplete, so compatibility cannot be assessed.',
      'Salary': result === true
        ? 'The advertised salary range can meet the candidate’s stated minimum expectation.'
        : result === false
          ? 'The advertised salary maximum appears below the candidate’s stated minimum expectation.'
          : 'The candidate minimum or job salary range is missing or cannot be interpreted reliably.',
      'Current level': result === true
        ? 'The candidate’s stated seniority matches the seniority indicated in the role.'
        : result === false
          ? 'The candidate’s stated seniority differs from the seniority indicated in the role.'
          : 'The role does not contain enough seniority information to assess the candidate’s current level.'
    };
    return messages[label] || 'This signal requires further review.';
  }

  function explanation(label, result, profile, job, semanticResult) {
    const state = result === true ? 'good' : result === false ? 'bad' : 'unknown';
    const icon = result === true ? '✓' : result === false ? '!' : '?';
    const semantic = semanticResult?.available ? semanticResult.explanations?.[label] : null;
    const text = semantic?.text || structuredExplanation(label, result, profile, job);
    const confidence = semantic?.confidence || 'low';
    return `<div class="rx-role-match-reason ${state}" data-confidence="${safe(confidence)}"><span class="rx-role-match-reason-icon">${icon}</span><div><b>${safe(label)}</b><p>${safe(text)}</p></div></div>`;
  }

  function buildStructuredResults(profile, job) {
    return [
      ['Target role', roleCompatibility(profile.target_role, job.title)],
      ['Required skills', skillCompatibility(profile.skills, job.required_skills)],
      ['Location', locationCompatibility(profile.location, job.location, job.work_style)],
      ['Work style', workStyleCompatibility(profile.work_style, job.work_style)],
      ['Salary', salaryCompatibility(profile.minimum_salary, job.salary_range)],
      ['Current level', seniorityCompatibility(profile.current_level, `${job.title || ''} ${job.description || ''}`)]
    ];
  }

  function cardHtml(profile, job, application, semanticResult) {
    const results = buildStructuredResults(profile, job);
    const structuredScore = calculateRolexaMatch(results);
    const score = window.RolexaMatchEngine.blendScores(structuredScore, semanticResult);
    const label = score >= 80 ? 'Strong structured match' : score >= 60 ? 'Good structured match' : score >= 40 ? 'Possible structured match' : 'More review needed';
    const note = semanticResult?.available
      ? 'Structured profile and semantic CV evidence are combined in this Rolexa Match.'
      : 'Structured data only. CV analysis and semantic AI are not included yet.';
    return `<section class="rx-role-match" id="rxEmployerRolexaMatch" data-structured-score="${structuredScore}" data-semantic-score="${semanticResult?.score ?? ''}" data-semantic-confidence="${safe(semanticResult?.confidence || 'low')}"><div class="rx-role-match-top"><div class="rx-role-match-score"><strong>${score}%</strong><span>Rolexa Match</span></div><div class="rx-role-match-copy"><h3>${safe(label)}</h3><p>Based on this candidate’s profile and the role’s structured information.</p></div></div><div class="rx-role-match-signals">${results.map(([name,result]) => signal(name,result)).join('')}</div><div class="rx-role-match-explanation"><h4>Why this candidate matches</h4><div class="rx-role-match-reasons">${results.map(([name,result]) => explanation(name,result,profile,job,semanticResult)).join('')}</div></div><div class="rx-role-match-note">${safe(note)}</div></section>`;
  }

  async function render(applicationId) {
    const body = document.querySelector('#rxProfileModal .rx-modal-body');
    if (!body || document.getElementById('rxEmployerRolexaMatch')) return;
    try {
      const client = await getClient();
      const { data: application, error: appError } = await client.from('candidate_applications').select('*').eq('id', applicationId).maybeSingle();
      if (appError || !application?.user_id || !application?.job_id) return;

      const [profileResult, jobResult] = await Promise.all([
        client.from('candidate_profiles').select('*').eq('user_id', application.user_id).maybeSingle(),
        client.from('jobs').select('*').eq('id', application.job_id).maybeSingle()
      ]);
      if (profileResult.error || jobResult.error || !profileResult.data || !jobResult.data || !document.getElementById('rxProfileModal')) return;

      const semanticResult = await semanticMatchingService.analyse(buildSemanticContext(profileResult.data, jobResult.data, application));
      if (!document.getElementById('rxProfileModal')) return;

      addStyles();
      const html = cardHtml(profileResult.data, jobResult.data, application, semanticResult);
      const links = body.querySelector('.rx-employer-profile-links');
      if (links) links.insertAdjacentHTML('afterend', html);
      else body.insertAdjacentHTML('afterbegin', html);
    } catch (error) {
      console.warn('Rolexa match error', error);
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-review-profile]');
    if (!trigger) return;
    const applicationId = trigger.getAttribute('data-review-profile');
    if (!applicationId) return;
    setTimeout(() => render(applicationId), 260);
  });
})();
