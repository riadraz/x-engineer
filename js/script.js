document.addEventListener('DOMContentLoaded', () => {

  // --- FORM TAB SWITCHING ---
  const LAMBDA_URL = 'https://gqns1d7wza.execute-api.us-east-1.amazonaws.com/prod/register';

  const formTabBtns = document.querySelectorAll('.card-hub-header .form-tab-btn[data-form]');
  const candidatePane = document.getElementById('candidate-form-pane');
  const corporatePane = document.getElementById('corporate-form-pane');
  const reviewPane = document.getElementById('form-review-pane');

  let currentActiveFormId = null;

  const fieldLabelMapping = {
    candidate_name: 'フルネーム',
    candidate_email: 'メールアドレス',
    candidate_contact: '電話番号 & メッセンジャー',
    jlpt_level: '日本語能力試験レベル',
    aws_exp: 'AWSの知識 / 経験',
    github_url: 'GitHub URL',
    company_name: '会社名',
    company_email: 'メールアドレス',
    company_contact: '担当者連絡先',
    company_sector: '対象セクター',
    project_requirements: 'ご相談内容',
  };

  function showPane(pane) {
    [candidatePane, corporatePane, reviewPane].forEach(p => p.classList.add('hidden'));
    pane.classList.remove('hidden');
  }

  formTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const formId = btn.getAttribute('data-form');
      if (!formId) return;
      document.querySelector('.form-tab-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      showPane(formId === 'candidate-form' ? candidatePane : corporatePane);
    });
  });

  // --- FORM SUBMIT → REVIEW PANE ---
  function executeFormReviewRouting(formId) {
    const form = document.getElementById(formId);
    const formPrefix = formId.replace('-form', '');
    const errorEl = document.getElementById(`${formPrefix}-error-msg`);
    errorEl.classList.add('hidden');

    if (!form.checkValidity()) {
      errorEl.textContent = '必須項目をすべて入力してください。';
      errorEl.classList.remove('hidden');
      return;
    }

    currentActiveFormId = formId;
    const data = Object.fromEntries(new FormData(form));
    // Collect radio values (FormData only gets checked ones)
    form.querySelectorAll('input[type="radio"]:checked').forEach(r => { data[r.name] = r.value; });

    const reviewHTML = Object.entries(data)
      .map(([k, v]) => `<div class="review-row"><span class="review-label">${fieldLabelMapping[k] || k}</span><span class="review-value">${v}</span></div>`)
      .join('');
    document.getElementById('review-confirm-btn').closest('.form-action-row').classList.remove('hidden');
    document.getElementById('review-content-dump').innerHTML = reviewHTML;
    showPane(reviewPane);
  }

  document.getElementById('candidate-form').addEventListener('submit', e => {
    e.preventDefault();
    executeFormReviewRouting('candidate-form');
  });

  document.getElementById('corporate-form').addEventListener('submit', e => {
    e.preventDefault();
    executeFormReviewRouting('corporate-form');
  });

  // --- REVIEW PANE ACTIONS ---
  document.getElementById('review-back-btn').addEventListener('click', () => {
    showPane(currentActiveFormId === 'candidate-form' ? candidatePane : corporatePane);
  });

  document.getElementById('review-confirm-btn').addEventListener('click', async () => {
    const form = document.getElementById(currentActiveFormId);
    const confirmBtn = document.getElementById('review-confirm-btn');
    const data = Object.fromEntries(new FormData(form));
    form.querySelectorAll('input[type="radio"]:checked').forEach(r => { data[r.name] = r.value; });
    data.form_type = currentActiveFormId;

    // Remap field names to match Lambda's expected payload shape
    const payload = currentActiveFormId === 'candidate-form'
      ? { fullName: data.candidate_name, email: data.candidate_email, contact: data.candidate_contact, jlptLevel: data.jlpt_level, awsExperience: data.aws_exp, githubUrl: data.github_url }
      : { companyName: data.company_name, email: data.company_email, contact: data.company_contact, sector: data.company_sector, projectRequirements: data.project_requirements };

    confirmBtn.disabled = true;
    confirmBtn.textContent = '送信中...';
    try {
      const res = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.status);
    document.getElementById('review-content-dump').innerHTML = '<p style="color:#16a34a;font-weight:600">✅ 送信が完了しました。ありがとうございます。</p>';
      document.getElementById('review-confirm-btn').closest('.form-action-row').classList.add('hidden');
      form.reset();
    } catch (err) {
      console.error('Lambda submit error:', err);
      document.getElementById('review-content-dump').insertAdjacentHTML('beforeend', '<p style="color:#ef4444">送信に失敗しました。再度お試しください。</p>');
      confirmBtn.disabled = false;
      confirmBtn.textContent = '確定して送信';
    }
  });

  // --- LANGUAGE SWITCHER ---
  const langButtons = document.querySelectorAll('.lang-btn');
  const postEn = document.getElementById('post-en');
  const postJa = document.getElementById('post-ja');
  const heroDescEn = document.getElementById('hero-desc-en');
  const heroDescJa = document.getElementById('hero-desc-ja');

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
    });
  });

  // --- DOCUMENTATION HUB ---
  const tabsContainer = document.getElementById('tabs');
  const contentArea = document.getElementById('content');

  async function renderDocument(filePath) {
    contentArea.innerHTML = '<p style="color:#94a3b8">読み込み中...</p>';
    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(res.status);
      const raw = await res.text();
      const md = raw.replace(/^---[\s\S]*?---\n?/, '');
      contentArea.innerHTML = marked.parse(md);
      contentArea.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    } catch (err) {
      console.error('Doc load error:', err);
      contentArea.innerHTML = `<p style="color:#ef4444">Failed to load <code>${filePath}</code></p>`;
    }
  }

  function setActiveTab(activeBtn) {
    tabsContainer.querySelectorAll('.doc-tab-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  // Build tabs from manifest.json
  fetch('docs/manifest.json')
    .then(res => res.json())
    .then(docs => {
      docs.forEach((doc, i) => {
        const btn = document.createElement('button');
        btn.className = 'doc-tab-btn' + (i === 0 ? ' active' : '');
        btn.textContent = doc.title;
        btn.addEventListener('click', () => {
          setActiveTab(btn);
          // Clear dropdown selection when a tab is clicked
          const dropdown = document.getElementById('doc-extra-select');
          if (dropdown) dropdown.value = '';
          renderDocument(doc.file);
        });
        tabsContainer.appendChild(btn);
      });

      // Load first doc by default
      if (docs.length) renderDocument(docs[0].file);
    })
    .catch(err => console.error('Manifest load error:', err));

});
