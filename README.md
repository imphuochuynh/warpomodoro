# WARPOMODORO

A minimal, fullscreen Pomodoro timer that replaces numbers with words and time with motion. Experience focus through an immersive starfield that accelerates as your session progresses, creating a unique "warp speed" visualization of your productivity.

## Features

### 🌌 **Immersive Starfield Animation**
- Dynamic starfield that starts slow and accelerates throughout your 25-minute work session
- Hyperspace exit animation when taking breaks
- Smooth star trails and motion blur effects at high speeds
- Configurable star respawn distance and animation parameters

### 🎨 **Multiple Themes (FIELDS)**
- **WARP**: Classic black background with white stars
- **DRIFT**: Gray background with sky blue stars  
- **IONFIELD**: Dark purple background with magenta stars
- **GHOSTLINE**: Blue-gray background with light gray stars
- Theme persistence across sessions

### 🎛️ **Analog-Style Controls**
- **CTRL**: Toggle session control visibility
- **PROG**: Toggle progress bar and timer display
- **AMBT**: Toggle ambient sound during work sessions
- All controls match your selected theme colors

### ⏱️ **Accurate Timer System**
- 25-minute work sessions with precise countdown
- 5-minute break periods
- Session tracking (only counts completed 25-minute sessions)
- Resume functionality after breaks

### 🔊 **Ambient Sound**
- Optional ambient sound during work sessions
- Easily adjustable volume in configuration
- Seamless looping audio experience

### 🎯 **Minimal Interface**
- Clean, distraction-free design
- Space-themed terminology (LAUNCH, SURFACE, DISENGAGE)
- Contextual hover descriptions
- No unnecessary visual clutter

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd warpomodoro
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Add the ambient sound file:
   - Download the ambient sound file
   - Place it at `public/sounds/ambient.wav`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Starting a Session
1. Select your preferred theme from the FIELDS options
2. Click **LAUNCH** to begin a 25-minute work session
3. Watch the starfield accelerate as you focus

### During a Session
- **SURFACE**: Take a short break (session remains active)
- **DISENGAGE**: End the session early
- Use the **CTRL** toggle to show/hide session controls
- Use the **PROG** toggle to show/hide the progress bar and timer
- Use the **AMBT** toggle to enable/disable ambient sound

### Session Flow
1. **Work Session** (25 minutes): Starfield accelerates to warp speed
2. **Break** (5 minutes): Hyperspace exit animation, gentle floating stars
3. **Return**: Resume work or return to main screen

## Configuration

The app includes an easily configurable `CONFIG` object in `app/page.tsx`:

\`\`\`javascript
const CONFIG = {
  // Timer settings
  WORK_DURATION: 25 * 60 * 1000, // 25 minutes
  BREAK_DURATION: 5 * 60 * 1000, // 5 minutes

  // Starfield settings
  NUM_STARS: 400,
  STAR_SPEED_MAX: 2.5,
  STAR_RESPAWN_DISTANCE: 550,

  // Audio settings
  AMBIENT_VOLUME: 0.2, // 0.0 to 1.0
}
\`\`\`

### Customizable Parameters
- **Timer durations**: Adjust work and break periods
- **Star count and speed**: Control animation intensity
- **Respawn distance**: How far back stars appear
- **Ambient volume**: Audio level during sessions
- **Theme colors**: Easy to modify in the THEMES object

## Technical Details

### Built With
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **HTML5 Canvas** - Starfield animation
- **Web Audio API** - Ambient sound generation

### Browser Compatibility
- Modern browsers with Canvas and Web Audio API support
- Responsive design for various screen sizes
- Fullscreen experience optimized for desktop

### Performance
- Optimized canvas rendering with requestAnimationFrame
- Efficient star trail calculations
- Minimal DOM updates during animation

## Data Persistence

The app automatically saves:
- Selected theme preference
- Session completion count
- Control preferences (ambient sound toggle)

Data is stored in browser localStorage and persists between sessions.

## Credits

### Ambient Sound
**"Somnium"** by [Vrymaa](https://freesound.org/people/Vrymaa/)  
Source: [Freesound.org](https://freesound.org/people/Vrymaa/sounds/722400/)  
Licensed under Creative Commons

### Inspiration
Built for focused work sessions with a space exploration aesthetic, combining the proven Pomodoro Technique with immersive visual feedback.

## License

This project is open source. Please credit the ambient sound as specified above when redistributing.

## Contributing

Feel free to submit issues and enhancement requests. The codebase is designed to be easily configurable and extensible.

---

**Focus. Accelerate. Achieve.**
\`\`\`

This README provides comprehensive documentation for the WARPOMODORO project, including proper credit for the ambient sound from Vrymaa on Freesound.org. It covers all the key features, installation instructions, usage guidelines, and technical details that users and contributors would need to understand and work with the project.
