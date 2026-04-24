export const FAQ_SECTION_COPY = {
  title: "FAQ",
  privacyLine: "¿Se guarda mi mazo? No, todo ocurre en tu navegador.",
  simulationLine:
    "¿Qué mide la simulación de estabilidad? Estima si el plan del mazo aguanta pequeñas variaciones.",
} as const;

export default function FaqSection() {
  return (
    <div className="panel">
      <h2>{FAQ_SECTION_COPY.title}</h2>
      <p className="muted">{FAQ_SECTION_COPY.privacyLine}</p>
      <p className="muted">{FAQ_SECTION_COPY.simulationLine}</p>
    </div>
  );
}
