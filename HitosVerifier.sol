// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IHitosVerifier.sol";

/// @title HitosVerifier
/// @notice Contrato verificador de hitos. El owner (jurado/auditor) registra
///         manualmente si cada hito fue cumplido. CrowdfundingHitos lo consulta.
/// @dev Implementa IHitosVerifier para ser compatible con el contrato principal.
contract HitosVerifier is IHitosVerifier {

    // ─── Errores personalizados ────────────────────────────────────────────────

    error NoEsOwner();
    error HitoYaRegistrado();
    error HitoNoRegistrado();

    // ─── Eventos ───────────────────────────────────────────────────────────────

    /// @notice Emitido cuando el owner registra el resultado de un hito
    event ResultadoRegistrado(uint256 indexed hitoIndex, bool cumplido, string evidencia);

    // ─── Variables de estado ───────────────────────────────────────────────────

    address public owner;

    struct ResultadoHito {
        bool registrado; // El owner ya emitio un veredicto
        bool cumplido;   // True = hito aprobado, False = rechazado
        string evidencia; // URL o descripcion de la evidencia
    }

    mapping(uint256 => ResultadoHito) public resultados;

    // ─── Modificadores ─────────────────────────────────────────────────────────

    modifier soloOwner() {
        if (msg.sender != owner) revert NoEsOwner();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /// @notice Establece al deployer como owner (jurado inicial)
    constructor() {
        owner = msg.sender;
    }

    // ─── Funciones externas ────────────────────────────────────────────────────

    /// @notice El owner registra si un hito fue cumplido o no
    /// @param hitoIndex Indice del hito evaluado
    /// @param cumplido True si el hito fue completado satisfactoriamente
    /// @param evidencia Descripcion o URL de la evidencia del cumplimiento
    function registrarResultado(
        uint256 hitoIndex,
        bool cumplido,
        string calldata evidencia
    ) external soloOwner {
        if (resultados[hitoIndex].registrado) revert HitoYaRegistrado();

        resultados[hitoIndex] = ResultadoHito({
            registrado: true,
            cumplido:   cumplido,
            evidencia:  evidencia
        });

        emit ResultadoRegistrado(hitoIndex, cumplido, evidencia);
    }

    /// @notice Consulta requerida por la interfaz IHitosVerifier
    /// @dev Es llamado por CrowdfundingHitos.aprobarHito()
    /// @param hitoIndex Indice del hito a verificar
    /// @return True si el hito fue registrado como cumplido
    function verificarHito(uint256 hitoIndex) external view override returns (bool) {
        ResultadoHito storage r = resultados[hitoIndex];
        if (!r.registrado) revert HitoNoRegistrado();
        return r.cumplido;
    }

    /// @notice Transfiere la propiedad del verificador a otra direccion
    /// @param nuevoOwner Nueva direccion del owner
    function transferirOwner(address nuevoOwner) external soloOwner {
        require(nuevoOwner != address(0), "Direccion invalida");
        owner = nuevoOwner;
    }

    // ─── Funciones view ────────────────────────────────────────────────────────

    /// @notice Retorna el resultado completo de un hito
    /// @param hitoIndex Indice del hito
    /// @return registrado True si el resultado fue registrado
    /// @return cumplido True si el hito fue aprobado
    /// @return evidencia Descripcion o URL de la evidencia
    function getResultado(uint256 hitoIndex) external view returns (
        bool registrado,
        bool cumplido,
        string memory evidencia
    ) {
        ResultadoHito storage r = resultados[hitoIndex];
        return (r.registrado, r.cumplido, r.evidencia);
    }
}
