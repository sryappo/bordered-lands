/**
 * controls.js - Playback controls: rewind button, spacebar, hold-to-rewind
 */

var Controls = (function () {
  // ---- State ----
  var currentYear = 2026;
  var isRewinding = false;
  var rewindInterval = null;
  var holdTimeout = null;
  var rewindStartTime = 0;
  var onYearChange = null; // callback
  var rewindDirection = -1; // -1 = back, +1 = forward

  // ---- Config ----
  var HOLD_DELAY = 300;         // ms before continuous rewind starts
  var INITIAL_SPEED = 500;      // ms per year at start of hold
  var MIN_SPEED = 80;           // ms per year at max acceleration
  var ACCELERATION_TIME = 8000; // ms to reach max speed

  // ---- DOM refs ----
  var yearDisplay, eraLabel, rewindBtn, forwardBtn, yearSlider;
  var speedIndicator, speedText;

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
    rewindBtn.addEventListener('mouseup', handleStop);
    rewindBtn.addEventListener('mouseleave', handleStop);
    rewindBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleRewindStart();
    });
    rewindBtn.addEventListener('touchend', handleStop);

    // ---- Forward button ----
    forwardBtn.addEventListener('mousedown', handleForwardStart);
    forwardBtn.addEventListener('mouseup', handleStop);
    forwardBtn.addEventListener('mouseleave', handleStop);
    forwardBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleForwardStart();
    });
    forwardBtn.addEventListener('touchend', handleStop);

    // ---- Spacebar ----
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // ---- Year slider ----
    yearSlider.addEventListener('input', handleSliderInput);
  }

  // ---- Rewind / Forward logic ----

  function handleRewindStart() {
    if (isRewinding) return;
    rewindDirection = -1;
    stepYear(-1);
    holdTimeout = setTimeout(function () {
      startContinuous(-1);
    }, HOLD_DELAY);
  }

  function handleForwardStart() {
    if (isRewinding) return;
    rewindDirection = 1;
    stepYear(1);
    holdTimeout = setTimeout(function () {
      startContinuous(1);
    }, HOLD_DELAY);
  }

  function handleStop() {
    clearTimeout(holdTimeout);
    holdTimeout = null;
    stopContinuous();
  }

  function startContinuous(direction) {
    if (isRewinding) return;
    isRewinding = true;
    rewindDirection = direction;
    rewindStartTime = Date.now();

    if (direction === -1) {
      rewindBtn.classList.add('active');
      yearDisplay.classList.add('rewinding');
    } else {
      forwardBtn.classList.add('active');
    }
    speedIndicator.classList.remove('hidden');

    scheduleNextStep();
  }

  function scheduleNextStep() {
    if (!isRewinding) return;
    var speed = getCurrentSpeed();
    updateSpeedDisplay(speed);

    rewindInterval = setTimeout(function () {
      stepYear(rewindDirection);
      var minY = BorderData.getMinYear();
      var maxY = BorderData.getMaxYear();
      if (isRewinding && currentYear > minY && currentYear < maxY) {
        scheduleNextStep();
      } else {
        stopContinuous();
      }
    }, speed);
  }

  function stopContinuous() {
    isRewinding = false;
    clearTimeout(rewindInterval);
    rewindInterval = null;
    rewindBtn.classList.remove('active');
    forwardBtn.classList.remove('active');
    yearDisplay.classList.remove('rewinding');
    speedIndicator.classList.add('hidden');
  }

  /**
   * Calculate current speed based on how long the button has been held.
   * Accelerates from INITIAL_SPEED to MIN_SPEED over ACCELERATION_TIME.
   */
  function getCurrentSpeed() {
    var elapsed = Date.now() - rewindStartTime;
    var progress = Math.min(elapsed / ACCELERATION_TIME, 1);
    var eased = 1 - Math.pow(1 - progress, 2);
    return INITIAL_SPEED - eased * (INITIAL_SPEED - MIN_SPEED);
  }

  function updateSpeedDisplay(speed) {
    var multiplier = Math.round(INITIAL_SPEED / speed);
    speedText.textContent = multiplier + 'x';
  }

  // ---- Step function ----

  function stepYear(direction) {
    var minY = BorderData.getMinYear();
    var maxY = BorderData.getMaxYear();
    var next = currentYear + direction;
    if (next >= minY && next <= maxY) {
      currentYear = next;
      updateDisplay();
      onYearChange(currentYear);
    }
  }

  // ---- Keyboard handling ----

  function handleKeyDown(event) {
    if (event.code !== 'Space' && event.key !== ' ') return;
    // Don't capture space when user is interacting with the slider or other inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') return;
    event.preventDefault();

    if (event.repeat) {
      if (!isRewinding) {
        startContinuous(-1);
      }
      return;
    }

    // First press - single step back
    stepYear(-1);
    holdTimeout = setTimeout(function () {
      startContinuous(-1);
    }, HOLD_DELAY);
  }

  function handleKeyUp(event) {
    if (event.code !== 'Space' && event.key !== ' ') return;
    event.preventDefault();
    clearTimeout(holdTimeout);
    holdTimeout = null;
    stopContinuous();
  }

  // ---- Slider ----

  function handleSliderInput() {
    currentYear = parseInt(yearSlider.value, 10);
    updateDisplay();
    onYearChange(currentYear);
  }

  // ---- Display updates ----

  function updateDisplay() {
    var displayYear;
    if (currentYear < 0) {
      displayYear = Math.abs(currentYear) + ' BCE';
    } else {
      displayYear = String(currentYear);
    }
    yearDisplay.textContent = displayYear;
    yearSlider.value = currentYear;

    // Era label
    if (currentYear < -1000) {
      eraLabel.textContent = 'Ancient World';
    } else if (currentYear < 0) {
      eraLabel.textContent = 'Classical Antiquity';
    } else if (currentYear < 500) {
      eraLabel.textContent = 'Late Antiquity';
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
    init: init,
    setYear: setYear,
    getYear: getYear
  };
})();
