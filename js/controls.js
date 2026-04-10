/**
 * controls.js - Playback controls: rewind button, spacebar, hold-to-rewind
 */

const Controls = (function () {
  // ---- State ----
  let currentYear = 2026;
  let isRewinding = false;
  let rewindInterval = null;
  let holdTimeout = null;
  let rewindStartTime = 0;
  let onYearChange = null; // callback

  // ---- Config ----
  const HOLD_DELAY = 300;         // ms before continuous rewind starts
  const INITIAL_SPEED = 500;      // ms per year at start of hold
  const MIN_SPEED = 80;           // ms per year at max acceleration
  const ACCELERATION_TIME = 8000; // ms to reach max speed

  // ---- DOM refs ----
  let yearDisplay, eraLabel, rewindBtn, forwardBtn, yearSlider, speedIndicator, speedText;

  /**
   * Initialize controls and bind event listeners.
   */
  function init(options) {
    currentYear = options.startYear || 2026;
    onYearChange = options.onYearChange || function () {};

    yearDisplay = document.getElementById('year-display');
    eraLabel = document.getElementById('era-label');
    rewindBtn = document.getElementById('rewind-btn');
    forwardBtn = document.getElementById('forward-btn');
    yearSlider = document.getElementById('year-slider');
    speedIndicator = document.getElementById('speed-indicator');
    speedText = document.getElementById('speed-text');

    // Set slider range
    yearSlider.min = BorderData.getMinYear();
    yearSlider.max = BorderData.getMaxYear();
    yearSlider.value = currentYear;

    updateDisplay();

    // ---- Rewind button: click and hold ----
    rewindBtn.addEventListener('mousedown', handleRewindStart);
    rewindBtn.addEventListener('mouseup', handleRewindStop);
    rewindBtn.addEventListener('mouseleave', handleRewindStop);
    rewindBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleRewindStart();
    });
    rewindBtn.addEventListener('touchend', handleRewindStop);

    // ---- Forward button ----
    forwardBtn.addEventListener('mousedown', handleForwardStart);
    forwardBtn.addEventListener('mouseup', handleForwardStop);
    forwardBtn.addEventListener('mouseleave', handleForwardStop);
    forwardBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleForwardStart();
    });
    forwardBtn.addEventListener('touchend', handleForwardStop);

    // ---- Spacebar ----
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // ---- Year slider ----
    yearSlider.addEventListener('input', handleSliderInput);
  }

  // ---- Rewind logic ----

  function handleRewindStart() {
    if (isRewinding) return;
    // Immediate single step
    stepBack();

    // Start hold timer for continuous rewind
    holdTimeout = setTimeout(function () {
      startContinuousRewind();
    }, HOLD_DELAY);
  }

  function handleRewindStop() {
    clearTimeout(holdTimeout);
    holdTimeout = null;
    stopContinuousRewind();
  }

  function handleForwardStart() {
    // Single step forward
    stepForward();

    holdTimeout = setTimeout(function () {
      startContinuousForward();
    }, HOLD_DELAY);
  }

  function handleForwardStop() {
    clearTimeout(holdTimeout);
    holdTimeout = null;
    stopContinuousRewind();
  }

  function startContinuousRewind() {
    if (isRewinding) return;
    isRewinding = true;
    rewindStartTime = Date.now();
    rewindBtn.classList.add('active');
    yearDisplay.classList.add('rewinding');
    speedIndicator.classList.remove('hidden');

    scheduleNextRewindStep();
  }

  function startContinuousForward() {
    if (isRewinding) return;
    isRewinding = true;
    rewindStartTime = Date.now();
    forwardBtn.classList.add('active');
    speedIndicator.classList.remove('hidden');

    scheduleNextForwardStep();
  }

  function scheduleNextRewindStep() {
    if (!isRewinding) return;
    const speed = getCurrentSpeed();
    updateSpeedDisplay(speed);

    rewindInterval = setTimeout(function () {
      stepBack();
      if (isRewinding && currentYear > BorderData.getMinYear()) {
        scheduleNextRewindStep();
      } else {
        stopContinuousRewind();
      }
    }, speed);
  }

  function scheduleNextForwardStep() {
    if (!isRewinding) return;
    const speed = getCurrentSpeed();
    updateSpeedDisplay(speed);

    rewindInterval = setTimeout(function () {
      stepForward();
      if (isRewinding && currentYear < BorderData.getMaxYear()) {
        scheduleNextForwardStep();
      } else {
        stopContinuousRewind();
      }
    }, speed);
  }

  function stopContinuousRewind() {
    isRewinding = false;
    clearTimeout(rewindInterval);
    rewindInterval = null;
    rewindBtn.classList.remove('active');
    forwardBtn.classList.remove('active');
    yearDisplay.classList.remove('rewinding');
    speedIndicator.classList.add('hidden');
  }

  /**
   * Calculate current rewind speed based on how long the button has been held.
   * Accelerates from INITIAL_SPEED to MIN_SPEED over ACCELERATION_TIME.
   */
  function getCurrentSpeed() {
    const elapsed = Date.now() - rewindStartTime;
    const progress = Math.min(elapsed / ACCELERATION_TIME, 1);
    // Ease-out curve for smooth acceleration
    const eased = 1 - Math.pow(1 - progress, 2);
    return INITIAL_SPEED - eased * (INITIAL_SPEED - MIN_SPEED);
  }

  function updateSpeedDisplay(speed) {
    const multiplier = Math.round(INITIAL_SPEED / speed);
    speedText.textContent = multiplier + 'x';
  }

  // ---- Step functions ----

  function stepBack() {
    if (currentYear > BorderData.getMinYear()) {
      currentYear--;
      updateDisplay();
      onYearChange(currentYear);
    }
  }

  function stepForward() {
    if (currentYear < BorderData.getMaxYear()) {
      currentYear++;
      updateDisplay();
      onYearChange(currentYear);
    }
  }

  // ---- Keyboard handling ----

  function handleKeyDown(event) {
    if (event.code !== 'Space' && event.key !== ' ') return;
    event.preventDefault();

    if (event.repeat) {
      // Key is being held - start continuous if not already
      if (!isRewinding) {
        startContinuousRewind();
      }
      return;
    }

    // First press - single step back
    stepBack();

    // Set up hold detection
    holdTimeout = setTimeout(function () {
      startContinuousRewind();
    }, HOLD_DELAY);
  }

  function handleKeyUp(event) {
    if (event.code !== 'Space' && event.key !== ' ') return;
    event.preventDefault();
    clearTimeout(holdTimeout);
    holdTimeout = null;
    stopContinuousRewind();
  }

  // ---- Slider ----

  function handleSliderInput() {
    currentYear = parseInt(yearSlider.value, 10);
    updateDisplay();
    onYearChange(currentYear);
  }

  // ---- Display updates ----

  function updateDisplay() {
    const displayYear = currentYear < 0 ? Math.abs(currentYear) + ' BCE' : currentYear;
    yearDisplay.textContent = displayYear;
    yearSlider.value = currentYear;

    // Era label
    if (currentYear < 0) {
      eraLabel.textContent = 'Ancient World';
    } else if (currentYear < 500) {
      eraLabel.textContent = 'Classical Antiquity';
    } else if (currentYear < 1500) {
      eraLabel.textContent = 'Medieval Period';
    } else if (currentYear < 1800) {
      eraLabel.textContent = 'Early Modern Period';
    } else if (currentYear < 1914) {
      eraLabel.textContent = 'Age of Empires';
    } else if (currentYear < 1945) {
      eraLabel.textContent = 'World Wars Era';
    } else if (currentYear < 1991) {
      eraLabel.textContent = 'Cold War Era';
    } else {
      eraLabel.textContent = 'Modern Era';
    }
  }

  /**
   * Set the year programmatically.
   */
  function setYear(year) {
    currentYear = year;
    updateDisplay();
  }

  function getYear() {
    return currentYear;
  }

  return {
    init,
    setYear,
    getYear
  };
})();
