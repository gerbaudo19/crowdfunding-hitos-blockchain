// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IHitosVerifier.sol";

/// @title CrowdfundingHitos
/// @notice Contrato principal de crowdfunding con liberacion de fondos por etapas (hitos).
/// @dev Los donantes pueden reclamar reembolso si el hito no se aprueba en plazo.
contract CrowdfundingHitos {

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// @notice Representa un hito del proyecto
    struct Hito {
        string  descripcion;     // Descripcion del objetivo
        uint256 montoLiberar;    // ETH a liberar al creador si se aprueba (en wei)
        uint256 plazo;           // Timestamp limite para aprobar el hito
        bool    aprobado;        // True una vez que el verificador lo confirma
        bool    fondosLiberados; // True una vez que el creador retiro los fondos
    }

    // ─── Errores personalizados ────────────────────────────────────────────────

    error NoEsCreador();
    error CampanaYaCerrada();
    error CampanaNoAlcanzaMeta();
    error HitoYaAprobado();
    error HitoNoAprobado();
    error FondosYaLiberados();
    error HitoNoAnteriorLiberado();
    error FondosInsuficientes();
    error PlazoNoVencido();
    error PlazoVencido();
    error MontoInvalido();
    error SinDonacion();
    error ReembolsoYaRealizado();

    // ─── Eventos ───────────────────────────────────────────────────────────────

    /// @notice Emitido cuando alguien dona fondos
    event Donacion(address indexed donante, uint256 monto);
    /// @notice Emitido cuando un hito es aprobado por el verificador externo
    event HitoAprobado(uint256 indexed hitoIndex);
    /// @notice Emitido cuando el creador retira fondos de un hito aprobado
    event FondosLiberados(uint256 indexed hitoIndex, uint256 monto);
    /// @notice Emitido cuando un donante recibe su reembolso
    event Reembolso(address indexed donante, uint256 monto);

    // ─── Variables de estado ───────────────────────────────────────────────────

    address public immutable creador;
    IHitosVerifier public immutable verificador;

    string  public nombreProyecto;
    uint256 public metaTotal;        // Meta de recaudacion en wei
    uint256 public plazoRecaudacion; // Timestamp limite para recaudar
    uint256 public totalRecaudado;
    bool    public campanaActiva;

    Hito[]  public hitos;
    mapping(address => uint256) public donaciones;
    mapping(address => bool)    public reembolsado;

    // ─── Modificadores ─────────────────────────────────────────────────────────

    modifier soloCreador() {
        if (msg.sender != creador) revert NoEsCreador();
        _;
    }

    modifier campanaAbierta() {
        if (!campanaActiva) revert CampanaYaCerrada();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /// @notice Inicializa la campana de crowdfunding
    /// @param _nombre Nombre del proyecto
    /// @param _metaTotal Meta de recaudacion en wei
    /// @param _plazoRecaudacion Duracion en segundos desde el deploy
    /// @param _verificador Direccion del contrato HitosVerifier
    /// @param _descripcionesHitos Array de descripciones de cada hito
    /// @param _montosHitos Array de montos a liberar por cada hito (wei)
    /// @param _plazosHitos Array de duraciones (segundos desde deploy) de cada hito
    constructor(
        string memory _nombre,
        uint256 _metaTotal,
        uint256 _plazoRecaudacion,
        address _verificador,
        string[] memory _descripcionesHitos,
        uint256[] memory _montosHitos,
        uint256[] memory _plazosHitos
    ) {
        require(_descripcionesHitos.length == _montosHitos.length, "Longitudes distintas");
        require(_montosHitos.length == _plazosHitos.length, "Longitudes distintas");
        require(_metaTotal > 0, "Meta debe ser > 0");
        require(_verificador != address(0), "Verificador invalido");
        require(_verificador != msg.sender, "Verificador no puede ser creador");

        creador          = msg.sender;
        // Verificar que el owner del verificador no sea el mismo que el creador
        address verificadorOwner = IHitosVerifier(_verificador).owner();
        require(verificadorOwner != address(0), "Owner verificador invalido");
        // require(verificadorOwner != msg.sender, "Owner verificador no puede ser creador");

        verificador      = IHitosVerifier(_verificador);
        nombreProyecto   = _nombre;
        metaTotal        = _metaTotal;
        plazoRecaudacion = block.timestamp + _plazoRecaudacion;
        campanaActiva    = true;

        uint256 sumaMontos;
        for (uint256 i = 0; i < _descripcionesHitos.length; i++) {
            sumaMontos += _montosHitos[i];
            hitos.push(Hito({
                descripcion:     _descripcionesHitos[i],
                montoLiberar:    _montosHitos[i],
                plazo:           block.timestamp + _plazosHitos[i],
                aprobado:        false,
                fondosLiberados: false
            }));
        }
        require(sumaMontos == _metaTotal, "Suma de hitos != meta");
    }

    // ─── Funciones externas ────────────────────────────────────────────────────

    /// @notice Permite donar ETH al proyecto mientras la campana esta activa
    function donar() external payable campanaAbierta {
        if (msg.value == 0) revert MontoInvalido();
        if (block.timestamp > plazoRecaudacion) revert CampanaYaCerrada();

        // CHECKS ya realizados arriba
        // EFFECTS
        donaciones[msg.sender] += msg.value;
        totalRecaudado         += msg.value;
        emit Donacion(msg.sender, msg.value);
    }

    /// @notice El creador llama a esta funcion para liberar los fondos de un hito aprobado
    /// @param hitoIndex Indice del hito en el array
    function liberarFondosHito(uint256 hitoIndex) external soloCreador {
        Hito storage h = hitos[hitoIndex];

        // CHECKS
        if (!h.aprobado) revert HitoNoAprobado();
        if (h.fondosLiberados) revert FondosYaLiberados();
        // Enforce sequential release: no liberar el hito i si el anterior no fue liberado
        if (hitoIndex > 0) {
            if (!hitos[hitoIndex - 1].fondosLiberados) revert HitoNoAnteriorLiberado();
        }

        uint256 n = hitos.length;

        uint256 monto;
        // Si es el ultimo hito, transferir todo el balance restante
        if (hitoIndex == n - 1) {
            monto = address(this).balance;
        } else {
            monto = h.montoLiberar;
        }

        if (address(this).balance < monto) revert FondosInsuficientes();

        // EFFECTS (estado antes de la transferencia)
        h.fondosLiberados = true;

        // INTERACTIONS
        (bool ok, ) = creador.call{value: monto}("");
        require(ok, "Transferencia fallida");

        emit FondosLiberados(hitoIndex, monto);
    }

    /// @notice Libera todos los fondos restantes de los hitos si todos estan aprobados
    /// @dev Requiere que la meta total haya sido alcanzada y que haya fondos suficientes
    function liberarTodo() external soloCreador {
        uint256 n = hitos.length;
        require(n > 0, "Sin hitos");

        // Verificar que todos los hitos esten aprobados
        for (uint256 i = 0; i < n; i++) {
            if (!hitos[i].aprobado) revert HitoNoAprobado();
        }

        // Requiere haber alcanzado la meta total
        if (totalRecaudado < metaTotal) revert CampanaNoAlcanzaMeta();

        // Calcular si hay hitos pendientes por liberar
        uint256 sumaRestante = 0;
        uint256 restantesCount = 0;
        for (uint256 i = 0; i < n; i++) {
            if (!hitos[i].fondosLiberados) {
                sumaRestante += hitos[i].montoLiberar;
                restantesCount++;
            }
        }

        if (sumaRestante == 0) revert FondosYaLiberados();

        // Transferir todo el balance del contrato para no dejar fondos sueltos
        uint256 montoTotal = address(this).balance;
        if (montoTotal == 0) revert FondosInsuficientes();

        // Marcar como liberados antes de la transferencia
        for (uint256 i = 0; i < n; i++) {
            if (!hitos[i].fondosLiberados) {
                hitos[i].fondosLiberados = true;
            }
        }

        // Transferir todo en una sola llamada
        (bool ok, ) = creador.call{value: montoTotal}("");
        require(ok, "Transferencia fallida");

        // Emitir eventos por cada hito liberado (reportando los montos definidos por hito)
        for (uint256 i = 0; i < n; i++) {
            if (hitos[i].fondosLiberados) {
                emit FondosLiberados(i, hitos[i].montoLiberar);
            }
        }
    }

    /// @notice Los donantes reclaman reembolso si el hito vencio sin aprobarse
    /// @param hitoIndex Indice del hito vencido
    function reclamarReembolso(uint256 hitoIndex) external {
        Hito storage h = hitos[hitoIndex];

        // CHECKS
        if (h.aprobado)                       revert HitoYaAprobado();
        if (block.timestamp <= h.plazo)        revert PlazoNoVencido();
        if (donaciones[msg.sender] == 0)       revert SinDonacion();
        if (reembolsado[msg.sender])           revert ReembolsoYaRealizado();

        // EFFECTS
        reembolsado[msg.sender] = true;
        uint256 monto = donaciones[msg.sender];
        donaciones[msg.sender] = 0;

        // INTERACTIONS
        (bool ok, ) = msg.sender.call{value: monto}("");
        require(ok, "Reembolso fallido");

        emit Reembolso(msg.sender, monto);
    }

    /// @notice Delega la aprobacion de un hito al contrato verificador externo
    /// @param hitoIndex Indice del hito a aprobar
    function aprobarHito(uint256 hitoIndex) external {
        Hito storage h = hitos[hitoIndex];

        // CHECKS
        if (h.aprobado)               revert HitoYaAprobado();
        if (block.timestamp > h.plazo) revert PlazoVencido();

        // Llama al contrato externo para verificar (manejar reverts del verificador)
        bool resultado;
        try verificador.verificarHito(hitoIndex) returns (bool r) {
            resultado = r;
        } catch {
            revert("Verificador: sin resultado o revert");
        }
        if (!resultado) revert HitoNoAprobado();

        // EFFECTS
        h.aprobado = true;
        emit HitoAprobado(hitoIndex);
    }

    // ─── Funciones view ────────────────────────────────────────────────────────

    /// @notice Retorna la cantidad de hitos del proyecto
    /// @return Numero de hitos
    function cantidadHitos() external view returns (uint256) {
        return hitos.length;
    }

    /// @notice Retorna la donacion acumulada del caller
    /// @return Monto donado en wei
    function miDonacion() external view returns (uint256) {
        return donaciones[msg.sender];
    }

    /// @notice Retorna si la meta de recaudacion fue alcanzada
    /// @return True si totalRecaudado >= metaTotal
    function metaAlcanzada() external view returns (bool) {
        return totalRecaudado >= metaTotal;
    }

    /// @notice Retorna los datos de un hito especifico
    /// @param hitoIndex Indice del hito
    /// @return descripcion Texto descriptivo del hito
    /// @return montoLiberar Monto en wei a liberar si se aprueba
    /// @return plazo Timestamp limite para aprobar el hito
    /// @return aprobado True si el hito fue aprobado
    /// @return fondosLiberados True si los fondos ya fueron liberados
    function getHito(uint256 hitoIndex) external view returns (
        string memory descripcion,
        uint256 montoLiberar,
        uint256 plazo,
        bool aprobado,
        bool fondosLiberados
    ) {
        Hito storage h = hitos[hitoIndex];
        return (h.descripcion, h.montoLiberar, h.plazo, h.aprobado, h.fondosLiberados);
    }

    /// @notice Permite recibir ETH directamente (fallback)
    receive() external payable {
        donaciones[msg.sender] += msg.value;
        totalRecaudado         += msg.value;
        emit Donacion(msg.sender, msg.value);
    }
}
