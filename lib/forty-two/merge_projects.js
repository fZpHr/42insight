// Script de fusion des projets pour ajouter le champ is_solo (groupe ou solo)
// Usage: node merge_projects.js

const fs = require('fs');

const mainProjects = require('./data/projects_21.json');
const add42Projects = require('./data/add_42_projects.json');

// Création d'une map id -> is_solo pour lookup rapide
const isSoloMap = new Map();
for (const p of add42Projects.projects) {
  if (typeof p.id === 'number' && typeof p.is_solo === 'boolean') {
    isSoloMap.set(p.id, p.is_solo);
  }
}

// Fusionne le champ is_solo dans chaque projet principal
const merged = mainProjects.projects.map(p => {
  const is_solo = isSoloMap.has(p.id) ? isSoloMap.get(p.id) : null;
  return { ...p, is_solo };
});

const output = {
  ...mainProjects,
  projects: merged
};

fs.writeFileSync(__dirname + '/data/projects_21_merged.json', JSON.stringify(output, null, 2));
console.log('Fusion terminée: ./data/projects_21_merged.json');
