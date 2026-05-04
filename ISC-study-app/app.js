// --- Global State ---
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let score = 0;
let timeLeft = 1500; // 25 minutes
let timerInterval;
let flaggedQuestions = new Set();
let userAnswers = [];

let selectedExam = "ISC";
let selectedDifficulty = "Easy";
let isPaused = false;

// --- Page Elements ---
const mainScreen = document.getElementById("main-screen");
const appLayout = document.getElementById("app-layout");
const resultModal = document.getElementById("result-modal");
const reviewScreen = document.getElementById("review-screen");
const pauseModal = document.getElementById("pause-modal");

// --- Load Questions ---
async function loadQuestions() {
    try {
        const response = await fetch("questions.json");
        const data = await response.json();

        allQuestions = normalizeQuestions(data);
    } catch (error) {
        console.error("Could not load questions.json.", error);
        allQuestions = [];
    }
}

// --- Normalize Old + New Question Format ---
function normalizeQuestions(data) {
    return data.map((q, index) => {
        return {
            id: q.id || `Q-${index + 1}`,
            exam: q.exam || "ISC",
            difficulty: normalizeDifficulty(q.difficulty || "Easy"),
            domain: q.domain || "General",
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || "No explanation provided."
        };
    });
}

// --- Normalize Difficulty Names ---
function normalizeDifficulty(difficulty) {
    if (!difficulty) return "Easy";

    const d = difficulty.toLowerCase();

    if (d === "easy") return "Easy";
    if (d === "medium" || d === "mid") return "Medium";
    if (d === "hard" || d === "difficult") return "Difficult";

    return difficulty;
}

// --- Menu Choice Setup ---
function setupMenuChoices() {
    document.querySelectorAll(".exam-choice").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".exam-choice").forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");
            selectedExam = button.dataset.exam;
        });
    });

    document.querySelectorAll(".difficulty-choice").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".difficulty-choice").forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");
            selectedDifficulty = button.dataset.difficulty;
        });
    });
}

// --- Start Exam ---
async function startExam() {
    if (allQuestions.length === 0) {
        await loadQuestions();
    }

    let filteredQuestions = allQuestions.filter(q =>
        q.exam === selectedExam && q.difficulty === selectedDifficulty
    );

    if (filteredQuestions.length < 15) {
        filteredQuestions = buildFallbackQuestions(selectedExam, selectedDifficulty, filteredQuestions);
    }

    questions = shuffleArray(filteredQuestions).slice(0, 15);

    currentIndex = 0;
    score = 0;
    timeLeft = 1500;
    isPaused = false;
    flaggedQuestions = new Set();
    userAnswers = new Array(questions.length).fill(null);

    mainScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    resultModal.classList.add("hidden");
    pauseModal.classList.add("hidden");
    appLayout.classList.remove("hidden");

    document.getElementById("exam-brand").innerText = selectedExam;
    document.getElementById("timer").innerText = "25:00";
    document.getElementById("rank-badge").innerText = "Junior Intern";

    createQuestionMap();
    displayQuestion();
    startTimer();
}

// --- Fallback Questions If JSON Has Fewer Than 15 ---
function buildFallbackQuestions(exam, difficulty, existingQuestions) {
    const result = [...existingQuestions];

    const templates = {
        AUD: {
            domain: "Auditing and Attestation",
            question: "Which audit procedure is most directly related to obtaining evidence about management assertions?",
            options: [
                "Preparing the client’s financial statements",
                "Performing risk assessment and substantive procedures",
                "Approving management’s estimates",
                "Issuing tax guidance to the client"
            ],
            answer: 1,
            explanation: "Auditors obtain evidence through risk assessment procedures, tests of controls, and substantive procedures."
        },
        FAR: {
            domain: "Financial Accounting and Reporting",
            question: "Which statement best describes accrual accounting?",
            options: [
                "Revenue is recorded only when cash is received",
                "Expenses are recorded only when cash is paid",
                "Transactions are recorded when earned or incurred",
                "Only tax-basis transactions are recorded"
            ],
            answer: 2,
            explanation: "Under accrual accounting, revenues and expenses are recognized when earned or incurred, not only when cash changes hands."
        },
        REG: {
            domain: "Regulation and Taxation",
            question: "Which item is generally important when calculating taxable income?",
            options: [
                "Only gross receipts",
                "Allowable deductions and taxable income rules",
                "Only book income",
                "Only cash received from customers"
            ],
            answer: 1,
            explanation: "Taxable income depends on gross income, allowable deductions, exclusions, credits, and applicable tax rules."
        },
        ISC: {
            domain: "Information Systems and Controls",
            question: "Which control is most related to protecting system access?",
            options: [
                "Bank reconciliation",
                "Multi-factor authentication",
                "Depreciation schedule",
                "Inventory count sheet"
            ],
            answer: 1,
            explanation: "Multi-factor authentication strengthens access control by requiring more than one form of verification."
        }
    };

    const template = templates[exam] || templates.ISC;

    while (result.length < 15) {
        const n = result.length + 1;

        result.push({
            id: `${exam}-${difficulty}-AUTO-${n}`,
            exam: exam,
            difficulty: difficulty,
            domain: template.domain,
            question: `${template.question} (${exam} ${difficulty} Practice ${n})`,
            options: template.options,
            answer: template.answer,
            explanation: template.explanation
        });
    }

    return result;
}

// --- Shuffle Questions ---
function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

// --- Display Current Question ---
function displayQuestion() {
    const q = questions[currentIndex];

    document.getElementById("q-number").innerText =
        `Question ${currentIndex + 1} of ${questions.length}`;

    document.getElementById("domain-tag").innerText =
        `${q.exam} | ${q.difficulty} | ${q.domain}`;

    document.getElementById("question-text").innerText = q.question;

    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    q.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";

        if (userAnswers[currentIndex] === index) {
            btn.classList.add("selected");
        }

        btn.innerText = option;
        btn.onclick = () => selectOption(index);

        optionsContainer.appendChild(btn);
    });

    updateUI();
}

// --- Select Answer ---
function selectOption(index) {
    userAnswers[currentIndex] = index;

    const btns = document.querySelectorAll(".option-btn");
    btns.forEach((btn, i) => {
        btn.classList.toggle("selected", i === index);
    });

    updateQuestionMap();
}

// --- Create Question Map ---
function createQuestionMap() {
    const grid = document.getElementById("question-grid");
    grid.innerHTML = "";

    questions.forEach((_, index) => {
        const box = document.createElement("div");
        box.className = "q-box";
        box.innerText = index + 1;
        box.id = `map-box-${index}`;
        box.onclick = () => jumpToQuestion(index);

        grid.appendChild(box);
    });
}

// --- Update Question Map ---
function updateQuestionMap() {
    questions.forEach((_, index) => {
        const box = document.getElementById(`map-box-${index}`);
        if (!box) return;

        box.classList.toggle("active", index === currentIndex);
        box.classList.toggle("flagged", flaggedQuestions.has(index));

        if (userAnswers[index] !== null && index !== currentIndex) {
            box.style.background = "#e3f2fd";
            box.style.color = "#2c3e50";
        }

        if (index === currentIndex) {
            box.style.background = "";
            box.style.color = "";
        }
    });
}

// --- Toggle Flag ---
function toggleFlag() {
    if (flaggedQuestions.has(currentIndex)) {
        flaggedQuestions.delete(currentIndex);
    } else {
        flaggedQuestions.add(currentIndex);
    }

    updateQuestionMap();
}

// --- Jump to Question ---
function jumpToQuestion(index) {
    currentIndex = index;
    displayQuestion();
}

// --- Next Question ---
function handleNext() {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    } else {
        finishExam();
    }
}

// --- Previous Question ---
function handlePrev() {
    if (currentIndex > 0) {
        currentIndex--;
        displayQuestion();
    }
}

// --- Update UI ---
function updateUI() {
    const progress = ((currentIndex + 1) / questions.length) * 100;
    document.getElementById("progress-bar").style.width = `${progress}%`;

    document.getElementById("prev-btn").disabled = currentIndex === 0;

    document.getElementById("next-btn").innerText =
        currentIndex === questions.length - 1
            ? "Finish Exam"
            : "Confirm & Next";

    updateQuestionMap();
}

// --- Timer ---
function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (isPaused) return;

        timeLeft--;

        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;

        document.getElementById("timer").innerText =
            `${mins}:${secs < 10 ? "0" : ""}${secs}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishExam();
        }
    }, 1000);
}

// --- Pause Exam ---
function pauseExam() {
    isPaused = true;
    pauseModal.classList.remove("hidden");
}

// --- Resume Exam ---
function resumeExam() {
    isPaused = false;
    pauseModal.classList.add("hidden");
}

// --- Finish Exam ---
function finishExam() {
    clearInterval(timerInterval);

    score = 0;

    userAnswers.forEach((answer, index) => {
        if (answer === questions[index].answer) {
            score++;
        }
    });

    const finalPercent = Math.round((score / questions.length) * 100);
    showResultModal(finalPercent);
}

// --- Rank ---
function getRank(percent) {
    if (percent <= 50) {
        return "Junior Intern";
    }

    if (percent < 80) {
        return "Senior Associate";
    }

    return "Managing Partner";
}

// --- Result Comments by Exam ---
function getResultMessage(exam, percent) {
    const comments = {
        AUD: {
            low: "Audit alert: your evidence file needs more work. Review assertions, internal control, and audit reports.",
            mid: "Nice audit work. You identified several risks, but a few procedures still need better documentation.",
            high: "Excellent audit judgment. You are ready to lead the engagement team."
        },
        FAR: {
            low: "The financial statements are not balanced yet. Review recognition, measurement, and reporting rules.",
            mid: "Solid accounting foundation. A few adjustments are still needed before issuing the statements.",
            high: "Outstanding FAR performance. Your trial balance is clean and ready for reporting."
        },
        REG: {
            low: "The tax return needs another review. Focus on basis, deductions, and entity taxation.",
            mid: "Good regulatory work. You caught several tax issues, but a few details slipped through.",
            high: "Excellent REG performance. The IRS would have a hard time finding issues."
        },
        ISC: {
            low: "Still needs a little more audit coffee. Review SOC reports, security, and data controls.",
            mid: "You found a weakness in a SOC report! Keep sharpening your systems-control judgment.",
            high: "ISC master — you are ready to sign off."
        }
    };

    if (percent <= 50) return comments[exam].low;
    if (percent < 80) return comments[exam].mid;
    return comments[exam].high;
}

// --- Show Result Modal ---
function showResultModal(percent) {
    resultModal.classList.remove("hidden");

    const rank = getRank(percent);

    document.getElementById("final-score").innerText = percent;
    document.getElementById("final-rank-title").innerText = rank;
    document.getElementById("rank-badge").innerText = rank;

    document.getElementById("result-text").innerText =
        `${selectedExam} ${selectedDifficulty} Result: ${getResultMessage(selectedExam, percent)}`;
}

// --- Show Explanation Screen ---
function showExplanation() {
    resultModal.classList.add("hidden");
    appLayout.classList.add("hidden");
    mainScreen.classList.add("hidden");
    pauseModal.classList.add("hidden");
    reviewScreen.classList.remove("hidden");

    const reviewList = document.getElementById("review-list");
    reviewList.innerHTML = "";

    let wrongCount = 0;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = q.answer;

        if (userAnswer !== correctAnswer) {
            wrongCount++;

            const item = document.createElement("div");
            item.className = "review-item";

            const userAnswerText =
                userAnswer === null ? "No answer selected" : q.options[userAnswer];

            item.innerHTML = `
                <h3>${q.exam} ${q.difficulty} | Question ${index + 1}</h3>

                <p class="review-question">${q.question}</p>

                <p><strong>Your answer:</strong> ${userAnswerText}</p>
                <p><strong>Correct answer:</strong> ${q.options[correctAnswer]}</p>

                <div class="review-explanation">
                    <strong>Explanation:</strong>
                    <p>${q.explanation}</p>
                </div>
            `;

            reviewList.appendChild(item);
        }
    });

    if (wrongCount === 0) {
        reviewList.innerHTML = `
            <div class="review-item correct-all">
                <h3>Perfect Score!</h3>
                <p>You did not miss any questions.</p>
            </div>
        `;
    }
}

// --- Go Back to Main Menu ---
function goMain() {
    clearInterval(timerInterval);
    isPaused = false;

    resultModal.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    pauseModal.classList.add("hidden");
    appLayout.classList.add("hidden");
    mainScreen.classList.remove("hidden");
}

// --- Button Events ---
document.getElementById("start-btn").addEventListener("click", startExam);

document.getElementById("next-btn").addEventListener("click", handleNext);
document.getElementById("prev-btn").addEventListener("click", handlePrev);
document.getElementById("flag-btn").addEventListener("click", toggleFlag);

document.getElementById("pause-btn").addEventListener("click", pauseExam);
document.getElementById("resume-btn").addEventListener("click", resumeExam);
document.getElementById("pause-main-btn").addEventListener("click", goMain);

document.getElementById("header-main-btn").addEventListener("click", goMain);

document.getElementById("retake-btn").addEventListener("click", startExam);
document.getElementById("main-btn").addEventListener("click", goMain);
document.getElementById("explanation-btn").addEventListener("click", showExplanation);

document.getElementById("review-main-btn").addEventListener("click", goMain);
document.getElementById("review-retake-btn").addEventListener("click", startExam);

// Init
setupMenuChoices();
loadQuestions();
