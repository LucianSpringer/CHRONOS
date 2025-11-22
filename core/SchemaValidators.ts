/**
 * core/SchemaValidators.ts
 * ⚡ Runtime enforcement of Chronos Causality Fields.
 * Prevents Hallucinated State Injection.
 */

import { ChronosCausalityField, PlayerStats } from '../types';

export class StateValidator {
    static validateStats(stats: any): stats is PlayerStats {
        return (
            typeof stats.str === 'number' &&
            typeof stats.dex === 'number' &&
            typeof stats.int === 'number' &&
            stats.mana >= 0 &&
            stats.maxMana > 0
        );
    }

    static validateIntegrity(state: ChronosCausalityField): boolean {
        // Check for NaN injection in HP
        if (Number.isNaN(state.playerHp)) return false;

        // Check for disconnected references
        if (!state.artifactRetentionMatrix) return false;

        // Validate HP bounds
        if (state.playerHp < 0 || state.playerHp > state.playerMaxHp) return false;

        // Validate mana bounds
        if (state.playerStats.mana < 0 || state.playerStats.mana > state.playerStats.maxMana) return false;

        // Ensure arrays are initialized
        if (!Array.isArray(state.artifactRetentionMatrix)) return false;
        if (!Array.isArray(state.knownCharacters)) return false;
        if (!Array.isArray(state.knownSpells)) return false;

        return true;
    }

    /**
     * Sanitizes potentially corrupted state
     * @param state - State to sanitize
     * @returns Sanitized state or null if unrecoverable
     */
    static sanitize(state: Partial<ChronosCausalityField>): ChronosCausalityField | null {
        try {
            // Attempt to rescue core values
            const sanitized = {
                ...state,
                playerHp: Number.isNaN(state.playerHp) ? 1 : Math.max(0, state.playerHp || 0),
                artifactRetentionMatrix: Array.isArray(state.artifactRetentionMatrix)
                    ? state.artifactRetentionMatrix
                    : [],
                knownCharacters: Array.isArray(state.knownCharacters)
                    ? state.knownCharacters
                    : [],
                knownSpells: Array.isArray(state.knownSpells)
                    ? state.knownSpells
                    : []
            } as ChronosCausalityField;

            return this.validateIntegrity(sanitized) ? sanitized : null;
        } catch {
            return null;
        }
    }
}
