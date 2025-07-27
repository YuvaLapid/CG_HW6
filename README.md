# Computer Graphics - Exercise 6 - WebGL Basketball Court Game

## Running our implementation
1. Clone this repository to your local machine
2. Make sure you have Node.js installed
3. Start the local web server: `node index.js`
4. Open your browser and go to http://localhost:8000

## Group Members
**MANDATORY: Add the full names of all group members here:**
- Yuval Lapid 211827555
- Kanir Weiss 211423439
  
## Technical Details
- Run the server with: `node index.js`
- Access at http://localhost:8000 in your web browser
- All textures were created using ChatGPT (not some licensed site)
- All sound effects were downloaded from https://pixabay.com/

## Controls
- Move Ball: ←, →, ↑, ↓
- Adjust Power: W, S
- Shoot The Hoop: Spacebar
- Reset Ball: R
- Toggle Orbit: O

## Physics Implementation
- The ball roll on the ground at a constant speed with insta-stopping (cannot roll outside of the court)
- When pressing Spacebar an Arc is calculated to auto shot in the direction of the hoop
- The direction of the Arc is then taken and scaled by the power level and is then set as the initial speed
- From there the ball travels as a free fall object with some initial speed
- If the ball hits the board it will bounce back to the opposite position (reflected across the ZY plane)
- If the ball hits the rim it will bounce back in the opposite position (reflected)
- If the ball hits the ground it will bounce with some bounce decay
- if the ball lands inside the hoop counts as a score and the ball is reset to the middle
- If the ball over shoots and gets outside the court it is reset to the middle of the court

## Addional Stuff
- Trails
- Multiple hoops with auto select
- Sound effects when missing scoring and ball bounce
- Ball rotation on the ground and in air
