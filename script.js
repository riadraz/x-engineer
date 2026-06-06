document.addEventListener('DOMContentLoaded', () => {
  // --- LANGUAGE SWITCHER INFRASTRUCTURE ---
  const langButtons = document.querySelectorAll('.lang-btn');
  const postEn = document.getElementById('post-en');
  const postJa = document.getElementById('post-ja');
  const heroDescEn = document.getElementById('hero-desc-en');
  const heroDescJa = document.getElementById('hero-desc-ja');
  const htmlRoot = document.documentElement;

  langButtons.forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.lang-btn.active').classList.remove('active');
      button.classList.add('active');
      const selectedLang = button.getAttribute('data-lang');

      if (selectedLang === 'en') {
        htmlRoot.setAttribute('lang', 'en');
        postEn.classList.remove('hidden');
        postJa.classList.add('hidden');
        heroDescEn.classList.remove('hidden');
        heroDescJa.classList.add('hidden');
      } else if (selectedLang === 'ja') {
        htmlRoot.setAttribute('lang', 'ja');
        postJa.classList.remove('hidden');
        postEn.classList.add('hidden');
        heroDescJa.classList.remove('hidden');
        heroDescEn.classList.add('hidden');
      }
    });
  });

  // --- ASYNCHRONOUS MIDDLE DOCUMENTATION PIPELINE ---
  const docButtons = document.querySelectorAll('.doc-link-btn');
  const docViewer = document.getElementById('doc-viewer-raw');
  const docLoading = document.getElementById('doc-loading');

  // Specialized fetch logic targeting local doc paths
  async function loadDocumentationAsset(docName) {
    // Enable loading transition flag
    docLoading.classList.remove('hidden');
    docViewer.textContent = '';

    try {
      // Pulls clean text string from /docs/[file].md directly
      const response = await fetch(`docs/${docName}.md`);
      
      if (!response.ok) {
        throw new Error(`File asset path failed validation: ${response.status}`);
      }
      
      const fileDataContent = await response.text();
      // Render text output string into the pre block cleanly
      docViewer.textContent = fileDataContent;
    } catch (error) {
      console.error("Documentation Pipeline Error:", error);
      docViewer.textContent = `[System Pipeline Error]: Failed to populate target document blueprint.\nVerify that your 'docs/${docName}.md' file exists inside your project folder.`;
    } finally {
      // Terminate loading notification
      docLoading.classList.add('hidden');
    }
  }

  // Bind interactive click parameters to the button selector node lists
  docButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. Shift visual active selection marker state
      document.querySelector('.doc-link-btn.active').classList.remove('active');
      btn.classList.add('active');

      // 2. Extract requested path key token
      const targetDocId = btn.getAttribute('data-doc');

      // 3. Trigger async resource fetch thread
      loadDocumentationAsset(targetDocId);
    });
  });

  // --- AUTOMATIC RUN ROUTINE ON INITIALIZATION ---
  // Fires default 'aws-security.md' mapping instantly when first loaded on client view
  loadDocumentationAsset('aws-security');
});


  // --- CARD 4: INTERACTIVE ROUTER FORMS PROCESSING ENGINE ---
  const formTabs = document.querySelectorAll('.form-tab-btn');
  const candidatePane = document.getElementById('candidate-form-pane');
  const corporatePane = document.getElementById('corporate-form-pane');
  const reviewPane = document.getElementById('form-review-pane');
  
  const candForm = document.getElementById('candidate-form');
  const corpForm = document.getElementById('corporate-form');
  const reviewDump = document.getElementById('review-content-dump');
  
  let currentActiveFormId = 'candidate-form';

  // Toggle Inner Subtabs View
  formTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelector('.form-tab-btn.active').classList.remove('active');
      tab.classList.add('active');
      
      const targetForm = tab.getAttribute('data-form');
      reviewPane.classList.add('hidden');

      if (targetForm === 'candidate-form') {
        candidatePane.classList.remove('hidden');
        corporatePane.classList.add('hidden');
        currentActiveFormId = 'candidate-form';
      } else {
        corporatePane.classList.remove('hidden');
        candidatePane.classList.add('hidden');
        currentActiveFormId = 'corporate-form';
      }
    });
  });

  // Structural Processing Form Helper Mapping to generate Local Review View Object
  function executeFormReviewRouting(formElement, submissionEvent) {
    submissionEvent.preventDefault();
    
    const errorAlertBox = document.getElementById(`${formElement.id}-error-msg`);
    errorAlertBox.classList.add('hidden');
    errorAlertBox.textContent = '';

    // Check baseline field validations
    if (!formElement.checkValidity()) {
      errorAlertBox.textContent = 'すべての必須項目を入力してください。';
      errorAlertBox.classList.remove('hidden');
      return;
    }

    const formData = new FormData(formElement);

    // Run custom structural validation rule for candidate data constraints
    if (formElement.id === 'candidate-form') {
      const jlpt = formData.get('jlpt_level');
      const aws = formData.get('aws_exp');
      
      if (jlpt === 'なし' && aws === 'なし') {
        errorAlertBox.textContent = 'エラー: 日本語能力試験レベルとAWSの知識/経験の両方に「なし」を選択することはできません。';
        errorAlertBox.classList.remove('hidden');
        return;
      }
    }

    // Build the visual HTML view inside the review div wrapper
    let reviewHTML = '';
    const fieldLabelMapping = {
      candidate_name: 'フルネーム', candidate_email: 'メールアドレス', candidate_contact: '連絡先アカウント',
      jlpt_level: 'JLPTレベル', aws_exp: 'AWS知識/経験', github_url: 'GitHub URL',
      company_name: '会社名', company_email: '業務用メール', company_contact: '担当者連絡先',
      company_sector: '対象セクター', project_requirements: 'ご相談内容'
    };

    formData.forEach((value, key) => {
      if(fieldLabelMapping[key]) {
        reviewHTML += `<div class="review-row"><strong>${fieldLabelMapping[key]}:</strong> ${value}</div>`;
      }
    });

    // Hide input panel, dump structural data, and open review state frame
    candidatePane.classList.add('hidden');
    corporatePane.classList.add('hidden');
    reviewDump.innerHTML = reviewHTML;
    reviewPane.classList.remove('hidden');
  }

  // Bind Listeners
  candForm.addEventListener('submit', (e) => executeFormReviewRouting(candForm, e));
  corpForm.addEventListener('submit', (e) => executeFormReviewRouting(corpForm, e));

  // Handle Review Return Navigation path
  document.getElementById('review-back-btn').addEventListener('click', () => {
    reviewPane.classList.add('hidden');
    if (currentActiveFormId === 'candidate-form') {
      candidatePane.classList.remove('hidden');
    } else {
      corporatePane.classList.remove('hidden');
    }
  });

  // Handle Final Submission Confirmation path
  document.getElementById('review-confirm-btn').addEventListener('click', () => {
    alert('送信が完了しました。(デモシミュレーション完了)');
    reviewPane.classList.add('hidden');
    candForm.reset();
    corpForm.reset();
    if (currentActiveFormId === 'candidate-form') {
      candidatePane.classList.remove('hidden');
    } else {
      corporatePane.classList.remove('hidden');
    }
  });


  // --- ASYNCHRONOUS UNIFIED DOCUMENTATION PIPELINE ---
  const docTabs = document.querySelectorAll('.doc-tab-btn');
  const docViewer = document.getElementById('doc-viewer-raw');
  const docLoading = document.getElementById('doc-loading');

  /**
   * Loads and parses document content using local memory state or fallbacks to async server fetch.
   * Routes formatted strings cleanly into HTML outputs via Marked.js.
   */
  async function renderDocument(docName) {
    // 1. Activate loading state indication layout wrapper
    docLoading.classList.remove('hidden');
    docViewer.innerHTML = '';

    // 2. Check if local variable block exists (Option 2 - Serverless Fallback)
    if (typeof localDocs !== 'undefined' && localDocs[docName]) {
      docViewer.innerHTML = marked.parse(localDocs[docName]);
      docLoading.classList.add('hidden');
      return;
    }

    // 3. Fallback: Fetch directly from local static project files asset tree (Option 1)
    try {
      const response = await fetch(`docs/${docName}.md`);
      if (!response.ok) {
        throw new Error(`File asset path failed validation: ${response.status}`);
      }
      const fileDataContent = await response.text();
      
      // Instantly convert text hashes into clean semantic HTML tags
      docViewer.innerHTML = marked.parse(fileDataContent);
    } catch (error) {
      console.error("Documentation Pipeline Error:", error);
      docViewer.innerHTML = `<p style="color: #ef4444; font-weight: 600;">[System Pipeline Error]: Failed to populate target document blueprint.</p>
                             <p style="font-size: 12px; margin-top: 4px; color: #94a3b8;">Verify that your 'docs/${docName}.md' file path exists or local variable arrays are loaded properly.</p>`;
    } finally {
      // 4. Terminate active loading status window tracker
      docLoading.classList.add('hidden');
    }
  }

  // Bind interactive click events to the horizontal tab navigation layout
  docTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update interactive visual tab selection focus parameters
      document.querySelector('.doc-tab-btn.active').classList.remove('active');
      tab.classList.add('active');

      // Fetch attribute marker token and pass downstream to parser loop
      const targetDocId = tab.getAttribute('data-doc');
      renderDocument(targetDocId);
    });
  });

  // Automatically initialize page views with the default baseline documentation asset on startup
  renderDocument('aws-security');


