export const es = {
  analysisStatus: {
    title: "Estado del análisis",
    subtitle: "Resumen rápido para saber qué falta.",
    sections: {
      input: {
        title: "Entrada del mazo",
        summaryValid: "Entrada lista para analizar.",
        summaryEmpty: "Aún no has cargado un mazo.",
        summaryNeedsAnalyze: "Tienes un mazo pegado, pero falta pulsar Analizar.",
        summaryWithSource: (source: string) =>
          `Entrada lista (${source}).`,
        actionReview: "Siguiente paso: revisa los resultados.",
        actionAnalyze: "Siguiente paso: pulsa Analizar.",
        actionPaste: "Siguiente paso: pega un export y pulsa Analizar.",
      },
      tagging: {
        title: "Índice de cartas",
        summaryActive: "Índice cargado.",
        summaryActiveCount: (count: number) => `Índice cargado (${count} cartas).`,
        summaryNoMatches: "No he podido reconocer cartas (idioma/nombres).",
        summaryNoMatchesCount: (count: number) =>
          `No he podido reconocer cartas (${count}).`,
        summaryUnavailable: "No pude cargar el índice de cartas.",
        summaryPending: "Aún no he podido reconocer cartas (primero analiza un mazo).",
        actionContinue: "Siguiente paso: continúa con el análisis.",
        actionCheckNames: "Siguiente paso: revisa idioma/nombres del deck (MTGA).",
        actionProbe: "Siguiente paso: prueba /data/cards_index.json.gz y manifest.",
        actionAnalyzeFirst: "Siguiente paso: analiza un mazo primero.",
      },
      mc: {
        title: "Simulación de estabilidad",
        summaryDisabled: "Simulación desactivada.",
        summaryIdleEnabled:
          "Simulación activada, lista para ejecutarse (pulsa Analizar).",
        summaryRunning: "Simulación en ejecución.",
        summaryError: "La simulación falló.",
        summaryOmitted: "No aplica con este mazo (señal insuficiente).",
        summaryReady: "Simulación lista.",
        actionEnable: "Siguiente paso: activa la simulación.",
        actionAnalyze: "Siguiente paso: pulsa Analizar.",
        actionWait: "Siguiente paso: espera.",
        actionRetry: "Siguiente paso: baja iteraciones o recarga.",
        actionUseSynergy: "Siguiente paso: usa un mazo con sinergias.",
        actionReview: "Siguiente paso: revisa las métricas.",
      },
    },
    labels: {
      details: "Detalles",
      hide: "Ocultar",
      focusInput: "Ir a entrada",
      enableMc: "Activar simulación",
      reanalyze: "Reanalizar",
    },
  },
  mc: {
    summary: {
      line1: "Simula pequeñas variaciones del mazo para estimar estabilidad.",
      line2: "Compara el resultado simulado con la referencia base.",
      line3:
        "Si el resultado cae o la variación es alta: añade redundancia y cartas puente.",
    },
    toggles: {
      details: "Detalles técnicos",
      hide: "Ocultar detalles",
    },
    labels: {
      guided: "Lectura guiada",
      status: "Estado de la simulación",
      samples: "Muestras analizadas",
      robustness: "Estabilidad simulada",
      fragility: "Variación estimada",
    },
  },
} as const;
