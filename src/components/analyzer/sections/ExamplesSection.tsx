type Props = {
  onLoadExample: (text: string) => void;
};

const example1 = `Deck
4 Monastery Swiftspear (BRO) 144
4 Mishras Foundry (BRO) 265
20 Mountain
Sideboard
2 Abrade (BRO) 123`;

const example2 = `Deck
4 Llanowar Elves
4 Elvish Mystic
4 Collected Company (DTK) 177
24 Forest`;

const example3 = `Deck
4 Lightning Strike
4 Monastery Swiftspear
4 Play with Fire
4 Reinforced Ronin
20 Mountain`;

export default function ExamplesSection({ onLoadExample }: Props) {
  return (
    <div className="panel examples-panel">
      <h2>Prueba con un mazo de ejemplo</h2>
      <p className="muted">Carga una lista de referencia y analiza en un clic.</p>
      <button onClick={() => onLoadExample(example1)}>Mono Red agresivo</button>{" "}
      <button onClick={() => onLoadExample(example2)}>Mazo con sinergias</button>{" "}
      <button onClick={() => onLoadExample(example3)}>Mazo de prueba</button>
    </div>
  );
}
