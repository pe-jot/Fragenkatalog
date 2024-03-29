let filteredQuestionnaire;
let selectedQuestions;
let wrongQuestions;
let questionCount;
let currentQuestion;
let correctAnswers;
let wrongAnswers;
let questionAnswered;
let startTime;

$(document).ready(function() {
	$("#caption").text(title);
	$("#start").on("click", start);
	$("#restart").on("click", initialize);
	$("#restartWrong").on("click", { restart: true }, start);
	$("#abort").on("click", showResult);
	$("#filterToggle"). on("click", toggleFilters);
	$("#showList").on("click", showList);
	$("#closeList").on("click", closeList);
	
	loadFilters();
	initialize();
	
	// Default color scheme: auto
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
		setTheme("auto");
	});	
	activateTheme(getStoredTheme());
	$("#changeTheme").on("click", toggleTheme);
});

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
	$("#filter > div > div").append(
		$("<div>", { "class" : "form-check" })
			.append(
				$("<input>", { 
					"class" : "form-check-input form-check-input-lg",
					"type" : "checkbox",
					"data-type" : type,
					"value" : value,
					"checked" : true
				})
				.on("change", applyFilter)
			)
			.append(
				$("<label>", { "class" : "form-check-label" })
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

function initialize() {
	$("#quiz").hide();
	$("#quizResults").hide();
	$("#restart").hide();	
	
	applyFilter();
	
	$("#quizStart").show();
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
	
	startTime = new Date();
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
	
	let qImage = $("#image");
	if (qImage.is(":visible") || current.image != null) {
		qImage.fadeOut(function() {
			// Destroy & re-create entire image, otherwise browser will still show the old image until the new one is loaded.
			qImage.empty();
			if (current.image != null) {
				qImage.append($("<img>", { "class" : "img-fluid", "alt" : "Explanatory image", "src" : current.image }));
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
		showResult();
	}
	else {
		displayQuestion();
	}
}

function showResult() {
	let end = new Date();
	
	$("#nextQuestion").off("click");
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
	
	let dT = new Date(end - startTime + end.getTimezoneOffset() * 60 * 1000);
	$("#duration").text(dT.toLocaleTimeString());
	
	if (wrongQuestions.length > 0) {
		$("#restartWrong").show();
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
	
	qParent.append($("<tr>", { "class" : "table-active table-group-divider" })
		.append($("<td>")
			.append($("<b>").text(question.qid)))
		.append($("<td>").html(question.question))
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

function toggleTheme() {
	let current = $("#changeTheme div:visible").attr("data-theme");
	let newTheme = (current === "dark") ? "light" : ((current === "auto") ? "dark" : "auto");
	activateTheme(newTheme);
	saveTheme(newTheme);
}
