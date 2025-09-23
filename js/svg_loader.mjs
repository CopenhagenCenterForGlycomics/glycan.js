import { readFile } from 'node:fs/promises';
import { spec } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

// Note: This loader's 'resolve' hook is a simple pass-through.
// It lets the next loader in the chain (text-to-objects-loader)
// handle the resolution and assign the custom format.
async function resolve(specifier, context, nextResolve) {

  if (specifier.endsWith('.svg')) {
    // Let the default resolver turn the specifier into a full URL.
    const resolved = await nextResolve(specifier, context);
    return {
      url: resolved.url,
      format: 'svg', // A custom format name for our 'load' hook to identify.
      shortCircuit: true, // We've handled this, no other resolvers should run.
    };
  }

  // For any other module, fall back to the default resolver.
  return nextResolve(specifier, context);
}

async function load(url, context, nextLoad) {
  if (context.format === 'svg') {
    const filePath = fileURLToPath(url);
    const rawContent = await readFile(filePath, 'utf-8');

    // Generate the JavaScript source code string.
    // This code will be executed by Node.js as the module.
    const source = `

      const content = ${JSON.stringify(rawContent)};

      // Use 'export default' to make the array available for import.
      export default content;
    `;

    return {
      source,
      format: 'module', // The final format is a standard ES module.
      shortCircuit: true, // We've handled this, no other loaders should run.
    };
  }

  // For any other file type, do nothing and pass control on.
  return nextLoad(url, context);
}

export { resolve, load };