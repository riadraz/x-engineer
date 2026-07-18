// Tailwind config
function initTailwind() {
  tailwind.config = { content: [] };
}
initTailwind();

async function loadMarkdown(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load');
    return await res.text();
  } catch (err) {
    console.error(err);
    return `# Error\n\nCould not load ${url}`;
  }
}

async function createTabs() {
  const posts = await (await fetch('docs/manifest.json')).json();
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';

  posts.forEach((post, index) => {
    const tab = document.createElement('button');
    tab.className = `tab-button${index === 0 ? ' active' : ''}`;
    tab.textContent = post.title;
    tab.onclick = () => loadPost(post);
    tabsContainer.appendChild(tab);
  });

  loadPost(posts[0]);
}

async function loadPost(post) {
  const markdown = await loadMarkdown(post.file);
  const html = marked.parse(markdown);
  
  document.getElementById('content').innerHTML = html;
  
  hljs.highlightAll();
  addCopyButtons();

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === post.title);
  });
}

function addCopyButtons() {
  document.querySelectorAll('pre').forEach(pre => {
    const existing = pre.querySelector('.copy-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';

    btn.addEventListener('click', () => {
      const code = pre.querySelector('code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 2000);
      });
    });

    pre.appendChild(btn);
  });
}

// Initialize
window.onload = createTabs;
