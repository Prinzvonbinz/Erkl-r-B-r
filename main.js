const apiKey = "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"; // <-- Ersetzen

const subjectInput = document.getElementById("subject");
const topicInput = document.getElementById("topic");
const classInput = document.getElementById("classLevel");
const startBtn = document.getElementById("startBtn");
const lessonDiv = document.getElementById("lesson");
const explanationDiv = document.getElementById("explanation");
const loadTestBtn = document.getElementById("loadTestBtn");
const testDiv = document.getElementById("test");
const questionsDiv = document.getElementById("questions");
const submitAnswersBtn = document.getElementById("submitAnswers");
const resultDiv = document.getElementById("result");
const readBtn = document.getElementById("readBtn");

let currentCorrectAnswers = [];
let currentExplanation = "";

// 🧠 Daten aus LocalStorage laden
window.addEventListener("load", () => {
  const savedData = JSON.parse(localStorage.getItem("lernAppData"));
  if (savedData) {
    classInput.value = savedData.classLevel || "";
    subjectInput.value = savedData.subject || "";
    topicInput.value = savedData.topic || "";
  }
});

startBtn.addEventListener("click", async () => {
  const subject = subjectInput.value;
  const topic = topicInput.value.trim();
  const classLevel = classInput.value.trim();

  if (!subject || !topic || !classLevel) {
    alert("Bitte Klasse, Fach und Thema eingeben.");
    return;
  }

  // Speichern
  localStorage.setItem("lernAppData", JSON.stringify({
    classLevel,
    subject,
    topic
  }));

  lessonDiv.classList.remove("hidden");
  explanationDiv.innerHTML = "Lade Erklärung...";
  testDiv.classList.add("hidden");
  resultDiv.innerHTML = "";

  const prompt = `Erkläre das Thema '${topic}' im Fach '${subject}' in sehr einfacher Sprache für Schüler der Klasse ${classLevel}.`;

  const explanation = await askOpenAI(prompt);
  currentExplanation = explanation;
  explanationDiv.innerHTML = explanation.replace(/\n/g, "<br>");
});

loadTestBtn.addEventListener("click", async () => {
  testDiv.classList.remove("hidden");
  questionsDiv.innerHTML = "Lade Test...";
  resultDiv.innerHTML = "";

  const subject = subjectInput.value;
  const topic = topicInput.value.trim();
  const classLevel = classInput.value.trim();

  const prompt = `Erstelle 3 einfache Multiple-Choice-Fragen mit je 3 Antworten (eine richtig) zum Thema '${topic}' im Fach '${subject}' für die Klasse ${classLevel}. Gib die Antworten mit A), B), C) an und markiere die richtige mit einem (✔).`;

  const testText = await askOpenAI(prompt);
  renderTest(testText);
});

submitAnswersBtn.addEventListener("click", () => {
  const selectedAnswers = document.querySelectorAll("input[type='radio']:checked");
  let score = 0;

  selectedAnswers.forEach((input, i) => {
    if (input.value === currentCorrectAnswers[i]) {
      score++;
    }
  });

  resultDiv.innerHTML = `✅ Du hast ${score} von ${currentCorrectAnswers.length} Fragen richtig!`;
});

readBtn.addEventListener("click", () => {
  if (!currentExplanation) return;
  const utterance = new SpeechSynthesisUtterance(currentExplanation);
  utterance.lang = "de-DE";
  speechSynthesis.cancel(); // Stoppt vorherige
  speechSynthesis.speak(utterance);
});

async function askOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Du bist ein Lehrer, der komplizierte Themen einfach erklärt." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Keine Antwort erhalten.";
}

function renderTest(text) {
  const lines = text.split("\n").filter(line => line.trim() !== "");
  questionsDiv.innerHTML = "";
  currentCorrectAnswers = [];

  let currentQuestion = null;
  let questionIndex = -1;

  lines.forEach(line => {
    if (line.match(/^Frage \d+:/)) {
      questionIndex++;
      currentQuestion = document.createElement("div");
      const questionText = line.replace(/^Frage \d+:\s*/, "");
      currentQuestion.innerHTML = `<strong>${questionText}</strong>`;
      questionsDiv.appendChild(currentQuestion);
    } else if (line.match(/^[ABC]\)/)) {
      const isCorrect = line.includes("✔");
      const answerText = line.replace("✔", "").trim();
      const answerLetter = line.charAt(0);

      const id = `q${questionIndex}_a${answerLetter}`;
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="radio" name="q${questionIndex}" value="${answerLetter}" id="${id}">
        ${answerText}
      `;
      currentQuestion.appendChild(label);
      currentQuestion.appendChild(document.createElement("br"));

      if (isCorrect) {
        currentCorrectAnswers[questionIndex] = answerLetter;
      }
    }
  });
}
