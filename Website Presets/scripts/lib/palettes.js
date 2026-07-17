const palettes = [
  { name: 'midnight', bg: '#0d0d0f', surface: '#16161a', text: '#e8e8ed', accent: '#6c8cff', muted: '#8888a0' },
  { name: 'snow', bg: '#f4f4f5', surface: '#ffffff', text: '#18181b', accent: '#3b5ccc', muted: '#71717a' },
  { name: 'neon', bg: '#0a0a0c', surface: '#111118', text: '#ffffff', accent: '#ff6cb0', muted: '#a0a0b8' },
  { name: 'forest', bg: '#0b1210', surface: '#121a16', text: '#e0f0e8', accent: '#6cffb8', muted: '#7a9a88' },
  { name: 'brutal', bg: '#ffff00', surface: '#ffffff', text: '#000000', accent: '#ff0000', muted: '#333333' },
  { name: 'sunset', bg: '#1a0a12', surface: '#241018', text: '#ffe8f0', accent: '#ff8c42', muted: '#b08090' },
  { name: 'ocean', bg: '#060d14', surface: '#0c1824', text: '#d8eeff', accent: '#38bdf8', muted: '#6898b8' },
  { name: 'lavender', bg: '#100c18', surface: '#1a1424', text: '#ede8ff', accent: '#a78bfa', muted: '#9080b0' },
];

function getPalette(index) {
  return palettes[index % palettes.length];
}

module.exports = { palettes, getPalette };
