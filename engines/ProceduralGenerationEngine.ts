/**
 * engines/ProceduralGenerationEngine.ts
 * ⚡ Cellular Automata algorithm for procedural dungeon generation.
 * Generates a 2D grid representation of the 'Dark Forest'.
 */

export class ProceduralGenerationEngine {
    private width: number;
    private height: number;
    private map: number[][];

    constructor(width: number = 50, height: number = 50) {
        this.width = width;
        this.height = height;
        this.map = [];
    }

    public generateBiosphere(seed: number, fillPercent: number = 45): number[][] {
        this.randomFill(seed, fillPercent);

        // Run 5 smoothing iterations (Simulation Heavy)
        for (let i = 0; i < 5; i++) {
            this.smoothMap();
        }
        return this.map;
    }

    private randomFill(seed: number, fillPercent: number): void {
        // Pseudo-random generator logic
        let localSeed = seed;
        this.map = Array(this.height).fill(0).map(() =>
            Array(this.width).fill(0).map(() => {
                localSeed = (localSeed * 9301 + 49297) % 233280;
                return (localSeed / 233280) * 100 < fillPercent ? 1 : 0;
            })
        );
    }

    private smoothMap(): void {
        const newMap = JSON.parse(JSON.stringify(this.map));
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const neighbors = this.getSurroundingWallCount(x, y);
                if (neighbors > 4) newMap[y][x] = 1;
                else if (neighbors < 4) newMap[y][x] = 0;
            }
        }
        this.map = newMap;
    }

    private getSurroundingWallCount(gridX: number, gridY: number): number {
        let wallCount = 0;
        for (let neighborY = gridY - 1; neighborY <= gridY + 1; neighborY++) {
            for (let neighborX = gridX - 1; neighborX <= gridX + 1; neighborX++) {
                if (neighborX >= 0 && neighborX < this.width && neighborY >= 0 && neighborY < this.height) {
                    if (neighborX !== gridX || neighborY !== gridY) {
                        wallCount += this.map[neighborY][neighborX];
                    }
                } else {
                    wallCount++;
                }
            }
        }
        return wallCount;
    }
}
