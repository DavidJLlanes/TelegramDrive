import { analyze } from './analysis.js';

export function createService({ repo, tree, settings }) {
  return { report: () => ({ generatedAt: Date.now(), ...analyze(repo.audio(), (id) => tree.pathOf(id), settings) }) };
}
