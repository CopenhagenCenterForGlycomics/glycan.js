// const C = 12;
// const H = 1.0078250;
// const O = 15.9949146;

const MASSES = new Map();

let SYMBOLS = new Map();

const importSymbols = (symbols_map) => {
  SYMBOLS = new Map(Object.entries(symbols_map));
  MASSES.set(SYMBOLS.get('C'),12);
  MASSES.set(SYMBOLS.get('H'),1.007825035);
  MASSES.set(SYMBOLS.get('O'),15.99491463);
  MASSES.set(SYMBOLS.get('N'),14.003074);
  MASSES.set(SYMBOLS.get('NA'),22.989771);
};

const composition_to_mass = (composition) => {
  return [...composition.entries()].map( ([atom,count]) => MASSES.get(atom)*count ).reduce( (a,b) => a + b, 0);
};

export { composition_to_mass, importSymbols };