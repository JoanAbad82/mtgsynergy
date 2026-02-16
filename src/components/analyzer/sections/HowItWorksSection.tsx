export default function HowItWorksSection() {
  return (
    <div className="panel">
      <h2>Cómo funciona</h2>
      <ul className="issues">
        <li>Pega tu export de MTG Arena.</li>
        <li>Analizamos la estructura del mazo (roles y relaciones).</li>
        <li>Generamos un link compartible sin servidor.</li>
      </ul>
    </div>
  );
}
