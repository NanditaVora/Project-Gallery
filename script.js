let currentPage = 1;
let projectsPerPage = 8; // will be recalculated (columns * rows)
let allProjects = [];
let filteredProjects = [];

// Ensure the DOM elements exist (index.html will be enhanced)
const container = document.getElementById('cardContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Create header, note, and track dropdown above the container if not present
function ensureControls() {
  const top = document.createElement('div');
  top.className = 'top-controls';

  const header = document.createElement('h1');
  header.textContent = 'Project Gallery';
  header.className = 'page-header';
  // add an inline SVG icon and a small badge element to the header for visual flair
  const iconWrap = document.createElement('span');
  iconWrap.className = 'header-icon';
  // simple SVG (you can replace the path with your own SVG later)
  iconWrap.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" fill-opacity="0.9" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" fill-opacity="0.9" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" fill-opacity="0.9" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" fill-opacity="0.9" />
    </svg>
  `;
  header.appendChild(iconWrap);

  const badge = document.createElement('span');
  badge.className = 'header-badge';
  badge.textContent = 'Gallery';
  // header.appendChild(badge);

  const note = document.createElement('div');
  note.className = 'internal-note';
  note.textContent = 'Note: for internal use only.';

  const select = document.createElement('select');
  select.id = 'trackSelect';
  select.className = 'track-select';
  // placeholder; options will be populated after projects are loaded
  const placeholder = document.createElement('option');
  placeholder.value = 'ALL';
  placeholder.textContent = 'All Tracks';
  // select.appendChild(placeholder);

  select.addEventListener('change', () => {
    applyFilter(select.value);
  });

  top.appendChild(header);
  top.appendChild(note);
  top.appendChild(select);

  // Insert top controls before the container
  container.parentNode.insertBefore(top, container);
}

// Populate the track select using distinct track values from allProjects
function populateTrackOptions() {
  const select = document.getElementById('trackSelect');
  if (!select) return;
  // remove existing non-default options
  Array.from(select.children).forEach((c, i) => { if (i > 0) c.remove(); });

  const tracks = Array.from(new Set(allProjects.map(p => (p.track || 'Unknown').trim()))).filter(Boolean);
  tracks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

// Compute layout: enforce exactly 2 rows and 3-4 columns depending on viewport width
function computeLayout() {
  // Force exactly 3 columns per your request
  let cols = 3;

  // Apply grid columns explicitly so we have consistent rows
  container.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  // Two rows
  const rows = 2;
  projectsPerPage = cols * rows;

  // If current page would be out of bounds after changing page size, clamp it
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;
}

function applyFilter(trackValue) {
  currentPage = 1;
  if (!trackValue || trackValue === 'ALL') {
    filteredProjects = allProjects.slice();
  } else {
    // Filter directly by the 'track' property (case-insensitive)
    const wanted = String(trackValue).toLowerCase();
    filteredProjects = allProjects.filter(p => String(p.track || '').toLowerCase() === wanted);
  }
  renderProjects();
  computeLayout();
  updateButtons();
}

// Fetch projects and init
axios.get('projects.json')
  .then(response => {
    allProjects = response.data.map(p => ({ ...p }));
    filteredProjects = allProjects.slice();
      ensureControls();
      populateTrackOptions();
      computeLayout();
      renderProjects();
      updateButtons();
    // recompute layout on resize
    window.addEventListener('resize', () => {
      const prevPerPage = projectsPerPage;
      computeLayout();
      // if per-page changed, re-render and update buttons
      if (projectsPerPage !== prevPerPage) {
        renderProjects();
        updateButtons();
      }
    });
  })
  .catch(error => {
    console.error('Error loading projects.json:', error);
  });

function renderProjects() {
  container.innerHTML = '';
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, endIndex);

  currentProjects.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';

    // add capstone class for special background
    if (p.type && p.type.toLowerCase().includes('capstone')) {
      card.classList.add('capstone');
    }

    // Build technology tags strictly from technologies_used field
    const techs = (p.technologies_used && p.technologies_used.length > 0) ? p.technologies_used.slice() : [];

    // Create inner HTML but keep text safe and truncated by CSS
    const imgSrc = p.genai_generated_image || 'https://placehold.co/140x140?text=Project';
    const title = escapeHtml(p.project_title || 'Untitled Project');
    const brief = escapeHtml(p.brief_description || 'No description provided.');

    // split techs into first row (up to 3) and the rest in second row
    const firstRow = techs.slice(0, 3);
    const secondRow = techs.slice(3);

    const firstRowHtml = firstRow.map(t => `<span class="tag" title="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('');
    const secondRowHtml = secondRow.map(t => `<span class="tag" title="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="label">${escapeHtml(p.header || '')}</div>
      <div class="image-wrap"><img src="${imgSrc}" alt="Project Image"/></div>
      <h3 class="title" title="${title}">${title}</h3>
      <p class="brief" title="${brief}">${brief}</p>
      <div class="tags">
        ${techs.length > 0 ? `
          <div class="tags-row tags-row-1">${firstRowHtml}</div>
          <div class="tags-row tags-row-2">${secondRowHtml}</div>
        ` : '<div class="tags-row tags-row-1"><span class="tag">No Tech Listed</span></div>'}
      </div>
    `;

    container.appendChild(card);
  });
}

function updateButtons() {
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage >= Math.ceil(filteredProjects.length / projectsPerPage) || filteredProjects.length === 0;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderProjects();
    updateButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < Math.ceil(filteredProjects.length / projectsPerPage)) {
    currentPage++;
    renderProjects();
    updateButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Minimal HTML escape to avoid injection when inserting into attributes
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}