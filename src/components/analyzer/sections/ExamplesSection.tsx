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

export default function ExamplesSection({ onLoadExample }: Props) {
  return (
    <div className="panel">
      <h2>Ejemplos</h2>
      <p className="muted">Carga un ejemplo y analiza en un clic.</p>
      <button onClick={() => onLoadExample(example1)}>Ejemplo Arena</button>{" "}
      <button onClick={() => onLoadExample(example2)}>Ejemplo Simple</button>
    </div>
  );
}
