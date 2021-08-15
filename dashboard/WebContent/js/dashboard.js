
$(document).ready(function(){

	$(document).ajaxStart(function ()
	{
		$('body').addClass('wait');

	}).ajaxStop(function () {

		$('body').removeClass('wait');

	});

	getUrl();
});


function getUrl() {
	$.ajax({
		url: "/surveyKPI/quicksight/dashboard",
		dataType: 'text',
		cache: false,
		success: function (url) {
			showDashboard(url);
		},
		error: function (xhr, textStatus, err) {
			if (xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert("Error: Failed to get dashboard link: " + err);
			}
		}
	});
}

function showDashboard(url) {
	var containerDiv = document.getElementById("dashboardContainer");
	var options = {
		url: url,
		container: containerDiv
	};
	let dashboard = QuickSightEmbedding.embedDashboard(options);
	dashboard.on('error', onError);
	dashboard.on('load', onDashboardLoad);
}

function onDashboardLoad() {

}

function onError(msg) {
	alert("Error: " + msg);
}
