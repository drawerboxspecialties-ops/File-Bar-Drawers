// file-formulas.js - Dedicated File Drawer Math Engine
export const FILE_FORMULA_CONFIG = {
    // Material thickness deductions matrix
    deductions: {
        0.625: 0.624,   // 5/8"
        0.500: 0.374,   // 1/2"
        0.472: 0.318,   // 12mm
        0.750: 0.750    // 3/4"
    },

    // Standard industry dimensions matrix for folder rail clearance configuration
    targets: {
        'letter': 12.250, // Standard Letter hanging file width
        'legal': 15.250   // Standard Legal hanging file width
    },

    getDeduction(thickness) {
        return this.deductions[thickness] !== undefined ? this.deductions[thickness] : thickness;
    },

    calculateValues(fileMode, itemMode, data) {
        const w = data.width;
        const d = data.depth;
        const h = data.height;
        const t = data.t;
        const autoRail = !!data.autoRail;
        
        // Manual override inputs
        const rawLeft = data.leftRailRaw || 0;
        const rawRight = data.rightRailRaw || 0;

        let isSafe = true;
        let errorMsg = "";

        const deduction = this.getDeduction(t);
        const insideWidth = w - (2 * t);
        const insideDepth = d - (2 * t);

        let sideLen = d;
        let leftRailPos = 0;
        let rightRailPos = 0;
        let railLength = 0;
        let displayClearance = 0;

        // 1. Structural Height Firewall: Prevent folder tabs from crushing on closure
        if (h < 9.750) {
            isSafe = false;
            errorMsg = "HEIGHT ERROR: Box must be at least 9.750\" to prevent hanging file tab binding.";
        }

        // 2. Resolve Construction Blank Lengths
        if (itemMode === 'dovetail') {
            sideLen = d - deduction; // Shortened blank for dovetail interlocking joint
        } else if (itemMode === 'dowel') {
            sideLen = d;             // Full-depth blank for flush doweled back panel
        }

        // 3. Process Hanging Rail Calculations & Plunge Vectors
        if (fileMode === 'letter' || fileMode === 'legal') {
            const clearanceTarget = this.targets[fileMode];
            railLength = itemMode === 'dovetail' ? (d - deduction - t) : (d - t); // Clears the front wall inside face

            if (autoRail) {
                if (insideWidth < clearanceTarget) {
                    isSafe = false;
                    errorMsg = `WIDTH ERROR: Inside box width (${insideWidth.toFixed(3)}") is too narrow for ${fileMode.toUpperCase()} files.`;
                }
                // Flawlessly center the file tracks inside the available space
                leftRailPos = (w - clearanceTarget) / 2;
                rightRailPos = w - leftRailPos;
                displayClearance = clearanceTarget;
            } else {
                leftRailPos = rawLeft;
                rightRailPos = rawRight;
                displayClearance = rightRailPos - leftRailPos;

                if (leftRailPos <= t || rightRailPos >= (w - t) || leftRailPos >= rightRailPos) {
                    isSafe = false;
                    errorMsg = "MANUAL ENTRY ERROR: Rail positions cross outside drawer side walls or overlap.";
                }
            }
        } else if (fileMode === 'lateral') {
            // LATERAL MODE: Files hang left-to-right; rail slots run across the width profile
            const lateralClearanceTarget = 12.250;
            railLength = insideWidth;

            if (autoRail) {
                if (insideDepth < lateralClearanceTarget) {
                    isSafe = false;
                    errorMsg = `DEPTH ERROR: Inside box depth (${insideDepth.toFixed(3)}") is too shallow for Lateral file hanging.`;
                }
                leftRailPos = (d - lateralClearanceTarget) / 2;
                rightRailPos = d - leftRailPos;
                displayClearance = lateralClearanceTarget;
            } else {
                leftRailPos = rawLeft;
                rightRailPos = rawRight;
                displayClearance = rightRailPos - leftRailPos;

                if (leftRailPos <= t || rightRailPos >= (d - t) || leftRailPos >= rightRailPos) {
                    isSafe = false;
                    errorMsg = "MANUAL ENTRY ERROR: Lateral rail tracking limits exceed physical box depth.";
                }
            }
        }

        return {
            isSafe,
            errorMsg,
            sideLen,
            insideWidth,
            insideDepth,
            leftRailPos,
            rightRailPos,
            railLength,
            displayClearance,
            slotDepth: 0.500, // Standard 1/2" depth channel plunge
            slotWidth: 0.125   // Standard 1/8" router routing bit channel kerf
        };
    }
};