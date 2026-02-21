export const es = {
  analysisStatus: {
    title: "Estado del análisis",
    subtitle: "Lectura rápida del estado del flujo.",
    sections: {
      input: {
        title: "Entrada / parsing",
        summaryValid: "Entrada lista para analizar.",
        summaryEmpty: "Aún no has cargado un mazo.",
        summaryNeedsAnalyze: "Tienes un mazo pegado, pero falta pulsar Analizar.",
        summaryWithSource: (source: string) =>
          `Entrada lista (${source}).`,
        actionReview: "Acción: revisa los resultados.",
        actionAnalyze: "Acción: pulsa Analizar.",
        actionPaste: "Acción: pega un export y pulsa Analizar.",
      },
      tagging: {
        title: "Índice de cartas",
        summaryActive: "Cartas reconocidas.",
        summaryActiveCount: (count: number) => `Cartas reconocidas (${count}).`,
        summaryNoMatches: "No he podido reconocer cartas (idioma/nombres).",
        summaryNoMatchesCount: (count: number) =>
          `No he podido reconocer cartas (${count}).`,
        summaryUnavailable: "No pude cargar el índice de cartas.",
        summaryPending: "Aún no he podido reconocer cartas (primero analiza un mazo).",
        actionContinue: "Acción: continúa con el análisis.",
        actionCheckNames: "Acción: revisa idioma/nombres del deck (MTGA).",
        actionProbe: "Acción: prueba /data/cards_index.json.gz y manifest.",
        actionAnalyzeFirst: "Acción: analiza un mazo primero.",
      },
      mc: {
        title: "Monte Carlo (MC-SSL)",
        summaryDisabled: "Monte Carlo desactivado.",
        summaryIdleEnabled:
          "Monte Carlo activado, listo para ejecutarse (pulsa Analizar).",
        summaryRunning: "Monte Carlo en ejecución.",
        summaryError: "Monte Carlo falló.",
        summaryOmitted: "No aplica con este mazo (señal insuficiente).",
        summaryReady: "Monte Carlo listo.",
        actionEnable: "Acción: activa Monte Carlo.",
        actionAnalyze: "Acción: pulsa Analizar.",
        actionWait: "Acción: espera.",
        actionRetry: "Acción: baja iteraciones o recarga.",
        actionUseSynergy: "Acción: usa un mazo con sinergias.",
        actionReview: "Acción: revisa las métricas.",
      },
    },
    labels: {
      details: "Detalles",
      hide: "Ocultar",
      focusInput: "Ir a entrada",
      enableMc: "Activar Monte Carlo",
      reanalyze: "Reanalizar",
    },
  },
} as const;
