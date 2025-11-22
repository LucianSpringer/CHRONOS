/**
 * CombatCausalityEngine - Custom combat calculation engine
 * 
 * This class handles all combat-related mathematics client-side, removing  
 * the burden from the AI and ensuring consistent, organic combat mechanics.
 */

import { PlayerStats, StatusEffect, ElementType } from '../types';

export class CombatCausalityEngine {
    /**
     * Calculate damage using custom variance formula with Math.sin
     * @param baseDamage - Base damage before modifiers
     * @param attackerStats - The attacking entity's stats
     * @param defenderResistances - Defender's elemental resistances
     * @param defenderWeaknesses - Defender's elemental weaknesses
     * @param attackElement - Element type of the attack
     * @returns Final calculated damage
     */
    static calculateDamage(
        baseDamage: number,
        attackerStats: PlayerStats,
        defenderResistances: ElementType[] = [],
        defenderWeaknesses: ElementType[] = [],
        attackElement?: ElementType
    ): number {
        // Custom variance formula using Math.sin for organic feel
        // Creates a wave pattern that varies between 0.55 and 1.15 (60% variance range)
        const timeBasedSeed = Date.now() / 1000;
        const variance = Math.sin(timeBasedSeed) * 0.3 + 0.85; // Range: 0.55 to 1.15

        // Apply elemental multiplier
        let elementalMultiplier = 1.0;
        if (attackElement) {
            elementalMultiplier = this.applyElementalMultiplier(
                baseDamage,
                attackElement,
                defenderResistances,
                defenderWeaknesses
            );
        }

        // STR increases physical damage, INT increases magical damage
        const statBonus = attackElement === 'physical'
            ? 1 + (attackerStats.str / 100)
            : 1 + (attackerStats.int / 100);

        const finalDamage = Math.floor(baseDamage * variance * elementalMultiplier * statBonus);
        return Math.max(1, finalDamage); // Minimum 1 damage
    }

    /**
     * Determine if an attack is a critical hit
     * @param dexterity - Attacker's dexterity stat
     * @returns true if critical hit
     */
    static calculateCriticalHit(dexterity: number): boolean {
        // Critical chance formula: Base 5% + (DEX * 2)%
        // Example: DEX 10 = 25% crit chance, DEX 20 = 45% crit chance
        const critChance = 5 + (dexterity * 2);
        const roll = Math.random() * 100;
        return roll < critChance;
    }

    /**
     * Apply elemental multiplier based on resistances and weaknesses
     * @param baseDamage - Base damage amount
     * @param attackElement - Element of the attack
     * @param resistances - Defender's resistances
     * @param weaknesses - Defender's weaknesses
     * @returns Multiplier value
     */
    static applyElementalMultiplier(
        baseDamage: number,
        attackElement: ElementType,
        resistances: ElementType[],
        weaknesses: ElementType[]
    ): number {
        // Check for weakness (2x damage)
        if (weaknesses.includes(attackElement)) {
            return 2.0;
        }

        // Check for resistance (0.5x damage)
        if (resistances.includes(attackElement)) {
            return 0.5;
        }

        // Elemental rock-paper-scissors
        const elementalChart: Record<ElementType, ElementType[]> = {
            fire: ['ice', 'earth'],
            ice: ['wind'],
            lightning: ['wind'],
            poison: [],
            physical: [],
            earth: ['lightning'],
            wind: ['fire'],
            arcane: ['dark'],
            holy: ['dark'],
            dark: ['holy']
        };

        // Check if attacker has advantage
        const strongAgainst = elementalChart[attackElement] || [];
        if (strongAgainst.some(elem => resistances.includes(elem))) {
            return 1.5;
        }

        return 1.0; // Neutral
    }

    /**
     * Calculate damage from status effects (poison, burn, etc.)
     * @param effects - Array of active status effects
     * @returns Total damage from all damaging effects
     */
    static applyStatusEffectDamage(effects: StatusEffect[]): number {
        let totalDamage = 0;

        effects.forEach(effect => {
            // Poison and burn deal damage over time
            if (effect.element === 'poison') {
                totalDamage += 2; // Poison deals 2 damage per turn
            } else if (effect.element === 'fire') {
                totalDamage += 3; // Burn deals 3 damage per turn
            }
        });

        return totalDamage;
    }

    /**
     * Reduce status effect durations and remove expired effects
     * @param effects - Array of current status effects
     * @returns Updated array with reduced durations, expired effects removed
     */
    static reduceStatusEffectDurations(effects: StatusEffect[]): StatusEffect[] {
        return effects
            .map(effect => ({
                ...effect,
                duration: effect.duration - 1
            }))
            .filter(effect => effect.duration > 0);
    }

    /**
     * Calculate healing amount with variance
     * @param baseHealing - Base healing amount
     * @param int - Intelligence stat (affects healing potency)
     * @returns Final healing amount
     */
    static calculateHealing(baseHealing: number, int: number): number {
        // Intelligence slightly boosts healing (1% per INT point)
        const intBonus = 1 + (int / 100);

        // Small variance to make healing feel organic
        const variance = 0.9 + (Math.random() * 0.2); // 90%-110%

        return Math.floor(baseHealing * intBonus * variance);
    }

    /**
     * Calculate mana cost with potential reduction from INT
     * @param baseCost - Base mana cost
     * @param int - Intelligence stat
     * @returns Final mana cost
     */
    static calculateManaCost(baseCost: number, int: number): number {
        // High INT reduces mana cost slightly (max 20% reduction at INT 20)
        const reduction = Math.min(int / 100, 0.20);
        return Math.max(1, Math.floor(baseCost * (1 - reduction)));
    }

    /**
     * Calculate experience or drop quality based on combat performance
     * @param isVictory - Whether player won  
     * @param turnCount - Number of turns in combat
     * @returns Quality multiplier for loot/exp
     */
    static calculateCombatBonus(isVictory: boolean, turnCount: number): number {
        if (!isVictory) return 0;

        // Faster victories = better rewards
        // 1-3 turns: 1.5x, 4-6 turns: 1.2x, 7+ turns: 1.0x
        if (turnCount <= 3) return 1.5;
        if (turnCount <= 6) return 1.2;
        return 1.0;
    }
}
