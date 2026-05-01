export const FAQ_SECTION_COPY = {
  title: "FAQ",
  items: [
    {
      question: "¿Se guarda mi mazo?",
      answer: "No. El análisis se ejecuta en tu navegador y no se envía a un servidor.",
    },
    {
      question: "¿Necesito una cuenta?",
      answer: "No. Puedes usar el analizador sin registro.",
    },
    {
      question: "¿Qué mide el SPS?",
      answer:
        "El SPS resume la fuerza estructural del mazo según las relaciones detectadas entre cartas y roles.",
    },
    {
      question: "¿Por qué puede aparecer una advertencia?",
      answer:
        "Suele indicar que faltan datos del mazo o que una métrica experimental no aplica a esta ejecución.",
    },
  ],
} as const;

export default function FaqSection() {
  return (
    <div className="panel faq-panel">
      <h2>{FAQ_SECTION_COPY.title}</h2>
      {FAQ_SECTION_COPY.items.map((item) => (
        <p key={item.question} className="muted">
          <strong>{item.question}</strong> {item.answer}
        </p>
      ))}
    </div>
  );
}
