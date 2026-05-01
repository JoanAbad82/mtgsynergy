export const es = {
  analysisStatus: {
    title: "Estado del análisis",
    subtitle: "Resumen rápido del estado del mazo y sus métricas.",
    sections: {
      input: {
        title: "Entrada del mazo",
        summaryValid: "Mazo leído correctamente.",
        summaryEmpty: "Aún no has cargado un mazo.",
        summaryNeedsAnalyze: "Tienes un mazo pegado, pero falta pulsar Analizar.",
        summaryWithSource: (source: string) =>
          `Mazo cargado (${source}).`,
        actionReview: "Revisa los resultados.",
        actionAnalyze: "Pulsa Analizar para actualizar resultados.",
        actionPaste: "Pega un export de MTG Arena para empezar.",
      },
      tagging: {
        title: "Índice de cartas",
        summaryActive: "Índice cargado correctamente.",
        summaryActiveCount: (count: number) => `Índice cargado: ${count} cartas.`,
        summaryNoMatches: "No he podido reconocer cartas (idioma/nombres).",
        summaryNoMatchesCount: (count: number) =>
          `No he podido reconocer cartas (${count}).`,
        summaryUnavailable: "No pude cargar el índice de cartas.",
        summaryPending: "Aún no he podido reconocer cartas (primero analiza un mazo).",
        actionContinue: "Puedes continuar con el análisis.",
        actionCheckNames: "Revisa idioma y nombres del export.",
        actionProbe: "Verifica el acceso al índice de cartas.",
        actionAnalyzeFirst: "Analiza un mazo para comprobar el índice.",
      },
      mc: {
        title: "Simulación de estabilidad",
        summaryDisabled: "Desactivada en esta ejecución.",
        summaryIdleEnabled: "Pendiente de ejecutar.",
        summaryRunning: "Simulación en ejecución.",
        summaryError: "No se pudo completar la simulación.",
        summaryOmitted: "No aplica con este mazo en esta ejecución.",
        summaryReady: "Simulación completada.",
        actionEnable: "Activa la simulación experimental si quieres probarla.",
        actionAnalyze: "Pulsa Analizar para ejecutarla.",
        actionWait: "Espera a que termine la simulación.",
        actionRetry: "Vuelve a analizar o reduce iteraciones.",
        actionUseSynergy: "Prueba con un mazo con más relaciones.",
        actionReview: "Revisa las métricas simuladas.",
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
