function wrap(meta, title, style, body, script = '') {
  const tags = (meta.tags || []).join(', ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!--
    @preset
    id: ${meta.id}
    slug: ${meta.slug}
    title: ${meta.title}
    category: ${meta.category}
    tags: ${tags}
  -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.id} — ${title}</title>
  <style>
    @import url('../shared/preset-reset.css');
    ${style}
  </style>
</head>
<body>
${body}
${script ? `<script>${script}</script>` : ''}
</body>
</html>
`;
}

function padId(n) {
  return String(n).padStart(4, '0');
}

module.exports = { wrap, padId };
