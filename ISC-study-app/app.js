// --- Global State ---
let questions = [];
let currentIndex = 0;
let score = 0;
let timeLeft = 900;
let timerInterval;
let flaggedQuestions = new Set();
let userAnswers = [];

// --- Page Elements ---
const mainScreen = document.getElementById("main-screen");
const appLayout = document.getElementById("app-layout");
const resultModal = document.getElementById("result-modal");
const reviewScreen = document.getElementById("review-screen");

// --- Load Questions ---
async function loadQuestions() {
    try {
        const response = await fetch("questions.json");
        questions = await response.json();
    } catch (error) {
        console.error("Audit Failure: Could not load questions.", error);
    }
}

// --- Start Exam ---
async function startExam() {
    if (questions.length === 0) {
        await loadQuestions();
    }

    currentIndex = 0;
    score = 0;
    timeLeft = 300;
    flaggedQuestions = new Set();
    userAnswers = new Array(questions.length).fill(null);

    mainScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    resultModal.classList.add("hidden");
    appLayout.classList.remove("hidden");

    document.getElementById("timer").innerText = "15:00";
    document.getElementById("rank-badge").innerText = "Intern Auditor";

    createQuestionMap();
    displayQuestion();
    startTimer();
}

// --- Display Current Question ---
function displayQuestion() {
    const q = questions[currentIndex];

    document.getElementById("q-number").innerText =
        `Question ${currentIndex + 1} of ${questions.length}`;

    document.getElementById("domain-tag").innerText = q.domain;
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
            ? "Finish Audit"
            : "Confirm & Next";

    updateQuestionMap();
}

// --- Timer ---
function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
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

// --- Show Result Modal ---
function showResultModal(percent) {
    resultModal.classList.remove("hidden");

    document.getElementById("final-score").innerText = percent;

    let rank = "";
    let message = "";

    if (percent === 100) {
        rank = "Managing Partner";
        message = "Flawless audit! The AICPA would be proud.";
    } else if (percent >= 70) {
        rank = "Senior Auditor";
        message = "Solid work. Minor documentation issues found.";
    } else {
        rank = "Junior Intern";
        message = "Still needs a little more audit coffee.";
    }

    document.getElementById("rank-badge").innerText = rank;
    document.getElementById("result-text").innerText = message;
}

// --- Show Explanation Screen ---
function showExplanation() {
    resultModal.classList.add("hidden");
    appLayout.classList.add("hidden");
    mainScreen.classList.add("hidden");
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
                <h3>Question ${index + 1}</h3>

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

    resultModal.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    appLayout.classList.add("hidden");
    mainScreen.classList.remove("hidden");
}

// --- Button Events ---
document.getElementById("start-btn").addEventListener("click", startExam);

document.getElementById("next-btn").addEventListener("click", handleNext);
document.getElementById("prev-btn").addEventListener("click", handlePrev);
document.getElementById("flag-btn").addEventListener("click", toggleFlag);

document.getElementById("header-main-btn").addEventListener("click", goMain);

document.getElementById("retake-btn").addEventListener("click", startExam);
document.getElementById("main-btn").addEventListener("click", goMain);
document.getElementById("explanation-btn").addEventListener("click", showExplanation);

document.getElementById("review-main-btn").addEventListener("click", goMain);
document.getElementById("review-retake-btn").addEventListener("click", startExam);

// Load questions but do not start exam automatically
loadQuestions();