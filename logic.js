let filteredQuestionnaire;
let selectedQuestions;
let wrongQuestions;
let questionCount;
let currentQuestion;
let correctAnswers;
let wrongAnswers;
let questionAnswered;

$(document).ready(function() {
	$("#caption").text(title);
	$("#start").on("click", start);
	$("#restart").on("click", initStart);
	$("#restartWrong").on("click", { restart: true }, start);
	
	initStart();
});

function initStart() {
	$("#quiz").hide();
	$("#quizResults").hide();
	$("#restart").hide();
	
	// Temporarily add all items to the catalogue
	filteredQuestionnaire = new Array();
	questionnaire.forEach(x => filteredQuestionnaire.push(x));
	
	$("#quizStart").show();
	$("#questionCount").attr("max", filteredQuestionnaire.length);
	$("#questionCount").val(filteredQuestionnaire.length);
}

function start(event) {	
	$("#quizStart").hide();
	$("#quizResults").hide();
	$("#restartWrong").hide();
	
	let restart = (event.data != null && event.data.restart === true);
	
	currentQuestion = 0;
	correctAnswers = 0;
	wrongAnswers = 0;
	questionCount = restart ? wrongQuestions.length : Number($("#questionCount").val());
	
	selectedQuestions = new Array();
	
	if (restart) {
		// Restart with wrongly answered questions
		for (let i = 0; i < questionCount; i++) {
			// Generate next question index, then add it to list of selected questions and remove it from the available questions
			let next = Math.floor(Math.random() * wrongQuestions.length);
			selectedQuestions.push(wrongQuestions[next]);
			wrongQuestions.splice(next, 1);
		}
	}
	else {
		for (let i = 0; i < questionCount; i++) {
			// Generate next question index, then add it to list of selected questions and remove it from the available questions
			let next = Math.floor(Math.random() * filteredQuestionnaire.length);
			selectedQuestions.push(filteredQuestionnaire[next]);
			filteredQuestionnaire.splice(next, 1);
		}
	}
	
	wrongQuestions = new Array();
	
	updateProgress();
	displayQuestion();
	$("#quiz").show();
	$("#nextQuestion").on("click", nextQuestion);
}

function updateProgress() {
	let percentage = Math.round(100 * currentQuestion / questionCount);
	$("#quiz div.progress")
		.attr("aria-valuenow", percentage)
		.children("div.progress-bar")
			.width(percentage + "%")
			.text(currentQuestion + " / " + questionCount + " (" + percentage + " %)");
}

function displayQuestion() {
	let current = selectedQuestions[currentQuestion];
	
	if (current.category != null) {
		$("#questionId").text(current.category);
	}
	
	$("#question").html(current.question);
	if (current.qid != null) {
		$("#question").html("<b>" + current.qid + "</b> &nbsp; " + current.question);
	}
	
	if (current.image != null) {
		$("#image img").attr("src", current.image);
		$("#image").show();
	}
	else {
		$("#image").hide();
		$("#image img").attr("src", "");		
	}
	
	$("#answers").empty();
	for (let i = 0; i < current.answers.length; i++) {
		let qAnswer = $("<button>", { "class" : "btn btn-outline-primary", "type" : "button" })
			.html(current.answers[i])
			.on("click", answerClicked);			
		if (current.correct === (i + 1)) {
			qAnswer.attr("data-correct", "true");
		}
		$("#answers").append(qAnswer);
	}
	
	questionAnswered = false;
}

function answerClicked() {
	questionAnswered = true;
	let qThis = $(this);
	let correct = qThis.attr("data-correct") === "true";
	if (correct) {
		correctAnswers = correctAnswers + 1;
	}
	else {
		wrongQuestions.push(selectedQuestions[currentQuestion]);
		wrongAnswers = wrongAnswers + 1;
		qThis.removeClass("btn-outline-primary").addClass("btn-danger");
	}
	// Show correct answer
	$("#answers > button[data-correct]").removeClass("btn-outline-primary").addClass("btn-success");
	// Prevent any further clicks
	$("#answers > button").off("click");
}

function nextQuestion() {
	// Add unanswered question to list of wrong questions to repeat them later
	if (!questionAnswered) {
		wrongQuestions.push(selectedQuestions[currentQuestion]);
	}
	currentQuestion = currentQuestion + 1;
	updateProgress();
	if (currentQuestion === questionCount) {
		$("#nextQuestion").off("click");
		showResult();
	}
	else {
		displayQuestion();
	}
}

function showResult() {
	$("#quiz").hide();
	
	let correctPercentage = Math.round(100 * correctAnswers / questionCount);
	
	$("#result").text(correctAnswers + " von " + questionCount + " richtig (" + correctPercentage + " %)");
	
	$("#quizResults div.progress").has("div.bg-success")
		.attr("aria-valuenow", correctPercentage)
		.width(correctPercentage + "%")
		.children("div.progress-bar")
			.text(correctAnswers + " (" + correctPercentage + " %)");
	
	let wrongPercentage = Math.round(100 * wrongAnswers / questionCount);
	
	$("#quizResults div.progress").has("div.bg-danger")
		.attr("aria-valuenow", wrongPercentage)
		.width(wrongPercentage + "%")
		.children("div.progress-bar")
			.text(wrongAnswers + " (" + wrongPercentage + " %)");
	
	let skippedPercentage = 100 - correctPercentage - wrongPercentage;
	let skippedAnswers = questionCount - correctAnswers - wrongAnswers;
	
	$("#quizResults div.progress").has("div.bg-secondary")
		.attr("aria-valuenow", skippedPercentage)
		.width(skippedPercentage + "%")
		.children("div.progress-bar")
			.text(skippedAnswers + " (" + skippedPercentage + " %)");
	
	let qRestartButton = (wrongQuestions.length > 0) ? $("#restartWrong") : $("#restart");
	qRestartButton.show();
	
	$("#quizResults").show();
}