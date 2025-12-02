const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const ejs = require('ejs');

const repoRoot = path.join(__dirname, '..');
const viewsDir = path.join(repoRoot, 'views');
const publicDir = path.join(repoRoot, 'public');
const outDir = path.join(repoRoot, 'docs');

// Default context for rendering templates
// Templates may reference these variables; provide safe defaults
const defaultContext = {
  pageTitle: 'Experience Pakistan',
  path: '',
  City: '',
  isUserAuthenticated: false,
  isOrganizerAuthenticated: false,
  isAdminAuthenticated: false,
  admin: { firstName: '', lastName: '' },
  organizer: { firstName: '', lastName: '', email: '', phone: '' },
  user: { firstName: '', lastName: '', email: '', phone: '' },
  errorMessage: '',
  successMessage: '',
  csrfToken: '',
  events: [],
  event: {},
  blogs: [],
  blog: {},
  artists: [],
  artist: {},
  restaurants: [],
  restaurant: {},
  experiences: [],
  experience: {},
  categories: [],
  cities: [],
  tickets: [],
  reviews: [],
  faqs: [],
  partners: [],
  admins: [],
  organizers: [],
  users: []
};

function renderSync(templatePath, context) {
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (readErr) {
    throw new Error(`Failed to read template file ${templatePath}: ${readErr.message}`);
  }
  return ejs.render(template, context, { 
    root: viewsDir, 
    filename: templatePath,
    async: false 
  });
}

try {
  // Cleanup and recreate output dir
  fs.removeSync(outDir);
  fs.ensureDirSync(outDir);

  // Copy static assets
  if (fs.existsSync(publicDir)) {
    fs.copySync(publicDir, path.join(outDir, 'public'));
    console.log('Copied public/ -> docs/public');
  }

  // Find all .ejs files (skip partials or files starting with _)
  const ejsFiles = glob.sync('**/*.ejs', {
    cwd: viewsDir,
    nodir: true,
    ignore: ['**/partials/**', '**/_*.ejs', '**/includes/**']
  });

  if (ejsFiles.length === 0) {
    console.warn('No EJS templates found in views/. Update the script if your templates are elsewhere.');
  }

  for (const rel of ejsFiles) {
    const srcPath = path.join(viewsDir, rel);
    let outRel = rel.replace(/\.ejs$/, '.html');
    const outPath = path.join(outDir, outRel);
    fs.ensureDirSync(path.dirname(outPath));

    try {
      // Render with default context. If templates need data, update defaultContext above.
      const html = renderSync(srcPath, defaultContext);
      fs.writeFileSync(outPath, html, 'utf8');
      console.log(`Rendered ${rel} -> ${path.relative(repoRoot, outPath)}`);
    } catch (err) {
      console.error(`Failed rendering ${rel}:`, err.message);
    }
  }

  // Ensure top-level index.html exists
  const candidate = path.join(outDir, 'index.html');
  if (!fs.existsSync(candidate)) {
    // Try shop/home.ejs as the main index page
    const homeTemplate = path.join(viewsDir, 'shop', 'home.ejs');
    if (fs.existsSync(homeTemplate)) {
      try {
        const html = renderSync(homeTemplate, defaultContext);
        fs.writeFileSync(candidate, html, 'utf8');
        console.log(`Created docs/index.html from shop/home.ejs`);
      } catch (err) {
        console.error(`Failed creating index.html from shop/home.ejs:`, err.message);
      }
    } else {
      const fallbackIndex = ejsFiles.find(f => /index\.ejs$/.test(f));
      if (fallbackIndex) {
        const src = path.join(viewsDir, fallbackIndex);
        try {
          const html = renderSync(src, defaultContext);
          fs.writeFileSync(candidate, html, 'utf8');
          console.log(`Created docs/index.html from ${fallbackIndex}`);
        } catch (err) {
          console.error(`Failed creating index.html from ${fallbackIndex}:`, err.message);
        }
      } else {
        console.warn('No index.html created. Add an index.ejs, or modify the script mapping.');
      }
    }
  }

  // Create .nojekyll to prevent GitHub Pages from using Jekyll processing,
  // which would ignore files/folders starting with underscore
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');
  console.log('Wrote docs/.nojekyll');

  console.log('Static build complete.');
} catch (err) {
  console.error('Static build failed:', err);
  process.exit(1);
}
