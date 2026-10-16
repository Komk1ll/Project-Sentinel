# ADR 0003: Screen-Relative WASD & Arrow Controls with Diagonal Normalization

- **Status**: Accepted
- **Date**: 2026-10-16
- **Deciders**: Engineering Team
- **Consulted**: Game Design, Player Experience, Technical Director

---

## Context

In an isometric 2:1 projection game, ground grid axes run diagonally across the screen:
- Grid $+X$ moves diagonally down-right ($\text{SE}$)
- Grid $-X$ moves diagonally up-left ($\text{NW}$)
- Grid $+Y$ moves diagonally down-left ($\text{SW}$)
- Grid $-Y$ moves diagonally up-right ($\text{NE}$)

The initial implementation in `DistrictScene.ts` mapped keyboard inputs directly to grid axes:
- Pressing `W` / `Up` decremented grid $Y$, causing the player to move diagonally up-right ($\text{NE}$).
- Pressing `S` / `Down` incremented grid $Y$, causing the player to move diagonally down-left ($\text{SW}$).
- Pressing `A` / `Left` decremented grid $X$, causing the player to move diagonally up-left ($\text{NW}$).
- Pressing `D` / `Right` incremented grid $X$, causing the player to move diagonally down-right ($\text{SE}$).

Consequently, all WASD and arrow controls were rotated 45 degrees out of phase with standard keyboard expectations. Moving strictly Up required simultaneously pressing `W + A`, and moving strictly Right required pressing `W + D`.

Section 4 and Section 7 of the game design specifications (`ТЗ_Project_Sentinel_v1.docx`) explicitly mandate:
> *"WASD и стрелки перемещают персонажа относительно экрана; диагональный вектор нормализуется, скорость не увеличивается."*
> *(WASD and arrows move the character relative to the screen; diagonal vector is normalized, speed does not increase.)*

---

## Decision

We establish screen-relative input handling across the isometric projection:

1. **Screen-to-Grid Transformation (`screenToGridDelta`)**:
   - Player inputs accumulate in screen space:
     - `W` / `Up`: `screenY -= 1`
     - `S` / `Down`: `screenY += 1`
     - `A` / `Left`: `screenX -= 1`
     - `D` / `Right`: `screenX += 1`
   - The screen vector $(\Delta S_x, \Delta S_y)$ is normalized if non-zero:
     $$\hat{S} = \frac{\mathbf{S}}{\|\mathbf{S}\|}$$
   - In 2:1 isometric space, screen axes map to grid deltas via:
     $$\Delta G_x = (\hat{S}_x + \hat{S}_y) \cdot \frac{v}{\sqrt{2}}$$
     $$\Delta G_y = (-\hat{S}_x + \hat{S}_y) \cdot \frac{v}{\sqrt{2}}$$
   - This ensures that orthogonal inputs ($W, A, S, D$) and diagonal inputs ($W+D, W+A, S+D, S+A$) travel at the exact same physical grid speed $v$ per frame.

2. **8-Directional Facing Resolution (`getIsometricDirectionFromScreen`)**:
   - Character orientation maps directly from screen direction to 8-way compass headings:
     - Up $(0, -1) \to$ `'N'` (facing away from camera)
     - Down $(0, 1) \to$ `'S'` (facing toward camera)
     - Left $(-1, 0) \to$ `'W'` (facing screen left)
     - Right $(1, 0) \to$ `'E'` (facing screen right)
     - Up-Right $(1, -1) \to$ `'NE'`
     - Up-Left $(-1, -1) \to$ `'NW'`
     - Down-Right $(1, 1) \to$ `'SE'`
     - Down-Left $(-1, 1) \to$ `'SW'`
   - Angles are classified using $\text{octant} = \text{round}(\text{atan2}(S_y, S_x) / (\pi / 4))$.

3. **Epsilon Tolerance in `getIsometricDirectionFromDelta`**:
   - Added an epsilon threshold (`1e-4`) to eliminate floating-point rounding errors (e.g. $1.11 \times 10^{-16}$) from biasing pure diagonal directions.

---

## Consequences

### Positive
- Intuitive, industry-standard controls matching modern isometric action games (Hades, Diablo, Project Zomboid).
- Strict adherence to project specifications (`ТЗ_Project_Sentinel_v1.docx`).
- Diagonal movement speed is strictly clamped; moving diagonally no longer provides an unnatural $1.41\times$ speed advantage.
- 3D character hero and 2D shadow remain synchronized with identical heading orientations.
- Fully unit-tested with Vitest (math transforms and system integration).

### Negative / Trade-offs
- Moving purely along a single grid tile edge requires diagonal input ($W+D, W+A, S+D, S+A$), which is the standard trade-off for screen-relative isometric controls.
