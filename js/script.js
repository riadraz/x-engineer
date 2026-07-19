document.addEventListener('DOMContentLoaded', () => {

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
      const md = await res.text();
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
