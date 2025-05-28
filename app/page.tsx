"use client"

import { useEffect, useRef, useState, useCallback } from "react"

// ===== CONFIGURATION =====
const CONFIG = {
  // Timer settings
  WORK_DURATION: 25 * 60 * 1000, // 25 minutes
  BREAK_DURATION: 5 * 60 * 1000, // 5 minutes

  // Starfield settings
  NUM_STARS: 500,
  IDLE_SPEED: 0.2,
  STAR_SPEED_MIN: 0.05,
  STAR_SPEED_BASE: 0.8,
  STAR_SPEED_MAX: 2.5, // Reduced for more relaxing experience
  STAR_RESPAWN_DISTANCE: 300, // How far back stars respawn (easily editable)

  // Animation settings
  ACCELERATION_TIME: 5 * 60 * 1000, // 5 minutes to reach max speed
  EXIT_ANIMATION_TIME: 1200, // 1.2 seconds
  TRAIL_LENGTH_BASE: 400,
  TRAIL_LENGTH_MULTIPLIER: 300,

  // Audio settings
  AMBIENT_VOLUME: 0.2, // Easily editable ambient sound volume (0.0 to 1.0)
}

// ===== THEMES =====
const THEMES = {
  WARP: {
    name: "WARP",
    background: "#000000",
    stars: "#f5f5f5",
  },
  DRIFT: {
    name: "DRIFT",
    background: "#2d2d2d",
    stars: "#87ceeb",
  },
  IONFIELD: {
    name: "IONFIELD",
    background: "#110018",
    stars: "#cc00a6",
  },
  GHOSTLINE: {
    name: "GHOSTLINE",
    background: "#373f4c",
    stars: "#f7fafc",
  },
}

interface Star {
  x: number
  y: number
  z: number
  prevX?: number
  prevY?: number
  hasValidPrev: boolean
  twinkle?: number
  twinkleSpeed?: number
}

type TimerState = "idle" | "working" | "paused" | "workComplete" | "break" | "breakComplete"
type ThemeKey = keyof typeof THEMES

export default function WarPomodoro() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const starsRef = useRef<Star[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const breakStartSpeedRef = useRef<number>(0)
  const workElapsedRef = useRef<number>(0) // Track work session elapsed time
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [state, setState] = useState<TimerState>("idle")
  const [sessions, setSessions] = useState(0)
  const [completedSessions, setCompletedSessions] = useState(0) // Track only completed sessions
  const [fadeOpacity, setFadeOpacity] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showProgressHint, setShowProgressHint] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [ambientEnabled, setAmbientEnabled] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("WARP")
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Load sessions, theme, and ambient setting from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("warpomodoro-sessions")
    if (savedSessions) {
      setSessions(Number.parseInt(savedSessions, 10))
    }

    const savedCompletedSessions = localStorage.getItem("warpomodoro-completed-sessions")
    if (savedCompletedSessions) {
      setCompletedSessions(Number.parseInt(savedCompletedSessions, 10))
    }

    const savedTheme = localStorage.getItem("warpomodoro-theme") as ThemeKey
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme)
    }

    const savedAmbient = localStorage.getItem("warpomodoro-ambient")
    if (savedAmbient === "true") {
      setAmbientEnabled(true)
    }
  }, [])

  // Initialize audio
  useEffect(() => {
    const initAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/ambient.wav")
        audioRef.current.loop = true
        audioRef.current.volume = CONFIG.AMBIENT_VOLUME
        audioRef.current.preload = "auto"
      }
    }

    initAudio()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  // Handle ambient audio during sessions
  useEffect(() => {
    const playAudio = async () => {
      if (audioRef.current && state === "working" && ambientEnabled) {
        try {
          audioRef.current.currentTime = 0
          await audioRef.current.play()
        } catch (error) {
          console.log("Audio play failed:", error)
        }
      } else if (audioRef.current) {
        audioRef.current.pause()
      }
    }

    playAudio()
  }, [state, ambientEnabled])

  // Save ambient setting to localStorage
  const toggleAmbient = () => {
    const newAmbientEnabled = !ambientEnabled
    setAmbientEnabled(newAmbientEnabled)
    localStorage.setItem("warpomodoro-ambient", newAmbientEnabled.toString())
  }

  // Save theme to localStorage
  const changeTheme = (theme: ThemeKey) => {
    setCurrentTheme(theme)
    localStorage.setItem("warpomodoro-theme", theme)
  }

  // Get current theme colors
  const theme = THEMES[currentTheme]

  // Initialize stars with randomization
  const initStars = useCallback(() => {
    const stars: Star[] = []
    for (let i = 0; i < CONFIG.NUM_STARS; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 1000,
        hasValidPrev: false,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
      })
    }
    starsRef.current = stars
  }, [])

  // Handle break action
  const takeBreak = useCallback(() => {
    if (state === "working") {
      // Store current work elapsed time
      workElapsedRef.current = Date.now() - startTimeRef.current

      // Store current speed for break transition
      const elapsed = workElapsedRef.current
      const progress = Math.min(elapsed / CONFIG.WORK_DURATION, 1)
      const rampUpTime = 5000 // Very quick ramp to 5 seconds

      let currentSpeed = CONFIG.STAR_SPEED_MIN
      if (elapsed < rampUpTime) {
        const rampProgress = elapsed / rampUpTime
        const easedRamp = rampProgress * rampProgress * (3 - 2 * rampProgress)
        currentSpeed = CONFIG.IDLE_SPEED + (CONFIG.STAR_SPEED_BASE - CONFIG.IDLE_SPEED) * easedRamp
      } else {
        const remainingProgress = (elapsed - rampUpTime) / (CONFIG.WORK_DURATION - rampUpTime)
        const easedProgress = Math.min(remainingProgress, 1)
        // More aggressive acceleration curve
        const aggressiveProgress = easedProgress * easedProgress * easedProgress
        currentSpeed = CONFIG.STAR_SPEED_BASE + (CONFIG.STAR_SPEED_MAX - CONFIG.STAR_SPEED_BASE) * aggressiveProgress
      }

      breakStartSpeedRef.current = currentSpeed
      setState("break")
      startTimeRef.current = Date.now()
      setShowControls(false)
    }
  }, [state])

  // Handle end session action (early exit - doesn't count as completed)
  const endSession = useCallback(() => {
    if (state === "working") {
      setState("idle")
      setFadeOpacity(0)
      setShowControls(false)
      workElapsedRef.current = 0 // Reset work elapsed time
    }
  }, [state])

  // Touch/click event handler for canvas
  useEffect(() => {
    const handleTouch = (event: TouchEvent | MouseEvent) => {
      if (state === "working") {
        event.preventDefault()
        // Canvas clicks no longer toggle progress - handled by toggle button
      }
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouch)
      canvas.addEventListener("click", handleTouch)

      return () => {
        canvas.removeEventListener("touchstart", handleTouch)
        canvas.removeEventListener("click", handleTouch)
      }
    }
  }, [state])

  // Show controls after 5 seconds of starting work session
  useEffect(() => {
    if (state === "working") {
      const controlsTimer = setTimeout(() => {
        setShowControls(true)
      }, 5000)

      const hintTimer = setTimeout(() => {
        setShowProgressHint(true)
        // Hide hint after 3 seconds
        setTimeout(() => {
          setShowProgressHint(false)
        }, 3000)
      }, 5000)

      return () => {
        clearTimeout(controlsTimer)
        clearTimeout(hintTimer)
      }
    } else {
      setShowControls(false)
      setShowProgressHint(false)
      setControlsVisible(true) // Reset controls visibility when leaving working state
    }
  }, [state])

  // Format time for display
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Get current timer display
  const getCurrentTime = () => {
    if (state === "working") {
      const currentElapsed = Date.now() - startTimeRef.current
      const totalElapsed = workElapsedRef.current + currentElapsed
      const remaining = Math.max(CONFIG.WORK_DURATION - totalElapsed, 0)
      return formatTime(remaining)
    } else if (state === "break") {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(CONFIG.BREAK_DURATION - elapsed, 0)
      return formatTime(remaining)
    }
    return "25:00"
  }

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Clear canvas with theme background
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)

    const currentTime = Date.now()
    const elapsed = currentTime - startTimeRef.current

    let speed = CONFIG.STAR_SPEED_MIN
    let isExitingWarp = false

    if (state === "idle") {
      // Gentle starfield movement on idle screen
      speed = CONFIG.IDLE_SPEED
    } else if (state === "working") {
      // Calculate total elapsed time including previous work before break
      const totalElapsed = workElapsedRef.current + elapsed
      const progress = Math.min(totalElapsed / CONFIG.WORK_DURATION, 1)

      // Smooth acceleration curve that reaches max speed over configured time
      const accelerationProgress = Math.min(totalElapsed / CONFIG.ACCELERATION_TIME, 1)

      // Use a more aggressive curve for dramatic acceleration
      const easedProgress = accelerationProgress * accelerationProgress * (3 - 2 * accelerationProgress)
      const dramaticProgress = easedProgress * easedProgress

      // Scale from idle speed to maximum speed
      speed = CONFIG.IDLE_SPEED + (CONFIG.STAR_SPEED_MAX - CONFIG.IDLE_SPEED) * dramaticProgress

      // Check if work session is complete (full 25 minutes)
      if (totalElapsed >= CONFIG.WORK_DURATION) {
        setState("workComplete")
        setFadeOpacity(0)
        setShowControls(false)
        // Only count completed sessions (full 25 minutes)
        const newCompletedSessions = completedSessions + 1
        setCompletedSessions(newCompletedSessions)
        localStorage.setItem("warpomodoro-completed-sessions", newCompletedSessions.toString())
        workElapsedRef.current = 0
      }
    } else if (state === "workComplete") {
      // Keep moving slowly and add twinkling
      speed = 0.2
    } else if (state === "break") {
      // Hyperspace exit animation - rapid deceleration
      const exitProgress = Math.min(elapsed / CONFIG.EXIT_ANIMATION_TIME, 1)

      if (exitProgress < 1) {
        isExitingWarp = true
        // Rapid deceleration with easing
        const easedExit = 1 - Math.pow(1 - exitProgress, 3)

        // Calculate the speed we were at when break started
        const totalElapsed = workElapsedRef.current
        const accelerationProgress = Math.min(totalElapsed / CONFIG.ACCELERATION_TIME, 1)
        const easedProgress = accelerationProgress * accelerationProgress * (3 - 2 * accelerationProgress)
        const dramaticProgress = easedProgress * easedProgress
        const startingSpeed = CONFIG.IDLE_SPEED + (CONFIG.STAR_SPEED_MAX - CONFIG.IDLE_SPEED) * dramaticProgress

        speed = startingSpeed * (1 - easedExit * 0.98) // Decelerate to 2% of original
      } else {
        speed = 0.05 // Very slow after exit animation
      }

      if (elapsed >= CONFIG.BREAK_DURATION) {
        setState("breakComplete")
      }
    } else if (state === "breakComplete") {
      speed = 0.05
    }

    // Calculate trail intensity based on speed
    const trailIntensity = Math.min(speed / CONFIG.STAR_SPEED_MAX, 1.0)
    const maxTrailLength = CONFIG.TRAIL_LENGTH_BASE + trailIntensity * CONFIG.TRAIL_LENGTH_MULTIPLIER

    // Update and draw stars
    ctx.fillStyle = theme.stars

    starsRef.current.forEach((star) => {
      // Update twinkle animation
      if (star.twinkle !== undefined && star.twinkleSpeed !== undefined) {
        star.twinkle += star.twinkleSpeed
      }

      // Calculate current position BEFORE moving the star
      const currentX = (star.x / star.z) * 120 + centerX
      const currentY = (star.y / star.z) * 120 + centerY

      if (state === "break" || state === "breakComplete") {
        if (isExitingWarp) {
          // During exit animation, stars collapse inward toward center
          const exitProgress = Math.min(elapsed / CONFIG.EXIT_ANIMATION_TIME, 1)
          const collapseForce = exitProgress * 0.3

          const deltaX = centerX - currentX
          const deltaY = centerY - currentY

          star.x += deltaX * collapseForce * 0.01
          star.y += deltaY * collapseForce * 0.01
          star.z -= speed
        } else {
          // Very gentle floating motion after exit
          star.x += (Math.random() - 0.5) * 0.1
          star.y += (Math.random() - 0.5) * 0.1
        }
      } else {
        // Move star toward viewer
        star.z -= speed
      }

      // Reset star if it's too close - using configurable respawn distance
      if (star.z <= 1) {
        star.x = (Math.random() - 0.5) * 2000
        star.y = (Math.random() - 0.5) * 2000
        star.z = Math.random() * 800 + CONFIG.STAR_RESPAWN_DISTANCE // Configurable respawn distance
        star.hasValidPrev = false
      }

      // Project NEW 3D position to 2D
      const x = (star.x / star.z) * 120 + centerX
      const y = (star.y / star.z) * 120 + centerY

      // Only draw if star is on screen
      if (x >= -100 && x <= width + 100 && y >= -100 && y <= height + 100) {
        const baseSize = Math.max((1 - star.z / 1000) * 3.0, 0.4)

        // Calculate twinkling effect for workComplete state
        let size = baseSize
        let opacity = 1
        if (state === "workComplete" && star.twinkle !== undefined) {
          const twinkleIntensity = (Math.sin(star.twinkle) + 1) / 2
          size = baseSize * (0.5 + twinkleIntensity * 0.8)
          opacity = 0.3 + twinkleIntensity * 0.7
        }

        // Enhanced trail drawing with motion blur effect
        if (
          speed > 0.5 &&
          star.hasValidPrev &&
          star.prevX !== undefined &&
          star.prevY !== undefined &&
          (state === "working" || isExitingWarp)
        ) {
          const distance = Math.sqrt(Math.pow(x - star.prevX, 2) + Math.pow(y - star.prevY, 2))

          if (distance < maxTrailLength && distance > 0.3) {
            ctx.beginPath()
            ctx.moveTo(star.prevX, star.prevY)
            ctx.lineTo(x, y)

            // Enhanced trail with gradient effect for motion blur
            const gradient = ctx.createLinearGradient(star.prevX, star.prevY, x, y)
            const baseOpacity = Math.min(speed / 8, 0.95)

            // Parse star color for gradient
            const starColor =
              theme.stars === "#f5f5f5"
                ? "245, 245, 245"
                : theme.stars === "#87ceeb"
                  ? "135, 206, 235"
                  : theme.stars === "#00ffff"
                    ? "0, 255, 255"
                    : theme.stars === "#f7fafc"
                      ? "247, 250, 252"
                      : "245, 245, 245"

            if (isExitingWarp) {
              // During exit, trails fade more dramatically
              const exitProgress = Math.min(elapsed / CONFIG.EXIT_ANIMATION_TIME, 1)
              const exitFade = 1 - exitProgress * 0.7
              gradient.addColorStop(0, `rgba(${starColor}, ${baseOpacity * 0.1 * exitFade})`)
              gradient.addColorStop(1, `rgba(${starColor}, ${baseOpacity * exitFade})`)
            } else {
              gradient.addColorStop(0, `rgba(${starColor}, ${baseOpacity * 0.1})`)
              gradient.addColorStop(1, `rgba(${starColor}, ${baseOpacity})`)
            }

            ctx.strokeStyle = gradient
            ctx.lineWidth = Math.max(size * 2, 2.0) // Match trail width to star size
            ctx.stroke()
          }
        }

        // Draw the star dot
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = `${theme.stars}${Math.floor(opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.fill()
      }

      // Update previous position for next frame
      star.prevX = x
      star.prevY = y
      star.hasValidPrev = true
    })

    // Add hyperspace exit flash effect
    if (isExitingWarp && elapsed < 300) {
      // Flash for first 300ms of exit
      const flashProgress = elapsed / 300
      const flashOpacity = (1 - flashProgress) * 0.15
      ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`
      ctx.fillRect(0, 0, width, height)
    }

    // Apply fade overlay for work complete state
    if (state === "workComplete" && fadeOpacity > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(fadeOpacity * 0.7, 0.5)})`
      ctx.fillRect(0, 0, width, height)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [state, completedSessions, theme])

  // Handle canvas resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [])

  // Start work session
  const startWork = () => {
    setState("working")
    startTimeRef.current = Date.now()
    setFadeOpacity(0)
    setShowControls(false)
    setShowProgressHint(false)
    setControlsVisible(true)
    workElapsedRef.current = 0 // Reset for new session
  }

  // Resume work session after break
  const resumeWork = () => {
    setState("working")
    startTimeRef.current = Date.now()
    setFadeOpacity(0)
    setShowControls(false)
    setShowProgressHint(false)
    setControlsVisible(true)
  }

  // Start break
  const startBreak = () => {
    setState("break")
    startTimeRef.current = Date.now()
    setFadeOpacity(0)
    setShowControls(false)
    setShowProgressHint(false)
    breakStartSpeedRef.current = 0
  }

  // Return to idle
  const returnToIdle = () => {
    setState("idle")
    setFadeOpacity(0)
    setShowControls(false)
    setShowProgressHint(false)
    workElapsedRef.current = 0 // Reset work elapsed time
  }

  // Calculate progress percentage
  const getProgress = () => {
    if (state === "working") {
      const currentElapsed = Date.now() - startTimeRef.current
      const totalElapsed = workElapsedRef.current + currentElapsed
      return Math.min((totalElapsed / CONFIG.WORK_DURATION) * 100, 100)
    } else if (state === "break") {
      const elapsed = Date.now() - startTimeRef.current
      return Math.min((elapsed / CONFIG.BREAK_DURATION) * 100, 100)
    }
    return 0
  }

  // Setup
  useEffect(() => {
    initStars()
    resizeCanvas()

    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [initStars, resizeCanvas])

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  const getButtonText = () => {
    switch (state) {
      case "idle":
        return "LAUNCH"
      case "workComplete":
        return "TAKE FIVE"
      case "breakComplete":
        return "RETURN TO WARP"
      default:
        return ""
    }
  }

  const handleButtonClick = () => {
    switch (state) {
      case "idle":
        startWork()
        break
      case "workComplete":
        startBreak()
        break
      case "breakComplete":
        returnToIdle()
        break
    }
  }

  const showButton = state === "idle" || state === "workComplete" || state === "breakComplete"
  const showMessage = state === "workComplete"

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ backgroundColor: theme.background }}>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ display: "block" }} />

      {/* Analog Control Panel - Top Right */}
      {state === "working" && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* Controls Toggle */}
          <div
            className="flex items-center gap-2 border px-2 py-1 group relative"
            style={{ 
              backgroundColor: theme.stars,
              borderColor: theme.stars
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
          >
            <span className="font-mono text-xs uppercase opacity-70" style={{ color: theme.background }}>CTRL</span>
            <button
              onClick={() => setControlsVisible(!controlsVisible)}
              className="w-5 h-2 border relative"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.background,
              }}
            >
              <div
                className={`absolute top-0 w-1.5 h-2 transition-all duration-200`}
                style={{
                  backgroundColor: theme.stars,
                  left: controlsVisible ? "10px" : "2px",
                }}
              />
            </button>
            {/* Hover tooltip */}
            <div
              className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y - 30}px`,
                transform: "translate(-50%, 0)",
                fontSize: "9px",
                backgroundColor: theme.stars,
                color: theme.background,
              }}
            >
              SHOW/HIDE CONTROL
            </div>
          </div>

          {/* Progress Toggle */}
          <div
            className="flex items-center gap-2 border px-2 py-1 group relative"
            style={{ 
              backgroundColor: theme.stars,
              borderColor: theme.stars
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
          >
            <span className="font-mono text-xs uppercase opacity-70" style={{ color: theme.background }}>PROG</span>
            <button
              onClick={() => setShowProgress(!showProgress)}
              className="w-5 h-2 border relative"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.background,
              }}
            >
              <div
                className={`absolute top-0 w-1.5 h-2 transition-all duration-200`}
                style={{
                  backgroundColor: theme.stars,
                  left: showProgress ? "10px" : "2px",
                }}
              />
            </button>
            {/* Hover tooltip */}
            <div
              className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y - 30}px`,
                transform: "translate(-50%, 0)",
                fontSize: "9px",
                backgroundColor: theme.stars,
                color: theme.background,
              }}
            >
              SHOW/HIDE PROGRESS BAR
            </div>
          </div>

          {/* Ambient Toggle */}
          <div
            className="flex items-center gap-2 border px-2 py-1 group relative"
            style={{ 
              backgroundColor: theme.stars,
              borderColor: theme.stars
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
          >
            <span className="font-mono text-xs uppercase opacity-70" style={{ color: theme.background }}>AMBT</span>
            <button
              onClick={toggleAmbient}
              className="w-5 h-2 border relative"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.background,
              }}
            >
              <div
                className={`absolute top-0 w-1.5 h-2 transition-all duration-200`}
                style={{
                  backgroundColor: theme.stars,
                  left: ambientEnabled ? "10px" : "2px",
                }}
              />
            </button>
            {/* Hover tooltip */}
            <div
              className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y - 30}px`,
                transform: "translate(-50%, 0)",
                fontSize: "9px",
                backgroundColor: theme.stars,
                color: theme.background,
              }}
            >
              TOGGLE AMBIENT SOUND
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {state === "idle" && (
          <div className="text-center mb-8 px-6">
            <h1 className="text-3xl font-mono font-bold mb-3 tracking-wider" style={{ color: theme.stars }}>
              WARPOMODORO
            </h1>
            <p
              className="text-xs font-mono opacity-70 max-w-md leading-relaxed uppercase mb-6"
              style={{ color: theme.stars }}
            >
              A MINIMAL FOCUS TIMER THAT REPLACES NUMBERS WITH WORDS AND TIME WITH MOTION
            </p>

            {/* Theme Selector */}
            <div className="mb-6">
              <h3 className="text-xs font-mono uppercase mb-3 opacity-70" style={{ color: theme.stars }}>
                FIELDS
              </h3>
              <div className="flex gap-2 justify-center flex-wrap">
                {Object.entries(THEMES).map(([key, themeData]) => (
                  <button
                    key={key}
                    onClick={() => changeTheme(key as ThemeKey)}
                    className="pointer-events-auto px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors duration-200"
                    style={{
                      backgroundColor: currentTheme === key ? theme.stars : "transparent",
                      color: currentTheme === key ? theme.background : theme.stars,
                      border: `1px solid ${theme.stars}`,
                    }}
                  >
                    {themeData.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showMessage && (
          <div
            className="text-2xl font-mono mb-8 transition-opacity duration-1000 uppercase"
            style={{ opacity: fadeOpacity, color: theme.stars }}
          >
            YOU'RE HERE. TAKE FIVE.
          </div>
        )}

        {/* TUNNEL ACTIVE indicator */}
        {state === "working" && showControls && controlsVisible && (
          <div className="font-mono text-sm uppercase mb-4 animate-pulse" style={{ color: theme.stars, opacity: 0.8 }}>
            TUNNEL ACTIVE
          </div>
        )}

        {showButton && (
          <button
            onClick={handleButtonClick}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
            className="pointer-events-auto border px-5 py-2 font-mono text-sm uppercase tracking-wide transition-colors duration-200 relative group"
            style={{
              opacity: state === "workComplete" ? fadeOpacity : 1,
              borderRadius: 0,
              backgroundColor: theme.stars,
              color: theme.background,
              borderColor: theme.stars,
            }}
          >
            {getButtonText()}

            {/* Hover tooltip */}
            {state === "idle" && (
              <div
                className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y - 30}px`,
                  transform: "translate(-50%, 0)",
                  fontSize: "10px",
                  backgroundColor: theme.stars,
                  color: theme.background,
                }}
              >
                BEGIN A 25-MINUTE SESSION
              </div>
            )}
          </button>
        )}

        {/* Session controls - respect visibility toggle */}
        {showControls && state === "working" && controlsVisible && (
          <div
            className="flex gap-4 transition-opacity duration-1000 pointer-events-auto"
            style={{ opacity: showControls ? 1 : 0 }}
          >
            <button
              onClick={takeBreak}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              className="border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors duration-200 relative group"
              style={{
                borderRadius: 0,
                backgroundColor: theme.stars,
                color: theme.background,
                borderColor: theme.stars,
              }}
            >
              SURFACE
              {/* Hover tooltip */}
              <div
                className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y - 30}px`,
                  transform: "translate(-50%, 0)",
                  fontSize: "9px",
                  backgroundColor: theme.stars,
                  color: theme.background,
                }}
              >
                TAKE A SHORT BREAK. YOUR SESSION IS STILL STAY ACTIVE
              </div>
            </button>
            <button
              onClick={endSession}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              className="border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors duration-200 relative group"
              style={{
                borderRadius: 0,
                backgroundColor: theme.stars,
                color: theme.background,
                borderColor: theme.stars,
              }}
            >
              DISENGAGE
              {/* Hover tooltip */}
              <div
                className="absolute font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-xs px-2 py-1"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y - 30}px`,
                  transform: "translate(-50%, 0)",
                  fontSize: "9px",
                  backgroundColor: theme.stars,
                  color: theme.background,
                }}
              >
                END YOUR SESSION EARLY
              </div>
            </button>
          </div>
        )}

        {/* Additional button for break state */}
        {state === "break" && (
          <button
            onClick={resumeWork}
            className="pointer-events-auto border px-6 py-3 font-mono text-sm uppercase tracking-wide transition-colors duration-200 mt-4"
            style={{
              borderRadius: 0,
              backgroundColor: theme.stars,
              color: theme.background,
              borderColor: theme.stars,
            }}
          >
            RESUME SESSION
          </button>
        )}

        {/* Session counter - only show completed sessions */}
        {state === "idle" && completedSessions > 0 && (
          <div className="absolute bottom-8 font-mono text-xs opacity-50 uppercase" style={{ color: theme.stars }}>
            {completedSessions} TUNNEL{completedSessions !== 1 ? "S" : ""} EXITED
          </div>
        )}
      </div>

      {/* Progress bar with timer */}
      {showProgress && (state === "working" || state === "break") && (
        <div className="absolute bottom-0 left-0 right-0">
          {/* Timer display */}
          <div className="absolute -top-8 right-2 font-mono text-sm opacity-80" style={{ color: theme.stars }}>
            {getCurrentTime()}
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-black bg-opacity-50">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${getProgress()}%`,
                backgroundColor: theme.stars,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
