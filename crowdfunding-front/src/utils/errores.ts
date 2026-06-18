const ERRORES: Record<string, string> = {
  NoEsCreador: "Solo el creador puede hacer esto",
  CampanaYaCerrada: "La campaña ya está cerrada",
  CampanaNoAlcanzaMeta: "No se alcanzó la meta de recaudación",
  HitoYaAprobado: "Este hito ya fue aprobado",
  HitoNoAprobado: "El hito no está aprobado aún",
  FondosYaLiberados: "Los fondos de este hito ya fueron liberados",
  HitoNoAnteriorLiberado: "Tenés que liberar el hito anterior primero",
  FondosInsuficientes: "No hay fondos suficientes en el contrato",
  PlazoNoVencido: "El plazo del hito todavía no venció",
  PlazoVencido: "El plazo del hito ya venció",
  MontoInvalido: "El monto debe ser mayor a cero",
  SinDonacion: "No tenés donaciones registradas",
  ReembolsoYaRealizado: "Ya recibiste tu reembolso",
  NoEsOwner: "Solo el auditor (owner) puede hacer esto",
  HitoYaRegistrado: "Este hito ya tiene un resultado registrado",
  HitoNoRegistrado: "El hito no tiene resultado registrado todavía",
}

export function parsearError(error: unknown): string {
  if (!error) return "Error desconocido"

  const err = error as any

  if (err?.reason) return err.reason

  if (err?.data?.message) {
    for (const [nombre, msg] of Object.entries(ERRORES)) {
      if (err.data.message.includes(nombre)) return msg
    }
  }

  if (err?.message) {
    const msgStr: string = err.message
    for (const [nombre, msg] of Object.entries(ERRORES)) {
      if (msgStr.includes(nombre)) return msg
    }
    const revertedMatch = msgStr.match(/reason="([^"]+)"/)
    if (revertedMatch) return revertedMatch[1]
    if (msgStr.includes("user rejected") || msgStr.includes("User denied")) {
      return "Transacción rechazada por el usuario"
    }
    if (msgStr.includes("insufficient funds")) {
      return "Saldo insuficiente para la transacción"
    }
  }

  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
    return "Transacción rechazada por el usuario"
  }

  return err?.reason || err?.message || "Error desconocido"
}
