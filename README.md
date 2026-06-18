# Crowdfunding con Hitos (Milestone-Based Crowdfunding)

DApp de crowdfunding con liberación de fondos por etapas (hitos) sobre **Sepolia testnet**. Los donantes contribuyen ETH, un auditor externo verifica el cumplimiento de cada hito, y el creador retira los fondos a medida que se aprueban.

## Contratos Inteligentes

| Contrato | Solidity | Descripción |
|---|---|---|
| `CrowdfundingHitos.sol` | ^0.8.26 | Campaña de crowdfunding con hitos, donaciones, aprobaciones y reembolsos |
| `HitosVerifier.sol` | ^0.8.26 | Auditor externo: el owner registra si cada hito fue cumplido |

### Funcionalidades principales

- **Donar ETH**: mientras la campaña esté activa y dentro del plazo
- **Aprobar hito**: el creador delega la verificación al contrato `HitosVerifier` (el owner del Verifier debe haber registrado el resultado previamente)
- **Liberar fondos por hito**: el creador retira fondos secuencialmente (hito n requiere hito n-1 liberado)
- **Liberar todo**: cuando todos los hitos están aprobados, el creador libera todo el balance restante
- **Reembolso**: si un hito vence sin aprobarse, los donantes pueden reclamar su donación
- **Transferir ownership**: el auditor puede transferir su rol a otra wallet

## Roles

1. **Creador** — deploya la campaña, recibe los fondos cuando los hitos se aprueban
2. **Auditor** — deploya el Verifier, registra si cada hito fue cumplido (puede transferir su rol)
3. **Donante** — dona ETH, puede reclamar reembolso si un hito vence sin aprobarse

## Requisitos

- [Node.js](https://nodejs.org/) >= 18
- [MetaMask](https://metamask.io/) en el navegador
- Red **Sepolia** agregada en MetaMask con algo de **SepoliaETH** de prueba

  > Si no tenés SepoliaETH, usá un faucet: https://sepolia-faucet.pk910.de/ o https://www.alchemy.com/faucets/ethereum-sepolia

## Instalación

```bash
# Clonar el repo
cd blockchain-crowdfunding-hitos

# Instalar dependencias del frontend
cd crowdfunding-front
npm install
```

## Uso

```bash
cd crowdfunding-front
npm run dev
```

Abrir `http://localhost:5173` en el navegador con MetaMask instalado.

### Flujo paso a paso

1. **Conectar MetaMask** a la red Sepolia
2. **Paso 1 — Deployar Verifier** (como Auditor): botón "Deployar Verifier"
3. **Paso 2 — Configurar campaña**: completar nombre, meta, plazo y hitos
   - Usar **"Cargar ejemplo rápido"** para precargar datos demo (meta 0.01 ETH)
   - O **"Pegar JSON"** para importar desde un archivo
4. **Deployar Crowdfunding**: botón "Deployar Crowdfunding"
5. Una vez deployado, la UI muestra los paneles según el rol detectado:
   - **Auditor**: registrar resultado de cada hito (aprobado/rechazado + evidencia)
   - **Creador**: aprobar hito (si el auditor lo aprobó), liberar fondos
   - **Donante**: donar ETH, reclamar reembolso si corresponde

### Notas

- El creador y el auditor **pueden ser la misma wallet** en desarrollo (el contrato lo permite)
- Todas las transacciones requieren confirmación en MetaMask y pagan gas en SepoliaETH
- El plazo de recaudación y los plazos de los hitos se configuran en **segundos** desde el deploy
  - Ej: 604800s = 7 días, 259200s = 3 días, 86400s = 1 día
- Los montos se ingresan en **ETH** (no wei)

## Archivos importantes

```
├── CrowdfundingHitos.sol          # Contrato principal
├── HitosVerifier.sol              # Contrato del auditor
├── IHitosVerifier.sol             # Interfaz del verificador
├── crowdfunding-front/
│   ├── src/
│   │   ├── abi/                   # ABIs de los contratos
│   │   ├── components/            # Componentes React
│   │   │   ├── DeployPanel.tsx    # Deploy de contratos
│   │   │   ├── PanelDonante.tsx   # Donar y reembolsos
│   │   │   ├── PanelAuditor.tsx   # Registrar resultados y transferir ownership
│   │   │   ├── PanelCreador.tsx   # Aprobar hitos y liberar fondos
│   │   │   ├── EstadoCampana.tsx  # Estado general de la campaña
│   │   │   └── ListaHitos.tsx     # Lista de hitos con estados
│   │   ├── hooks/
│   │   │   ├── useWallet.ts       # Conexión MetaMask
│   │   │   └── useContratos.ts    # Instancias de contratos
│   │   ├── bytecodes.ts          # Bytecodes compilados de los contratos
│   │   └── utils/errores.ts      # Parseo de errores de Solidity
│   └── package.json
```
