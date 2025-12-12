Develop a comprehensive interactive horse race betting game with the following specifications:

Frontend Implementation (React + TypeScript):

1. Create a QR code scanning entry point that directs users to:

    - Initial screen for entering a unique screen name (with validation)
    - Subsequent horse selection screen displaying 10 horses (configurable quantity)
    - Each horse should have:
        - Visual representation (image/icon)
        - Odds/statistics display
        - Selection button

2. Race visualization component:
    - Straight track layout with clearly marked lanes (1 per horse)
    - Animated horse avatars that:
        - Begin at starting positions
        - Progress down track with variable speeds
        - Can overtake or fall behind dynamically
        - Reach finish line with clear winner indication
    - Real-time bettor display showing:
        - All users who bet on winning horse
        - Their screen names and bet amounts

Backend Implementation (Node.js + TypeScript + WebSockets):

1. WebSocket server to handle:

    - Real-time player connections
    - Bet submissions
    - Race state updates
    - Admin commands

2. Race simulation logic:

    - Random outcome generation with weighted probabilities
    - Progressive position updates during race
    - Winner determination algorithm

3. Admin control panel with:
    - Connected players list
    - Current bets overview
    - Race control buttons:
        - Start/stop race
        - Reset system
        - Manual override options
    - Configuration settings:
        - Horse count adjustment
        - Race parameters tuning

Technical Requirements:

-   Simple implementation focusing on core functionality
-   Basic error handling (no extensive testing required)
-   Minimal performance optimizations
-   Configurable horse count (default: 10)
-   Straightforward UI with clear betting flow

Implementation Steps:

1. Set up React+TS frontend project
2. Develop Node.js+TS WebSocket backend
3. Create QR code generation/scanning system
4. Implement user flow (screen name → horse selection)
5. Build race visualization component
6. Develop admin control interface
7. Connect frontend and backend via WebSockets
8. Implement basic race simulation logic

Visual Design:

-   Clean, intuitive interface
-   Distinct horse colors/icons
-   Clear track visualization
-   Responsive layout for mobile/desktop

Note: All numerical values (horse count, odds, etc.) should be easily modifiable for future adjustments without major code changes.
