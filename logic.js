const storageName = "quiz/" + title;
let quiz = { questionCount:0, currentQuestion:0, correctAnswers:0, wrongAnswers:0, selectedQuestions:[], wrongQuestions:[] };
let filteredQuestionnaire;
let questionAnswered;
let startTime;
let options;

$(document).ready(function() {
	$("#caption").text(title);
	$("#start").on("click", start);
	$("#restart").on("click", { clearStorage: true }, initialize);
	$("#redoWrong").on("click", { redo: true }, start);
	$("#abort").on("click", showResult);
	$("#filterToggle"). on("click", toggleFilters);
	$("#showList").on("click", showList);
	$("#closeList").on("click", closeList);
	$("#clearSession").on("click", { clear: true }, onStoreSession);
	$("#saveSession").on("click", { save: true }, onStoreSession);
	
	$("#optionsOffcanvas").on("show.bs.offcanvas", updateOffcanvasButtonVisibility);
	options = new Map();
	$("input:checkbox.quiz-option").on("change", onOptionChanged);
	onOptionChanged();
	
	loadFilters();
	initialize();	
	
	// Check localStorage for previous session
	if (hasSavedSession()) {
		restoreQuiz();
	}
	
	// Default color scheme: auto
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
		setTheme("auto");
	});	
	activateTheme(getStoredTheme());
	$("#changeTheme").on("click", onChangeTheme);
});

function updateOffcanvasButtonVisibility() {
	if (hasSavedSession()) { // Data available?
		$("#clearSession").show();
	} else {
		$("#clearSession").hide();
	}
	if (startTime != null) { // In quiz?
		$("#saveSession").show();
	} else {
		$("#saveSession").hide();
	}
}

function onOptionChanged() {	
	$("input:checkbox.quiz-option").each(function() {
		options.set($(this).attr("name"), this.checked);
	});
}

function loadFilters() {
	let categories = new Set(questionnaire.map(a => a.category));
	categories.forEach(c => addFilter("category", c));
	
	let filters = new Set(questionnaire.map(a => a.filter));
	if (categories.size > 1 && filters.size > 1) {
		$("#filter > div > div").append($("<hr/>"));
	}
	filters.forEach(f => addFilter("filter", f));
	
	if (categories.size > 0 || filters.size > 0) {
		$("#filter").show();
	}
}

function addFilter(type, value) {
	if (value == null || value == undefined) {
		return;
	}
	let name = "chkbx" + value.trim();
	$("#filter > div > div").append(
		$("<div>", { "class" : "form-check" })
			.append(
				$("<input>", { 
					"class" : "form-check-input form-check-input-lg",
					"type" : "checkbox",
					"id" : name,
					"data-type" : type,
					"value" : value,
					"checked" : true
				})
				.on("change", applyFilter)
			)
			.append(
				$("<label>", {
					"class" : "form-check-label",
					"for" : name
				})
				.text(value)
			)
	);
}

function toggleFilters() {	
	let allFilters = $("#filter input:checkbox");
	let checkedCount = allFilters.filter(":checked").length;
	let uncheckedCount = allFilters.length - checkedCount;
	allFilters.each(function() { this.checked = (uncheckedCount > checkedCount); });
	applyFilter();
}

function applyFilter() {
	let selectedCategories = new Array();
	$("#filter input:checkbox:checked[data-type='category']").each(function() {
		selectedCategories.push($(this).val())
	});
	
	let prefilteredQuestionnaire = new Array();
	
	// Add all items that don't have a category property set
	prefilteredQuestionnaire.filter(a => a.category === undefined).forEach(
		x => prefilteredQuestionnaire.push(x)
	);
	// Add all items according to category
	selectedCategories.forEach(
		category => questionnaire.filter(a => a.category === category).forEach(
			x => prefilteredQuestionnaire.push(x)
	));
	
	let selectedFilters = new Array();
	$("#filter input:checkbox:checked[data-type='filter']").each(function() {
		selectedFilters.push($(this).val());
	});
	
	filteredQuestionnaire = new Array();
	
	// Add all items that don't have a filter property set
	prefilteredQuestionnaire.filter(a => a.filter === undefined).forEach(
		x => filteredQuestionnaire.push(x)
	);
	// Add all items according to filter
	selectedFilters.forEach(
		filter => prefilteredQuestionnaire.filter(a => a.filter === filter).forEach(
			x => filteredQuestionnaire.push(x)
	));
	
	$("#questionCount").attr("max", filteredQuestionnaire.length);
	$("#questionCount").val(filteredQuestionnaire.length);
}

function initialize(event) {
	// In case triggered by button click, clear the local storage
	if (event && event.data && event.data.clearStorage) {
		clearSession();
	}
	
	startTime = null;
	
	$("#quiz").hide();
	$("#quizResults").hide();
	$("#restart").hide();
	
	applyFilter();
	
	$("#quizStart").show();
}

function start(event) {	
	$("#quizStart").hide();
	$("#quizResults").hide();
	$("#redoWrong").hide();
		
	if (event.data && event.data.continueQuiz && hasSavedSession()) {
		// Continue quiz
		let storageData = localStorage.getItem(storageName);
		quiz = JSON.parse(storageData);
	} else {
		// Redo with either wrongly answered questions or Start with all (filtered) questions
		let redo = (event.data && event.data.redo);
		initializeQuesionnaire(redo);
	}	
	
	updateProgress();
	displayQuestion();
	$("#quiz").show();
	$("#nextQuestion").on("click", nextQuestion);
	
	startTime = new Date();
}

function initializeQuesionnaire(redo) {	
	quiz.currentQuestion = 0;
	quiz.correctAnswers = 0;
	quiz.wrongAnswers = 0;
	quiz.selectedQuestions = new Array();	
	quiz.questionCount = redo ? quiz.wrongQuestions.length : Number($("#questionCount").val());
	
	let tempQuestions = redo ? quiz.wrongQuestions : filteredQuestionnaire;	
	
	if (options.get("shuffleQuestions")) {	
		for (let i = 0; i < quiz.questionCount; i++) {
			// Generate next question index, then add it to list of selected questions and remove it from the available questions
			let next = Math.floor(Math.random() * tempQuestions.length);
			quiz.selectedQuestions.push(tempQuestions[next]);
			tempQuestions.splice(next, 1);
		}	
	} else {
		for (let i = 0; i < quiz.questionCount; i++) {
			quiz.selectedQuestions.push(tempQuestions[i]);
		}
	}
	
	quiz.wrongQuestions = new Array();
}

function onStoreSession(event) {
	let messageOrigin = "";
	if (event.data.save) {
		messageOrigin = "#saveSession";
		saveSession();
	}
	if (event.data.clear) {
		messageOrigin = "#clearSession";
		clearSession();
	}
	let message = $(messageOrigin).attr("message-success");
	$("#storeModal div.modal-body").text(message);
	updateOffcanvasButtonVisibility();
}

function saveSession() {
	localStorage.setItem(storageName, JSON.stringify(quiz));
}

function clearSession() {
	localStorage.removeItem(storageName);
}

function hasSavedSession() {
	return localStorage.getItem(storageName) != null;
}

function restoreQuiz() {
	$("#modalButtonOK").one("click", { continueQuiz: true }, start);
	$("#modalButtonRestart").one("click", { clearStorage: true }, initialize);	
	const restoreModal = new bootstrap.Modal("#restoreModal");
	restoreModal.show();
}

function updateProgress() {
	let percentage = Math.round(100 * quiz.currentQuestion / quiz.questionCount);
	$("#quiz div.progress")
		.attr("aria-valuenow", percentage)
		.children("div.progress-bar")
			.width(percentage + "%")
			.text(quiz.currentQuestion + " / " + quiz.questionCount + " (" + percentage + " %)");
}

function createImage(filePath) {
	let altText = "Explanatory image";
	let fileName = filePath.match(/[ \w-]+?(?=\.)/);
	if (fileName != null) {
		altText = altText + " [" + fileName + "]";
	}
	return $("<img>", { "class" : "img-fluid", "alt" : altText, "src" : filePath });
}

function displayQuestion() {
	let current = quiz.selectedQuestions[quiz.currentQuestion];
	
	if (current.category != null) {
		$("#questionId").text(current.category);
	}
	
	$("#question").html(current.question);
	if (current.qid != null) {
		$("#question").html("<b>" + current.qid + "</b> &nbsp; " + current.question);
	}
	
	let qImage = $("#image");
	if (qImage.is(":visible") || current.image != null) {
		qImage.fadeOut(function() {
			// Destroy & re-create entire image, otherwise browser will still show the old image until the new one is loaded.
			qImage.empty();
			if (current.image != null) {
				qImage.append(createImage(current.image));
				qImage.show();
			}
		});
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
		quiz.correctAnswers = quiz.correctAnswers + 1;
	}
	else {
		quiz.wrongQuestions.push(quiz.selectedQuestions[quiz.currentQuestion]);
		quiz.wrongAnswers = quiz.wrongAnswers + 1;
		qThis.removeClass("btn-outline-primary").addClass("btn-danger");
	}
	
	if (correct || (!correct && options.get("markCorrectAnswer"))) {
		// Show correct answer
		$("#answers > button[data-correct]").removeClass("btn-outline-primary").addClass("btn-success");
	}
	
	// Prevent any further clicks
	$("#answers > button").off("click");
}

function nextQuestion() {
	// Add unanswered question to list of wrong questions to repeat them later
	if (!questionAnswered) {
		quiz.wrongQuestions.push(quiz.selectedQuestions[quiz.currentQuestion]);
	}
	quiz.currentQuestion = quiz.currentQuestion + 1;
	updateProgress();
	if (quiz.currentQuestion === quiz.questionCount) {
		showResult();
	}
	else {
		displayQuestion();
	}
}

// Get a time format with trailing zeroes
Date.prototype.toDurationTimeString = function() {	
	let h = Math.floor(this.getTime() / (60 * 60 * 1000));	
	let hours = (h < 10) ? ("0" + h) : h;
	
	let minutes = (this.getMinutes() < 10) ? ("0" + this.getMinutes()) : this.getMinutes();
	let seconds = (this.getSeconds() < 10) ? ("0" + this.getSeconds()) : this.getSeconds();	
	
	return hours + ":" + minutes + ":" + seconds;
}

function showResult() {
	let end = new Date();
	
	$("#nextQuestion").off("click");
	$("#image").hide();
	$("#quiz").hide();
	
	let correctPercentage = Math.round(100 * quiz.correctAnswers / quiz.questionCount);
	
	$("#result").text(quiz.correctAnswers + " von " + quiz.questionCount + " richtig (" + correctPercentage + " %)");
	
	$("#quizResults div.progress").has("div.bg-success")
		.attr("aria-valuenow", correctPercentage)
		.width(correctPercentage + "%")
		.children("div.progress-bar")
			.text(quiz.correctAnswers + " (" + correctPercentage + " %)");
	
	let wrongPercentage = Math.round(100 * quiz.wrongAnswers / quiz.questionCount);
	
	$("#quizResults div.progress").has("div.bg-danger")
		.attr("aria-valuenow", wrongPercentage)
		.width(wrongPercentage + "%")
		.children("div.progress-bar")
			.text(quiz.wrongAnswers + " (" + wrongPercentage + " %)");
	
	let skippedPercentage = 100 - correctPercentage - wrongPercentage;
	let skippedAnswers = quiz.questionCount - quiz.correctAnswers - quiz.wrongAnswers;
	
	$("#quizResults div.progress").has("div.bg-secondary")
		.attr("aria-valuenow", skippedPercentage)
		.width(skippedPercentage + "%")
		.children("div.progress-bar")
			.text(skippedAnswers + " (" + skippedPercentage + " %)");
	
	let dT = new Date(end - startTime);
	$("#duration").text(dT.toDurationTimeString());
	
	if (quiz.wrongQuestions.length > 0) {
		$("#redoWrong").show();
	}	
	$("#restart").show();
	
	$("#quizResults").show();
}

function categoryToTableId(category) {
	return "table" + category.replaceAll(' ','');
}

function createTable(category) {
	return $("<table>", { "class" : "table table-sm", "id" : categoryToTableId(category) })
		.append($("<tbody>")
			.append($("<tr>")
				.append($("<th>", { "colspan" : "2" })
					.append($("<h4>").text(category)))
		));
}

function appendListItem(question) {
	// Decide where to append new question
	let qParent = $("#" + categoryToTableId(question.category));	
	let qQuestion = $("<td>").html(question.question);
	
	// Image is optional
	if (question.image != null && options.get("showImagesInList")) {
		qQuestion.append($("<br/>"));
		qQuestion.append(createImage(question.image));
	}
	
	qParent.append($("<tr>", { "class" : "table-active table-group-divider" })
		.append($("<td>")
			.append($("<b>").text(question.qid)))
		.append(qQuestion)
	);
	
	for (let i = 0; i < question.answers.length; i++) {
		qParent.append($("<tr>")
			// Correct answer is marked with a large tickmark
			.append($("<td>").html(((i + 1) == question.correct) ? "&#10004;" : ""))
			.append($("<td>").html(question.answers[i]))
		);
	}
}

function showList() {
	$("#quizStart").hide();
	$("#list table").remove();
	
	$("#filter input:checkbox:checked[data-type='category']").each(function() {
		let category = $(this).val();
		$("#list").append(createTable(category));
	});
	
	filteredQuestionnaire.forEach(question => appendListItem(question));
	
	$("#list").show();
}

function closeList() {
	$("#list").hide();
	$("#quizStart").show();
}

function getStoredTheme() {
	let stored = localStorage.getItem("theme");
	return (stored == null) ? "auto" : stored;
}

function saveTheme(theme) {
	localStorage.setItem("theme", theme);
}

function setTheme(theme) {
	document.documentElement.setAttribute("data-bs-theme", theme === "auto"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
		: theme
	);
}

function activateTheme(theme) {
	setTheme(theme);
	$("#changeTheme div").hide();
	$("#changeTheme div[data-theme='" + theme + "']").show();
}

function onChangeTheme() {
	let current = $("#changeTheme div:visible").attr("data-theme");
	let newTheme = (current === "dark") ? "light" : ((current === "auto") ? "dark" : "auto");
	activateTheme(newTheme);
	saveTheme(newTheme);
}
