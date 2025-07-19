document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-timer');
    const resetBtn = document.getElementById('reset-timer');
    const countdownDisplay = document.getElementById('countdown');
    const timerLabel = document.querySelector('.timer-label');
    const writingArea = document.getElementById('writing-area');
    const starContainer = document.getElementById('star-container');

    const infoIcon = document.getElementById('info-icon');
    const statsPopup = document.getElementById('stats-popup');
    const statWords = document.getElementById('stat-words');
    const statChars = document.getElementById('stat-chars');
    const statParagraphs = document.getElementById('stat-paragraphs');
    const statPages = document.getElementById('stat-pages');

    const wordGoalInput = document.getElementById('word-goal');
    const goalDisplay = document.getElementById('goal-display');
    const sprintLogUl = document.getElementById('sprint-log');
    const sprintStreakSpan = document.getElementById('sprint-streak');
    const promptGenreSelect = document.getElementById('prompt-genre-select');
    const generatePromptBtn = document.getElementById('generate-prompt');
    const currentPromptDisplay = document.getElementById('current-prompt');
    const copyTextBtn = document.getElementById('copy-text');
    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');

    // Customizable Durations
    const writingDurationInput = document.getElementById('writing-duration');
    const shortBreakDurationInput = document.getElementById('short-break-duration');
    const longBreakDurationInput = document.getElementById('long-break-duration');

    // Word Goal Progress Bar
    const goalProgressBar = document.getElementById('goal-progress-bar');

    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Notification Sounds
    const sprintEndSound = document.getElementById('sprint-end-sound');
    const breakEndSound = document.getElementById('break-end-sound');
    const goalAchievedSound = document.getElementById('goal-achieved-sound');

    // Congratulations Modal Elements
    const goalReachedModal = document.getElementById('goal-reached-modal');
    const achievedGoalWordsSpan = document.getElementById('achieved-goal-words');
    const keepWritingBtn = document.getElementById('keep-writing-btn');
    const doneForDayBtn = document.getElementById('done-for-day-btn');

    let timer;
    let timeLeft;
    let isWritingTime = true;
    let pomodoroCycles = 0;
    let sprintStartTime; // Not currently used but kept for potential future use
    let goalAchievedThisSprint = false; // Flag to ensure popup only shows once per sprint goal achievement
    let lastWordsCount = 0; // To track words from the previous input, for detecting threshold crossing

    // Initial values for timer durations (can be overridden by user input)
    let WRITING_TIME = (parseInt(writingDurationInput.value) || 25) * 60;
    let BREAK_TIME = (parseInt(shortBreakDurationInput.value) || 5) * 60;
    let LONG_BREAK_TIME = (parseInt(longBreakDurationInput.value) || 15) * 60;

    // --- Star System Constants ---
    const WORDS_PER_SMALL_STAR = 100;
    const MAX_SMALL_STARS = 4;
    const WORDS_PER_LARGE_GOLD_STAR_UNIT = 500;
    const MAX_LARGE_GOLD_STARS = 10;
    const WORDS_FOR_FIRST_PLATINUM_STAR = 5000;
    const WORDS_PER_ADDITIONAL_PLATINUM_STAR = 1000;
    const MAX_PLATINUM_STARS = 10;

    const WORDS_PER_PAGE = 250;

    // --- Prompts Data ---
    const prompts = {
        general: [
            "Write about a sudden, unexpected journey.",
            "Describe your perfect day, from waking up to going to bed.",
            "A character finds a mysterious, old key. What does it unlock?",
            "Start a story with: 'The old lighthouse keeper knew something was coming...'",
            "Write a dialogue between two unlikely friends.",
            "What if gravity stopped working for an hour?",
            "Describe the taste of a forgotten memory.",
            "A message in a bottle washes ashore. What does it say?"
        ],
        fantasy: [
            "A dragon awakens after a thousand-year sleep, but the world has changed.",
            "Write about a magical artifact that grants wishes, but with a twist.",
            "A reluctant hero discovers they have an ancient, forgotten power.",
            "Explore a hidden forest where trees can speak.",
            "What happens when the elves and dwarves decide to unite?"
        ],
        'sci-fi': [
            "Humanity discovers an alien signal, but it's a warning, not a greeting.",
            "Life on a space station when the oxygen begins to run out.",
            "Robots develop emotions. How does society react?",
            "A time traveler accidentally alters a minor historical event with major consequences.",
            "Explore a dystopian future where dreams are controlled."
        ],
        mystery: [
            "A detective is called to a seemingly impossible locked-room murder.",
            "Someone is leaving cryptic notes around town. What do they mean?",
            "The disappearance of a famous artist's masterpiece rocks the art world.",
            "Write about a cold case that suddenly gets a new lead.",
            "Everyone at the dinner party has a secret; one of them is deadly."
        ],
        romance: [
            "Two rivals in a baking competition find an unexpected connection.",
            "They hated each other in high school, but now they're stuck together on a road trip.",
            "A love letter found in an antique book leads to a modern-day romance.",
            "Write about a first date that goes hilariously wrong, but perfectly right.",
            "They meet under the most unusual circumstances, and it's love at first sight... almost."
        ]
    };

    // --- Flow State & Nudge Variables (NEW) ---
    let lastTypingTime = Date.now();
    let typingTimeout; // For detecting long pauses/distraction
    let totalKeyStrokesInInterval = 0;
    let totalTimeInInterval = 0; // In milliseconds
    let backspacesInInterval = 0;
    let flowCheckInterval; // Interval for periodically checking flow state
    let flowNudgeTimeout; // Timeout for hiding the nudge message

    // Constants for Flow Detection (Adjust these values based on your preference)
    const FLOW_WPM_THRESHOLD = 30; // Words Per Minute to be considered in flow
    const FLOW_BACKSPACE_RATIO_THRESHOLD = 0.1; // Max backspaces per character for flow (e.g., 0.1 = 1 backspace per 10 chars)
    const FLOW_PAUSE_THRESHOLD_MS = 3000; // Max pause (ms) before flow might break
    const DISTRACTION_PAUSE_THRESHOLD_MS = 10000; // Longer pause (ms) indicates distraction
    const FLOW_ANALYSIS_INTERVAL_MS = 2000; // How often to analyze typing data (every 2 seconds)
    const NUDGE_DISPLAY_TIME_MS = 4000; // How long the nudge message stays visible

    // Nudge Message Element (NEW)
    const flowNudgeMessage = document.createElement('div');
    flowNudgeMessage.id = 'flow-nudge-message';
    document.body.appendChild(flowNudgeMessage);

    // --- Timer Functions ---
    function updateTimerDisplay() {
        countdownDisplay.textContent = formatTime(timeLeft);
    }

    function startTimer() {
        if (timer) return; // Prevent multiple timers

        if (isWritingTime) {
            lastWordsCount = countWords(); // Get current words as starting point for this sprint
            goalAchievedThisSprint = false; // Reset goal flag for new sprint
            lastTypingTime = Date.now(); // Initialize for flow detection
            totalKeyStrokesInInterval = 0; // Reset metrics for new interval
            totalTimeInInterval = 0;
            backspacesInInterval = 0;

            // Start the periodic flow check only when timer starts and it's writing time
            if (!flowCheckInterval) {
                flowCheckInterval = setInterval(analyzeTypingPatterns, FLOW_ANALYSIS_INTERVAL_MS);
            }
        }

        // Update timer durations from inputs when starting
        WRITING_TIME = (parseInt(writingDurationInput.value) || 25) * 60;
        BREAK_TIME = (parseInt(shortBreakDurationInput.value) || 5) * 60;
        LONG_BREAK_TIME = (parseInt(longBreakDurationInput.value) || 15) * 60;

        timeLeft = isWritingTime ? WRITING_TIME : (pomodoroCycles % 4 === 0 && pomodoroCycles > 0 ? LONG_BREAK_TIME : BREAK_TIME);
        updateTimerDisplay();

        startBtn.textContent = "Pause Sprint"; // Change button text
        timer = setInterval(countdown, 1000);
        writingArea.focus(); // Focus on writing area when timer starts
        applyUICues('neutral'); // Ensure neutral state initially or re-evaluate
    }

    function pauseTimer() {
        clearInterval(timer);
        timer = null;
        startBtn.textContent = "Resume Sprint"; // Change button text
        // When pausing, stop flow analysis and reset cues
        clearInterval(flowCheckInterval);
        clearTimeout(typingTimeout);
        flowCheckInterval = null; // Clear interval ID
        applyUICues('neutral'); // Reset UI cues
        hideFlowNudge(); // Hide any nudges
    }

    function resetTimer() {
        clearInterval(timer);
        timer = null;
        isWritingTime = true;
        pomodoroCycles = 0;
        goalAchievedThisSprint = false; // Reset goal flag on full reset
        lastWordsCount = 0; // Reset lastWordsCount on full reset

        // Reset flow state variables
        clearInterval(flowCheckInterval);
        clearTimeout(typingTimeout);
        clearTimeout(flowNudgeTimeout);
        flowCheckInterval = null; // Clear interval ID
        totalKeyStrokesInInterval = 0;
        totalTimeInInterval = 0;
        backspacesInInterval = 0;
        lastTypingTime = Date.now(); // Reset last typing time
        applyUICues('neutral'); // Reset UI cues
        hideFlowNudge(); // Hide any nudges

        // Reset timeLeft to the current writing duration input value
        timeLeft = (parseInt(writingDurationInput.value) || 25) * 60;

        updateTimerDisplay();
        timerLabel.textContent = "Writing Time";
        startBtn.textContent = "Start Sprint";
        writingArea.value = ''; // Clear writing area
        saveWriting(); // Save cleared state
        updateStatsDisplay(); // Update stats after clearing
        updateStarsDisplay(); // Update stars after clearing
    }

    function countdown() {
        if (timeLeft <= 0) {
            clearInterval(timer);
            timer = null;
            logSprint(); // Log sprint before switching context
            // Stop flow analysis when sprint ends
            clearInterval(flowCheckInterval);
            clearTimeout(typingTimeout);
            flowCheckInterval = null; // Clear interval ID
            applyUICues('neutral'); // Reset UI cues
            hideFlowNudge(); // Hide any nudges

            if (isWritingTime) {
                sprintEndSound.play(); // Play sprint end sound
                pomodoroCycles++;
                isWritingTime = false;
                timerLabel.textContent = (pomodoroCycles % 4 === 0) ? "Long Break Time" : "Short Break Time";
                timeLeft = (pomodoroCycles % 4 === 0) ? LONG_BREAK_TIME : BREAK_TIME;
            } else {
                breakEndSound.play(); // Play break end sound
                isWritingTime = true;
                timerLabel.textContent = "Writing Time";
                timeLeft = WRITING_TIME;
            }
            startTimer(); // Automatically start next phase
        } else {
            timeLeft--;
            updateTimerDisplay();
        }
    }

    // --- Utility Functions ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function countWords() {
        const text = writingArea.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }

    function countCharacters() {
        return writingArea.value.length;
    }

    function countParagraphs() {
        const text = writingArea.value.trim();
        if (text === '') return 0;
        const paragraphs = text.split(/\n+/).filter(para => para.trim().length > 0);
        return paragraphs.length;
    }

    function calculatePages(words) {
        if (words === 0) return 0;
        return (words / WORDS_PER_PAGE).toFixed(2);
    }

    // --- updateStatsDisplay ---
    function updateStatsDisplay() {
        const words = countWords();
        const chars = countCharacters();
        const paragraphs = countParagraphs();
        const pages = calculatePages(words);
        const goal = parseInt(wordGoalInput.value) || 0;

        statWords.textContent = words;
        statChars.textContent = chars;
        statParagraphs.textContent = paragraphs;
        statPages.textContent = pages;
        goalDisplay.textContent = goal;

        // Update Word Goal Progress Bar
        if (goal > 0) {
            const progressPercentage = Math.min((words / goal) * 100, 100);
            goalProgressBar.style.width = `${progressPercentage}%`;
        } else {
            goalProgressBar.style.width = '0%';
        }

        // Logic for Goal Achievement:
        // Trigger only if current words meet/exceed goal AND previous count was below goal
        // AND the goal hasn't already been achieved in this specific sprint.
        if (words >= goal && goal > 0 && lastWordsCount < goal && !goalAchievedThisSprint) {
            goalAchievedThisSprint = true; // Set flag to true to prevent multiple popups for this sprint
            showGoalReachedModal(goal);
        }

        // Always update lastWordsCount for the next input event
        lastWordsCount = words;
    }

    // --- updateStarsDisplay ---
    function updateStarsDisplay() {
        starContainer.innerHTML = ''; // Clear existing stars
        const totalWords = countWords();

        let numPlatinumStars = 0;
        let numLargeGoldStars = 0;
        let numSmallStars = 0;

        if (totalWords >= WORDS_FOR_FIRST_PLATINUM_STAR) {
            numPlatinumStars = Math.floor((totalWords - WORDS_FOR_FIRST_PLATINUM_STAR) / WORDS_PER_ADDITIONAL_PLATINUM_STAR) + 1;
            numPlatinumStars = Math.min(numPlatinumStars, MAX_PLATINUM_STARS);

            for (let i = 0; i < numPlatinumStars; i++) {
                const platinumStar = document.createElement('span');
                platinumStar.classList.add('platinum-star');
                platinumStar.textContent = '🌟';
                starContainer.appendChild(platinumStar);
            }
        } else {
            numLargeGoldStars = Math.floor(totalWords / WORDS_PER_LARGE_GOLD_STAR_UNIT);
            numLargeGoldStars = Math.min(numLargeGoldStars, MAX_LARGE_GOLD_STARS);

            if (numLargeGoldStars > 0) {
                for (let i = 0; i < numLargeGoldStars; i++) {
                    const goldStar = document.createElement('span');
                    goldStar.classList.add('gold-star');
                    goldStar.textContent = '⭐';
                    starContainer.appendChild(goldStar);
                }
            } else {
                numSmallStars = Math.floor(totalWords / WORDS_PER_SMALL_STAR);
                numSmallStars = Math.min(numSmallStars, MAX_SMALL_STARS);

                for (let i = 0; i < numSmallStars; i++) {
                    const star = document.createElement('span');
                    star.classList.add('star');
                    star.textContent = '⭐';
                    starContainer.appendChild(star);
                }
            }
        }
    }

    // --- Local Storage Functions ---
    function saveWriting() {
        localStorage.setItem('nexusSprintsWriting', writingArea.value);
    }

    function loadWriting() {
        const savedWriting = localStorage.getItem('nexusSprintsWriting');
        if (savedWriting) {
            writingArea.value = savedWriting;
            // updateStatsDisplay() is now called later in DOMContentLoaded, after lastWordsCount is set up.
            updateStarsDisplay(); // Still needed here for initial load of stars
        }
    }

    function saveSprintLog() {
        const logEntries = [];
        sprintLogUl.querySelectorAll('li').forEach(li => {
            logEntries.push(li.textContent);
        });
        localStorage.setItem('nexusSprintsLog', JSON.stringify(logEntries));
    }

    function loadSprintLog() {
        const savedLog = localStorage.getItem('nexusSprintsLog');
        if (savedLog) {
            const logEntries = JSON.parse(savedLog);
            logEntries.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = entry;
                sprintLogUl.prepend(li);
            });
        }
    }

    function saveSprintStreak() {
        const streakData = {
            streak: parseInt(sprintStreakSpan.textContent),
            lastSprintDate: localStorage.getItem('nexusSprintsLastDate')
        };
        localStorage.setItem('nexusSprintsStreak', JSON.stringify(streakData));
    }

    function loadSprintStreak() {
        const streakData = JSON.parse(localStorage.getItem('nexusSprintsStreak') || '{}');
        const lastDateStr = streakData.lastSprintDate;
        const streak = streakData.streak || 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastDateStr) {
            const lastSprintDate = new Date(lastDateStr);
            lastSprintDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - lastSprintDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                sprintStreakSpan.textContent = streak;
            } else if (diffDays > 1) {
                sprintStreakSpan.textContent = 0;
            } else {
                sprintStreakSpan.textContent = streak;
            }
        } else {
            sprintStreakSpan.textContent = 0;
        }
    }

    // --- Dark Mode Functions ---
    function applyDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    function saveDarkModePreference(isDark) {
        localStorage.setItem('nexusSprintsDarkMode', isDark);
    }

    function loadDarkModePreference() {
        const isDark = localStorage.getItem('nexusSprintsDarkMode') === 'true';
        applyDarkMode(isDark);
        // Update button text / icon based on loaded preference
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
    }

    // --- Goal Reached Modal Functions ---
    function showGoalReachedModal(goal) {
        achievedGoalWordsSpan.textContent = goal;
        goalReachedModal.classList.add('show');
        goalAchievedSound.play();
        // Optionally pause timer when goal is reached
        if (timer) {
            pauseTimer();
        }
    }

    function hideGoalReachedModal() {
        goalReachedModal.classList.remove('show');
    }

    function logSprint() {
        // Calculate duration based on time spent, not remaining
        const durationSeconds = isWritingTime ? (WRITING_TIME - timeLeft) : (BREAK_TIME - timeLeft);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const words = countWords();
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const li = document.createElement('li');
        li.textContent = `${date} ${time}: ${words} words (${minutes}m ${seconds}s)`;
        sprintLogUl.prepend(li);
        saveSprintLog();

        const currentStreak = parseInt(sprintStreakSpan.textContent);
        const lastDateStr = localStorage.getItem('nexusSprintsLastDate');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!lastDateStr) {
            sprintStreakSpan.textContent = 1;
        } else {
            const lastSprintDate = new Date(lastDateStr);
            lastSprintDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - lastSprintDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) { // If it's the next day
                sprintStreakSpan.textContent = currentStreak + 1;
            } else if (diffDays > 1) { // If more than one day passed, reset streak
                sprintStreakSpan.textContent = 1;
            }
            // If diffDays is 0 (same day), streak remains unchanged
        }
        localStorage.setItem('nexusSprintsLastDate', today.toISOString());
        saveSprintStreak();
    }

    // --- Flow State Functions (NEW) ---
    function updateFlowState() {
        const now = Date.now();

        // Clear any existing distraction timeouts
        clearTimeout(typingTimeout);

        // Set a new timeout to detect a long pause / potential distraction
        typingTimeout = setTimeout(() => {
            if (timer && isWritingTime) { // Only check if sprint is active and it's writing time
                applyUICues('distraction');
                showFlowNudge("You've paused for a bit. Let's get back in the flow!");
            }
        }, DISTRACTION_PAUSE_THRESHOLD_MS);

        // The periodic analyzeTypingPatterns will handle transitioning back to flow or neutral
    }

    function analyzeTypingPatterns() {
        const now = Date.now();
        const intervalDuration = FLOW_ANALYSIS_INTERVAL_MS; // Use the interval duration for calculation

        if (totalTimeInInterval === 0 && totalKeyStrokesInInterval > 0) {
             // Handle the first interval where totalTimeInInterval might still be 0 but keys were pressed
             totalTimeInInterval = now - (lastTypingTime - intervalDuration); // Estimate time based on interval
        } else if (totalTimeInInterval === 0) {
            // No keys typed in the interval, so no time to calculate WPM
            // This prevents division by zero if no typing occurred
        }

        let currentWPM = 0;
        let currentBackspaceRatio = 0;

        // Calculate WPM and backspace ratio for the current interval
        if (totalTimeInInterval > 0 && totalKeyStrokesInInterval > 0) {
            // WPM: (characters / 5) / (minutes)
            currentWPM = (totalKeyStrokesInInterval / 5) / (totalTimeInInterval / 60000);
            currentBackspaceRatio = backspacesInInterval / totalKeyStrokesInInterval;
        }

        const currentPauseTime = now - lastTypingTime; // Time since last key press

        let isCurrentlyInFlow = false;
        if (timer && isWritingTime) { // Only consider flow if sprint is active and it's writing time
            if (currentWPM >= FLOW_WPM_THRESHOLD &&
                currentBackspaceRatio <= FLOW_BACKSPACE_RATIO_THRESHOLD &&
                currentPauseTime <= FLOW_PAUSE_THRESHOLD_MS) {
                isCurrentlyInFlow = true;
            }
        }

        // Apply visual cues based on detected state
        if (isCurrentlyInFlow) {
            applyUICues('flow');
        } else if (currentPauseTime > FLOW_PAUSE_THRESHOLD_MS && timer && isWritingTime) {
            // If not in flow due to a pause (and sprint is active), apply distraction cues
            applyUICues('distraction');
        } else {
            // If typing is happening but not meeting flow thresholds, or timer is paused/off-sprint
            applyUICues('neutral');
        }

        // Reset metrics for the next interval
        totalKeyStrokesInInterval = 0;
        totalTimeInInterval = 0;
        backspacesInInterval = 0;
    }

    function applyUICues(state) {
        // Remove all state classes first
        document.body.classList.remove('flow-mode', 'distraction-mode');

        if (state === 'flow') {
            document.body.classList.add('flow-mode');
            hideFlowNudge(); // Always hide nudge when in flow
        } else if (state === 'distraction') {
            // Add distraction mode but only show nudge if user isn't in another tab already
            document.body.classList.add('distraction-mode');
            // Nudge is shown via updateFlowState or window.blur directly
        }
        // If state is 'neutral', no class is added, effectively removing previous ones.
    }

    function showFlowNudge(message) {
        flowNudgeMessage.textContent = message;
        flowNudgeMessage.classList.add('show');
        clearTimeout(flowNudgeTimeout); // Clear previous timeout if a new nudge appears
        flowNudgeTimeout = setTimeout(() => {
            hideFlowNudge();
        }, NUDGE_DISPLAY_TIME_MS);
    }

    function hideFlowNudge() {
        flowNudgeMessage.classList.remove('show');
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', () => {
        if (timer) { // If timer is running, pause it
            pauseTimer();
        } else { // If timer is paused or not started, start/resume it
            startTimer();
        }
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the sprint? Your current writing will be cleared.')) {
            resetTimer();
        }
    });

    writingArea.addEventListener('input', (event) => {
        saveWriting();
        updateStatsDisplay();
        updateStarsDisplay();

        // Flow State Tracking (Accumulate metrics)
        const now = Date.now();
        if (lastTypingTime) {
            totalTimeInInterval += (now - lastTypingTime); // Accumulate time since last key
        }
        lastTypingTime = now; // Update last key press time

        totalKeyStrokesInInterval++;
        if (event.inputType === 'deleteContentBackward') {
            backspacesInInterval++;
        }
        updateFlowState(); // Trigger immediate flow state check based on pause time
    });

    // Add window blur/focus listeners for more robust distraction detection (NEW)
    window.addEventListener('blur', () => {
        if (timer && isWritingTime) { // Only if a sprint is active and it's writing time
            applyUICues('distraction');
            showFlowNudge("Focus lost! Get back to your sprint.");
        }
    });

    window.addEventListener('focus', () => {
        if (timer && isWritingTime) { // Only if a sprint is active and it's writing time
            // When focus returns, re-evaluate flow state based on current typing.
            // A short delay might be good to allow user to re-engage.
            setTimeout(() => {
                analyzeTypingPatterns(); // Re-evaluate immediately
            }, 500);
        }
    });

    // Event listeners for customizable duration inputs
    writingDurationInput.addEventListener('change', () => {
        WRITING_TIME = (parseInt(writingDurationInput.value) || 25) * 60;
        if (!timer && isWritingTime) { // Only update if timer is not running and it's writing time
            timeLeft = WRITING_TIME;
            updateTimerDisplay();
        }
    });
    shortBreakDurationInput.addEventListener('change', () => {
        BREAK_TIME = (parseInt(shortBreakDurationInput.value) || 5) * 60;
    });
    longBreakDurationInput.addEventListener('change', () => {
        LONG_BREAK_TIME = (parseInt(longBreakDurationInput.value) || 15) * 60;
    });

    infoIcon.addEventListener('click', () => {
        statsPopup.classList.toggle('show');
        if (statsPopup.classList.contains('show')) {
            updateStatsDisplay();
        }
    });

    generatePromptBtn.addEventListener('click', () => {
        const genre = promptGenreSelect.value;
        const genrePrompts = prompts[genre];
        if (genrePrompts && genrePrompts.length > 0) {
            const randomIndex = Math.floor(Math.random() * genrePrompts.length);
            currentPromptDisplay.textContent = genrePrompts[randomIndex];
        } else {
            currentPromptDisplay.textContent = "No prompts available for this genre.";
        }
    });

    copyTextBtn.addEventListener('click', () => {
        writingArea.select();
        try {
            document.execCommand('copy');
            alert('Text copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text. Please select and copy manually.');
        }
        window.getSelection().removeAllRanges();
    });

    fullscreenToggleBtn.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                alert('Fullscreen mode could not be activated.');
            });
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            document.body.classList.add('fullscreen');
        } else {
            document.body.classList.remove('fullscreen');
        }
    });

    // Dark Mode Toggle Listener
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        applyDarkMode(!isDark);
        saveDarkModePreference(!isDark);
        darkModeToggle.innerHTML = !isDark ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
    });

    // Modal Button Event Listeners
    keepWritingBtn.addEventListener('click', () => {
        hideGoalReachedModal();
        if (!timer) { // If timer was paused by goal, resume it
            startTimer();
        }
        writingArea.focus(); // Keep focus on writing area
    });

    doneForDayBtn.addEventListener('click', () => {
        hideGoalReachedModal();
        if (timer) {
            pauseTimer(); // Pause the timer if it's running
        }
        // Optionally, you might want to reset the sprint fully here or just leave it paused.
        alert("Great job reaching your goal! Feel free to reset the timer if you're done for the day.");
    });


    // --- Initial Setup ---
    loadWriting(); // This will load the text but NOT call updateStatsDisplay yet.
    loadSprintLog();
    loadSprintStreak();
    loadDarkModePreference(); // Load dark mode preference on start

    // Set initial lastWordsCount after text is loaded, to prevent immediate goal popup
    lastWordsCount = countWords();
    const initialWords = countWords();
    const initialGoal = parseInt(wordGoalInput.value) || 0;

    // If goal is already met on load, set goalAchievedThisSprint to true
    // so it doesn't pop up until the next sprint or reset.
    if (initialWords >= initialGoal && initialGoal > 0) {
        goalAchievedThisSprint = true;
    } else {
        goalAchievedThisSprint = false; // Ensure it's false if goal isn't met on load
    }

    resetTimer(); // Initialize timer display and stats (will call updateStatsDisplay for the initial display)
});