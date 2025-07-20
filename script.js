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

    // --- Star Image Paths (YOU CAN CHANGE THESE!) ---
    // Make sure these image files exist in an 'images' folder relative to your index.html
    const SMALL_STAR_IMAGE_PATH = 'images/silver-star.png'; // Example: create an 'images' folder and put small_star.png there
    const GOLD_STAR_IMAGE_PATH = 'images/gold-star.png';   // Example: create an 'images' folder and put gold_star.png there
    const PLATINUM_STAR_IMAGE_PATH = 'images/diamond-star.png'; // Example: create an 'images' folder and put platinum_star.png there


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
        // Count paragraphs by splitting on one or more newlines, then filtering out empty strings
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
                const platinumStar = document.createElement('img'); // Changed to img
                platinumStar.src = PLATINUM_STAR_IMAGE_PATH; // Set source
                platinumStar.alt = 'Platinum Star'; // Set alt text
                platinumStar.classList.add('platinum-star-image'); // Add specific class for styling
                starContainer.appendChild(platinumStar);
            }
        } else {
            numLargeGoldStars = Math.floor(totalWords / WORDS_PER_LARGE_GOLD_STAR_UNIT);
            numLargeGoldStars = Math.min(numLargeGoldStars, MAX_LARGE_GOLD_STARS);
            if (numLargeGoldStars > 0) {
                for (let i = 0; i < numLargeGoldStars; i++) {
                    const goldStar = document.createElement('img'); // Changed to img
                    goldStar.src = GOLD_STAR_IMAGE_PATH; // Set source
                    goldStar.alt = 'Gold Star'; // Set alt text
                    goldStar.classList.add('gold-star-image'); // Add specific class for styling
                    starContainer.appendChild(goldStar);
                }
            } else {
                numSmallStars = Math.floor(totalWords / WORDS_PER_SMALL_STAR);
                numSmallStars = Math.min(numSmallStars, MAX_SMALL_STARS);
                for (let i = 0; i < numSmallStars; i++) {
                    const star = document.createElement('img'); // Changed to img
                    star.src = SMALL_STAR_IMAGE_PATH; // Set source
                    star.alt = 'Small Star'; // Set alt text
                    star.classList.add('small-star-image'); // Add specific class for styling
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

            if (diffDays === 1) { // If last sprint was yesterday
                sprintStreakSpan.textContent = streak;
            } else if (diffDays > 1) { // If more than one day passed, reset streak
                sprintStreakSpan.textContent = 0;
            } else { // If same day, keep current streak (or if it's the first sprint today)
                sprintStreakSpan.textContent = streak;
            }
        } else {
            sprintStreakSpan.textContent = 0; // No previous streak data
        }
    }

    function logSprint() {
        if (!isWritingTime) return; // Only log if it was a writing sprint
        const wordsWritten = countWords() - lastWordsCount; // Words written in this sprint
        const date = new Date();
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const li = document.createElement('li');
        li.textContent = `${formattedDate} ${formattedTime} - ${wordsWritten} words in ${formatTime(WRITING_TIME)} sprint.`;
        sprintLogUl.prepend(li);
        saveSprintLog();
        updateSprintStreak();
    }

    function updateSprintStreak() {
        const currentStreak = parseInt(sprintStreakSpan.textContent);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastDateStr = localStorage.getItem('nexusSprintsLastDate');
        let lastSprintDate = null;
        if (lastDateStr) {
            lastSprintDate = new Date(lastDateStr);
            lastSprintDate.setHours(0, 0, 0, 0);
        }

        if (!lastSprintDate) { // First sprint ever
            sprintStreakSpan.textContent = 1;
        } else {
            const diffTime = Math.abs(today - lastSprintDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) { // If last sprint was yesterday, increment streak
                sprintStreakSpan.textContent = currentStreak + 1;
            } else if (diffDays > 1) { // If more than one day passed, reset streak
                sprintStreakSpan.textContent = 1; // Start new streak
            }
            // If same day, streak doesn't change
        }
        localStorage.setItem('nexusSprintsLastDate', today.toISOString()); // Store today's date
        saveSprintStreak(); // Save updated streak data
    }


    // --- Prompt Generation ---
    function generateRandomPrompt() {
        const genre = promptGenreSelect.value;
        const genrePrompts = prompts[genre];
        if (genrePrompts && genrePrompts.length > 0) {
            const randomIndex = Math.floor(Math.random() * genrePrompts.length);
            currentPromptDisplay.textContent = genrePrompts[randomIndex];
        } else {
            currentPromptDisplay.textContent = "No prompts available for this genre.";
        }
    }

    // --- Modal Functions ---
    function showGoalReachedModal(goal) {
        achievedGoalWordsSpan.textContent = goal;
        goalReachedModal.classList.add('active');
        goalAchievedSound.play();
        pauseTimer(); // Pause timer when goal is reached
    }

    function hideGoalReachedModal() {
        goalReachedModal.classList.remove('active');
    }

    // --- Flow State & Nudge Functions (NEW) ---
    function applyUICues(state) {
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const bottomBar = document.querySelector('.bottom-bar-container');

        // Reset classes first
        body.classList.remove('flow-state', 'distraction-state');
        sidebar.style.opacity = '1';
        sidebar.style.filter = 'none';
        bottomBar.style.opacity = '1';
        bottomBar.style.filter = 'none';
        writingArea.style.transform = 'scale(1)';
        writingArea.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)'; // Default shadow
        writingArea.style.backgroundColor = 'var(--writing-area-bg)';
        writingArea.style.color = 'var(--text-color)';
        flowNudgeMessage.classList.remove('active'); // Hide nudge by default

        if (state === 'flow') {
            body.classList.add('flow-state');
            sidebar.style.opacity = '0.3';
            sidebar.style.filter = 'blur(2px)';
            bottomBar.style.opacity = '0.3';
            bottomBar.style.filter = 'blur(2px)';
            writingArea.style.transform = 'scale(1.01)'; // Subtle zoom
            writingArea.style.boxShadow = '0 0 20px rgba(240, 20, 30, 0.7)'; // Red glowing shadow
            writingArea.style.backgroundColor = 'var(--writing-area-bg-flow)';
            writingArea.style.color = 'var(--writing-area-text-flow)';
        } else if (state === 'distraction') {
            body.classList.add('distraction-state');
            sidebar.style.opacity = '1';
            sidebar.style.filter = 'none';
            bottomBar.style.opacity = '1';
            bottomBar.style.filter = 'none';
            writingArea.style.transform = 'scale(1)';
            writingArea.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)'; // Default shadow
            writingArea.style.backgroundColor = 'var(--writing-area-bg)'; // Revert to neutral background for distraction
            writingArea.style.color = 'var(--text-color)'; // Revert to neutral text color
            showFlowNudge("Are you still there? Get back to writing!");
        }
    }

    function showFlowNudge(message) {
        flowNudgeMessage.textContent = message;
        flowNudgeMessage.classList.add('active');
        clearTimeout(flowNudgeTimeout);
        flowNudgeTimeout = setTimeout(hideFlowNudge, NUDGE_DISPLAY_TIME_MS);
    }

    function hideFlowNudge() {
        flowNudgeMessage.classList.remove('active');
    }

    function analyzeTypingPatterns() {
        if (!isWritingTime || !timer) return; // Only analyze when writing time and timer is active

        const currentTime = Date.now();
        const timeElapsedSinceLastType = currentTime - lastTypingTime;

        if (timeElapsedSinceLastType > DISTRACTION_PAUSE_THRESHOLD_MS) {
            applyUICues('distraction');
        } else if (timeElapsedSinceLastType > FLOW_PAUSE_THRESHOLD_MS) {
            // Still in neutral, but close to distraction, could show a softer cue
            applyUICues('neutral');
        } else {
            // Actively typing, consider flow state
            const currentWords = countWords();
            const wordsTypedInInterval = currentWords - lastWordsCount; // This is a rough estimate for short intervals

            if (wordsTypedInInterval > 0) { // Only consider flow if words are being added
                const minutesElapsed = FLOW_ANALYSIS_INTERVAL_MS / (1000 * 60);
                const wpm = wordsTypedInInterval / minutesElapsed;

                // Simple flow detection: typing fast enough and not too many backspaces
                if (wpm >= FLOW_WPM_THRESHOLD) {
                    applyUICues('flow');
                } else {
                    applyUICues('neutral');
                }
            } else {
                applyUICues('neutral'); // No words added, not in flow
            }
        }
    }


    // --- Event Listeners ---
    startBtn.addEventListener('click', startTimer);
    resetBtn.addEventListener('click', resetTimer);

    writingArea.addEventListener('input', () => {
        saveWriting();
        updateStatsDisplay();
        updateStarsDisplay(); // Update stars on every input
        if (isWritingTime && timer) { // Only update last typing time if actively writing
            lastTypingTime = Date.now();
            clearTimeout(typingTimeout); // Clear previous timeout
            typingTimeout = setTimeout(() => {
                // If typing stops for a set period, apply neutral or distraction cue
                if (Date.now() - lastTypingTime > FLOW_PAUSE_THRESHOLD_MS) {
                    applyUICues('neutral'); // Or 'distraction' if longer pause
                }
            }, FLOW_PAUSE_THRESHOLD_MS);
            // After any input, re-evaluate UI cue
            analyzeTypingPatterns();
        }
    });

    // --- New Event Listener for Paragraph Indentation ---
    writingArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Only on Enter, not Shift+Enter
            e.preventDefault(); // Prevent default new line
            const start = writingArea.selectionStart;
            const end = writingArea.selectionEnd;
            const value = writingArea.value;

            // Insert newline and 4 spaces (or a tab '\t')
            const textToInsert = '\n    '; // New line + 4 spaces
            
            // Get the line content before the cursor
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const line = value.substring(lineStart, start);
            
            // Check if the current line is empty or just whitespace
            const isLineEmpty = line.trim().length === 0;

            let newText;
            if (start === value.length || isLineEmpty) {
                // If at the end or on an empty line, just append the indent
                newText = value.substring(0, start) + textToInsert + value.substring(end);
            } else {
                // If in the middle of a line, find the last non-whitespace char for context
                const lastCharIndexBeforeCursor = start - 1;
                if (lastCharIndexBeforeCursor >= 0 && value[lastCharIndexBeforeCursor] !== '\n') {
                    // If not at the very beginning of a line, start new indented paragraph
                    newText = value.substring(0, start) + textToInsert + value.substring(end);
                } else {
                    // If at the beginning of a line (or just after newline), apply indent
                    newText = value.substring(0, start) + textToInsert + value.substring(end);
                }
            }
            
            writingArea.value = newText;
            // Place cursor after the inserted indent
            writingArea.selectionStart = writingArea.selectionEnd = start + textToInsert.length;
            
            // Manually trigger input event for stats and saving
            const event = new Event('input', { bubbles: true });
            writingArea.dispatchEvent(event);
        }
    });


    infoIcon.addEventListener('click', () => {
        statsPopup.classList.toggle('active');
    });

    // Hide stats popup when clicking outside
    document.addEventListener('click', (event) => {
        if (!infoIcon.contains(event.target) && !statsPopup.contains(event.target)) {
            statsPopup.classList.remove('active');
        }
    });

    wordGoalInput.addEventListener('input', () => {
        updateStatsDisplay(); // Update display when goal changes
        localStorage.setItem('nexusSprintsWordGoal', wordGoalInput.value); // Save goal
    });

    // Load saved word goal on startup
    function loadWordGoal() {
        const savedGoal = localStorage.getItem('nexusSprintsWordGoal');
        if (savedGoal) {
            wordGoalInput.value = savedGoal;
        }
        goalDisplay.textContent = wordGoalInput.value; // Initialize goal display
    }

    promptGenreSelect.addEventListener('change', generateRandomPrompt);
    generatePromptBtn.addEventListener('click', generateRandomPrompt);

    // Initial prompt generation
    generateRandomPrompt();

    copyTextBtn.addEventListener('click', () => {
        writingArea.select();
        document.execCommand('copy');
        // Optional: Provide visual feedback like a tooltip or temporary message
        copyTextBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyTextBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
        }, 1500);
    });

    fullscreenToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen');
        if (document.body.classList.contains('fullscreen')) {
            fullscreenToggleBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
            writingArea.focus(); // Keep focus on writing area
        } else {
            fullscreenToggleBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        }
    });

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        // Save dark mode preference to local storage
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('nexusSprintsDarkMode', 'enabled');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            localStorage.setItem('nexusSprintsDarkMode', 'disabled');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    });

    // Check for saved dark mode preference on load
    function loadDarkModePreference() {
        if (localStorage.getItem('nexusSprintsDarkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    }

    // Modal button event listeners
    keepWritingBtn.addEventListener('click', () => {
        hideGoalReachedModal();
        startTimer(); // Resume timer
    });

    doneForDayBtn.addEventListener('click', () => {
        hideGoalReachedModal();
        resetTimer(); // Reset everything
    });


    // Initialize settings from local storage or defaults
    function loadSettings() {
        const savedWritingDuration = localStorage.getItem('nexusSprintsWritingDuration');
        const savedShortBreakDuration = localStorage.getItem('nexusSprintsShortBreakDuration');
        const savedLongBreakDuration = localStorage.getItem('nexusSprintsLongBreakDuration');

        if (savedWritingDuration) writingDurationInput.value = savedWritingDuration;
        if (savedShortBreakDuration) shortBreakDurationInput.value = savedShortBreakDuration;
        if (savedLongBreakDuration) longBreakDurationInput.value = savedLongBreakDuration;

        // Update current working times
        WRITING_TIME = (parseInt(writingDurationInput.value) || 25) * 60;
        BREAK_TIME = (parseInt(shortBreakDurationInput.value) || 5) * 60;
        LONG_BREAK_TIME = (parseInt(longBreakDurationInput.value) || 15) * 60;

        // Set initial countdown display based on loaded writing time
        timeLeft = WRITING_TIME;
        updateTimerDisplay();
    }

    // Event listeners for duration input changes
    writingDurationInput.addEventListener('input', (e) => {
        localStorage.setItem('nexusSprintsWritingDuration', e.target.value);
        if (isWritingTime && !timer) { // Only update displayed time if not running and it's writing time
            timeLeft = (parseInt(e.target.value) || 25) * 60;
            updateTimerDisplay();
        }
        WRITING_TIME = (parseInt(e.target.value) || 25) * 60; // Update global variable immediately
    });
    shortBreakDurationInput.addEventListener('input', (e) => {
        localStorage.setItem('nexusSprintsShortBreakDuration', e.target.value);
        BREAK_TIME = (parseInt(e.target.value) || 5) * 60;
    });
    longBreakDurationInput.addEventListener('input', (e) => {
        localStorage.setItem('nexusSprintsLongBreakDuration', e.target.value);
        LONG_BREAK_TIME = (parseInt(e.target.value) || 15) * 60;
    });


    // --- Initialization Calls ---
    loadWriting(); // Load writing content
    loadSprintLog(); // Load sprint log
    loadSprintStreak(); // Load sprint streak
    loadWordGoal(); // Load word goal
    loadDarkModePreference(); // Load dark mode preference

    // Initial update of stats and stars after loading all content
    updateStatsDisplay();
    updateStarsDisplay();
});