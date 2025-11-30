$(document).ready( function () {
    getUserIdent();
});

function getUserIdent() {
    let url = "/surveyKPI/user/ident";
    url += addCacheBuster(url);
    $.ajax({
        cache: false,
        url: url,
        success: function (data, status) {
           $('#ident').text(data);
        }
    });
}