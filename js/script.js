document.addEventListener('DOMContentLoaded', () => {

  const LAMBDA_URL = 'https://gqns1d7wza.execute-api.us-east-1.amazonaws.com/prod/register';

  // Open all markdown-rendered links in a new tab
  marked.use({
    renderer: {
      link({ href, title, text }) {
        const t = title ? ` title="${title}"` : '';
        return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
    }
  });

  // --- FIELD LABEL MAPPINGS (per language) ---
  const fieldLabelMappingJa = {
    candidate_name: 'フルネーム',
    candidate_email: 'メールアドレス',
    candidate_contact: '電話番号 & メッセンジャー',
    jlpt_level: '日本語能力試験レベル',
    aws_exp: 'AWSの知識 / 経験',
    github_url: 'GitHub URL',
    how_heard: 'このサイトを知ったきっかけ',
    country_timezone: '居住国 & タイムゾーン',
    company_name: '会社名',
    company_email: 'メールアドレス',
    company_contact: '担当者連絡先',
    company_sector: '対象セクター',
    project_requirements: 'ご相談内容',
  };

  const fieldLabelMappingEn = {
    candidate_name: 'Full Name',
    candidate_email: 'Email Address',
    candidate_contact: 'Phone & Messenger',
    jlpt_level: 'JLPT Level',
    aws_exp: 'AWS Knowledge / Experience',
    github_url: 'GitHub URL',
    how_heard: 'How did you hear about us?',
    country_timezone: 'Country & Time Zone',
    company_name: 'Company Name',
    company_email: 'Business Email',
    company_contact: 'Contact Person',
    company_sector: 'Target Sector',
    project_requirements: 'Inquiry / Project Requirements',
  };

  // --- BILINGUAL STRINGS ---
  const i18n = {
    ja: {
      required: '必須項目をすべて入力してください。',
      sending: '送信中...',
      success: '✅ 送信が完了しました。ありがとうございます。',
      error: '送信に失敗しました。再度お試しください。',
      confirm: '確定して送信',
      loading: '読み込み中...',
      captcha: 'CAPTCHA認証を完了してください。',
    },
    en: {
      required: 'Please fill in all required fields.',
      sending: 'Sending...',
      success: '✅ Submission complete. Thank you.',
      error: 'Submission failed. Please try again.',
      confirm: 'Confirm & Submit',
      loading: 'Loading...',
      captcha: 'Please complete the CAPTCHA verification.',
    },
  };

  // --- FORM SET SETUP (called once per language) ---
  function setupFormSet(lang) {
    const suffix = lang === 'en' ? '-en' : '';
    const scope = lang === 'en' ? '#post-en' : '#post-ja';

    const formTabBtns = document.querySelectorAll(`${scope} .form-tab-btn[data-form]`);
    const candidatePane = document.getElementById(`candidate-form-pane${suffix}`);
    const corporatePane = document.getElementById(`corporate-form-pane${suffix}`);
    const reviewPane = document.getElementById(`form-review-pane${suffix}`);
    const reviewContentDump = document.getElementById(`review-content-dump${suffix}`);
    const reviewConfirmBtn = document.getElementById(`review-confirm-btn${suffix}`);
    const reviewBackBtn = document.getElementById(`review-back-btn${suffix}`);

    let currentActiveFormId = null;
    let currentRecaptchaToken = null;
    const labels = lang === 'en' ? fieldLabelMappingEn : fieldLabelMappingJa;
    const msg = i18n[lang];

    function showPane(pane) {
      [candidatePane, corporatePane, reviewPane].forEach(p => p.classList.add('hidden'));
      pane.classList.remove('hidden');
    }

    formTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const formId = btn.getAttribute('data-form');
        if (!formId) return;
        document.querySelectorAll(`${scope} .form-tab-btn.active`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showPane(formId.includes('candidate') ? candidatePane : corporatePane);
      });
    });

    function executeFormReviewRouting(formId) {
      const form = document.getElementById(formId);
      const formPrefix = formId.replace(`-form${suffix}`, '');
      const errorEl = document.getElementById(`${formPrefix}-error-msg${suffix}`);
      errorEl.classList.add('hidden');

      if (!form.checkValidity()) {
        errorEl.textContent = msg.required;
        errorEl.classList.remove('hidden');
        return;
      }

      // Verify reCAPTCHA
      const recaptchaDiv = form.querySelector('[data-recaptcha-container]');
      const widgetIdAttr = recaptchaDiv?.getAttribute('data-widget-id');
      const widgetId = widgetIdAttr ? parseInt(widgetIdAttr, 10) : NaN;
      currentRecaptchaToken = (!isNaN(widgetId) && typeof grecaptcha !== 'undefined')
        ? grecaptcha.getResponse(widgetId)
        : '';
      if (!currentRecaptchaToken) {
        errorEl.textContent = msg.captcha;
        errorEl.classList.remove('hidden');
        return;
      }

      currentActiveFormId = formId;
      const data = Object.fromEntries(new FormData(form));
      form.querySelectorAll('input[type="radio"]:checked').forEach(r => { data[r.name] = r.value; });

      const reviewHTML = Object.entries(data)
        .filter(([k]) => k !== 'g-recaptcha-response')
        .map(([k, v]) => `<div class="review-row"><span class="review-label">${labels[k] || k}</span><span class="review-value">${v}</span></div>`)
        .join('');
      reviewConfirmBtn.closest('.form-action-row').classList.remove('hidden');
      reviewContentDump.innerHTML = reviewHTML;
      showPane(reviewPane);
    }

    const candidateFormId = `candidate-form${suffix}`;
    const corporateFormId = `corporate-form${suffix}`;

    document.getElementById(candidateFormId).addEventListener('submit', e => {
      e.preventDefault();
      executeFormReviewRouting(candidateFormId);
    });

    document.getElementById(corporateFormId).addEventListener('submit', e => {
      e.preventDefault();
      executeFormReviewRouting(corporateFormId);
    });

    reviewBackBtn.addEventListener('click', () => {
      showPane(currentActiveFormId.includes('candidate') ? candidatePane : corporatePane);
    });

    reviewConfirmBtn.addEventListener('click', async () => {
      const form = document.getElementById(currentActiveFormId);
      const data = Object.fromEntries(new FormData(form));
      form.querySelectorAll('input[type="radio"]:checked').forEach(r => { data[r.name] = r.value; });
      data.form_type = currentActiveFormId;

      const isCandidate = currentActiveFormId.includes('candidate');
      const payload = isCandidate
        ? { fullName: data.candidate_name, email: data.candidate_email, contact: data.candidate_contact, jlptLevel: data.jlpt_level, awsExperience: data.aws_exp, githubUrl: data.github_url, howHeard: data.how_heard || '', countryTimezone: data.country_timezone || '' }
        : { companyName: data.company_name, email: data.company_email, contact: data.company_contact, sector: data.company_sector, projectRequirements: data.project_requirements };
      payload.recaptchaToken = currentRecaptchaToken;

      reviewConfirmBtn.disabled = true;
      reviewConfirmBtn.textContent = msg.sending;
      try {
        const res = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(res.status);
        reviewContentDump.innerHTML = `<p style="color:#16a34a;font-weight:600">${msg.success}</p>`;
        reviewConfirmBtn.closest('.form-action-row').classList.add('hidden');
        form.reset();
        // Reset reCAPTCHA widget
        const recaptchaDiv = form.querySelector('[data-recaptcha-container]');
        const resetWidgetIdAttr = recaptchaDiv?.getAttribute('data-widget-id');
        if (resetWidgetIdAttr && typeof grecaptcha !== 'undefined') {
          grecaptcha.reset(parseInt(resetWidgetIdAttr, 10));
        }
      } catch (err) {
        console.error('Lambda submit error:', err);
        reviewContentDump.insertAdjacentHTML('beforeend', `<p style="color:#ef4444">${msg.error}</p>`);
        reviewConfirmBtn.disabled = false;
        reviewConfirmBtn.textContent = msg.confirm;
      }
    });
  }

  setupFormSet('ja');
  setupFormSet('en');

  // --- LANGUAGE SWITCHER ---
  const langButtons = document.querySelectorAll('.lang-btn');
  const postEn = document.getElementById('post-en');
  const postJa = document.getElementById('post-ja');
  const heroDescEn = document.getElementById('hero-desc-en');
  const heroDescJa = document.getElementById('hero-desc-ja');
  const heroTitleEn = document.getElementById('hero-title-en');
  const heroTitleJa = document.getElementById('hero-title-ja');

  langButtons.forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.lang-btn.active').classList.remove('active');
      button.classList.add('active');
      const lang = button.getAttribute('data-lang');
      const isEn = lang === 'en';
      document.documentElement.setAttribute('lang', lang);
      postEn.classList.toggle('hidden', !isEn);
      postJa.classList.toggle('hidden', isEn);
      heroDescEn.classList.toggle('hidden', !isEn);
      heroDescJa.classList.toggle('hidden', isEn);
      heroTitleEn.classList.toggle('hidden', !isEn);
      heroTitleJa.classList.toggle('hidden', isEn);
    });
  });

  // --- DOCUMENTATION HUB (called once per language) ---
  function setupDocHub(lang) {
    const suffix = lang === 'en' ? '-en' : '';
    const tabsContainer = document.getElementById(`tabs${suffix}`);
    const contentArea = document.getElementById(`content${suffix}`);
    const msg = i18n[lang];

    if (!tabsContainer || !contentArea) return;

    async function renderDocument(filePath) {
      contentArea.innerHTML = `<p style="color:#94a3b8">${msg.loading}</p>`;
      try {
        const res = await fetch(filePath);
        if (!res.ok) throw new Error(res.status);
        const raw = await res.text();
        const md = raw.replace(/^---[\s\S]*?---\n?/, '');
        contentArea.innerHTML = marked.parse(md);
        contentArea.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        addCopyButtons(contentArea);
      } catch (err) {
        console.error('Doc load error:', err);
        contentArea.innerHTML = `<p style="color:#ef4444">Failed to load <code>${filePath}</code></p>`;
      }
    }

    function setActiveTab(activeBtn) {
      tabsContainer.querySelectorAll('.doc-tab-btn').forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }

    fetch('docs/manifest.json')
      .then(res => res.json())
      .then(docs => {
        const filtered = docs.filter(doc => doc.id.endsWith(`-${lang}`));
        filtered.forEach((doc, i) => {
          const btn = document.createElement('button');
          btn.className = 'doc-tab-btn' + (i === 0 ? ' active' : '');
          btn.textContent = doc.title;
          btn.addEventListener('click', () => {
            setActiveTab(btn);
            renderDocument(doc.file);
          });
          tabsContainer.appendChild(btn);
        });
        if (filtered.length) renderDocument(filtered[0].file);
      })
      .catch(err => console.error('Manifest load error:', err));
  }

  setupDocHub('ja');
  setupDocHub('en');

  // --- COPY BUTTONS ---
  function addCopyButtons(scope) {
    scope.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')?.innerText || '';
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }

});
