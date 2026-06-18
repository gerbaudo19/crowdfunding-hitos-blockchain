// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IHitosVerifier
/// @notice Interfaz que debe implementar cualquier contrato verificador de hitos
interface IHitosVerifier {
    /// @notice Verifica si un hito especifico fue cumplido
    /// @param hitoIndex Indice del hito a verificar
    /// @return True si el hito fue cumplido, false en caso contrario
    function verificarHito(uint256 hitoIndex) external view returns (bool);

    /// @notice Retorna la direccion del owner del verificador
    /// @return Direccion del owner
    function owner() external view returns (address);
}
